"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { addDays, todayStr } from "./dates";
import { DEFAULT_PREP, PAPER_BY_ID, seedChapters } from "./seed";
import { DEFAULT_SETTINGS, defaultChecklist, generatePlan } from "./scheduler";
import type {
  Chapter,
  ChapterStatus,
  DailyPage,
  PlanReport,
  PrepItem,
  Revision,
  Settings,
  Task,
  TestRecord,
  WeeklyReview,
} from "./types";
import { uid } from "./utils";

export const STORAGE_KEY = "hsc27-command-center";
export const SCHEMA_VERSION = 1;

export function canComplete(ch: Chapter): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!ch.theory) missing.push("textbook theory");
  if (!ch.notes) missing.push("personal notes");
  if (!ch.cq) missing.push("CQ practice");
  if (!ch.mcq) missing.push("MCQ practice");
  return { ok: missing.length === 0, missing };
}

function buildRevision(ch: Chapter, firstStudyDate: string): Revision {
  const early = ch.difficulty === "Hard" || (ch.confidence > 0 && ch.confidence <= 2);
  return {
    chapterId: ch.id,
    firstStudyDate,
    r1Date: addDays(firstStudyDate, early ? 1 : 2),
    r2Date: addDays(firstStudyDate, 7),
    r3Date: addDays(firstStudyDate, 21),
    r1Done: "",
    r2Done: "",
    r3Done: "",
    previousMistakes: "",
    nextAction: "",
  };
}

interface Data {
  chapters: Chapter[];
  tasks: Task[];
  revisions: Record<string, Revision>;
  tests: TestRecord[];
  weekly: Record<string, WeeklyReview>;
  daily: Record<string, DailyPage>;
  prep: PrepItem[];
  settings: Settings;
  planReport: PlanReport | null;
  lastExport: string;
}

interface Actions {
  updateChapter: (id: string, patch: Partial<Chapter>) => void;
  setChapterStatus: (id: string, status: ChapterStatus) => { ok: boolean; reason?: string };
  addChapter: (paperId: string, title: string, extra?: Partial<Chapter>) => string;
  addChaptersBulk: (paperId: string, titles: string[]) => number;
  deleteChapter: (id: string) => void;

  addTask: (t: Partial<Task> & Pick<Task, "date" | "type">) => string;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string, actualMin?: number) => void;
  startTask: (id: string) => void;
  reopenTask: (id: string) => void;
  skipTask: (id: string) => void;
  toggleChecklist: (taskId: string, itemId: string) => void;
  moveTasks: (ids: string[], date: string) => void;

  updateRevision: (chapterId: string, patch: Partial<Revision>) => void;
  markRevisionDone: (chapterId: string, stage: 1 | 2 | 3, confidence?: number) => void;
  undoRevision: (chapterId: string, stage: 1 | 2 | 3) => void;
  ensureRevision: (chapterId: string) => void;

  addTest: (t: Partial<TestRecord> & Pick<TestRecord, "date" | "paperId" | "type">) => string;
  updateTest: (id: string, patch: Partial<TestRecord>) => void;
  deleteTest: (id: string) => void;
  createFollowUp: (testId: string) => void;

  saveWeekly: (weekStart: string, patch: Partial<WeeklyReview>) => void;
  saveDaily: (date: string, patch: Partial<DailyPage>) => void;
  setSessionNote: (date: string, key: string, text: string) => void;

  togglePrep: (id: string) => void;
  addPrep: (label: string) => void;
  removePrep: (id: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  regeneratePlan: (from: "today" | "start") => void;

  exportData: () => string;
  importData: (json: string) => { ok: boolean; error?: string };
  resetAll: () => void;
}

export type Store = Data & Actions;

function emptyDaily(date: string): DailyPage {
  return {
    date,
    mainGoal: "",
    secondGoal: "",
    practiceTarget: "",
    sessionNotes: {},
    finished: "",
    recall: "",
    questions: "",
    mistakes: "",
    unfinished: "",
    tomorrow: "",
  };
}

function emptyWeekly(weekStart: string): WeeklyReview {
  return { weekStart, repeatedMistakes: "", reasonsBehind: "", nextPriorities: "", recoveryPlan: "", honestNote: "" };
}

function initialData(): Data {
  const chapters = seedChapters();
  const settings = { ...DEFAULT_SETTINGS };
  const out = generatePlan({ chapters, keptTasks: [], settings, fromDate: settings.startDate, today: settings.startDate });
  const withDates = chapters.map((c) => ({ ...c, ...(out.chapterDates[c.id] ?? {}) }));
  return {
    chapters: withDates,
    tasks: out.tasks,
    revisions: {},
    tests: out.tests,
    weekly: {},
    daily: {},
    prep: DEFAULT_PREP.map((p) => ({ ...p })),
    settings,
    planReport: out.report,
    lastExport: "",
  };
}

const DATA_KEYS: (keyof Data)[] = ["chapters", "tasks", "revisions", "tests", "weekly", "daily", "prep", "settings", "planReport", "lastExport"];

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initialData(),

      // ───────────── chapters
      updateChapter: (id, patch) =>
        set((s) => ({
          chapters: s.chapters.map((c) => {
            if (c.id !== id) return c;
            const { status: _s, actualCompletion: _a, ...safe } = patch;
            void _s;
            void _a;
            let next: Chapter = { ...c, ...safe };
            // A completed chapter that loses a required check is no longer complete.
            if (next.status === "Completed" && !canComplete(next).ok) {
              next = { ...next, status: "In Progress", actualCompletion: "" };
            }
            return next;
          }),
        })),

      setChapterStatus: (id, status) => {
        const ch = get().chapters.find((c) => c.id === id);
        if (!ch) return { ok: false, reason: "Chapter not found" };
        if (status === "Completed") {
          const check = canComplete(ch);
          if (!check.ok) {
            return { ok: false, reason: `Tick these first: ${check.missing.join(", ")}.` };
          }
        }
        const today = todayStr();
        set((s) => ({
          chapters: s.chapters.map((c) =>
            c.id === id
              ? {
                  ...c,
                  status,
                  actualCompletion: status === "Completed" ? c.actualCompletion || today : "",
                }
              : c,
          ),
        }));
        if (status === "Completed") get().ensureRevision(id);
        return { ok: true };
      },

      addChapter: (paperId, title, extra) => {
        const id = uid("ch");
        set((s) => {
          const inPaper = s.chapters.filter((c) => c.paperId === paperId);
          const number = inPaper.length ? Math.max(...inPaper.map((c) => c.number)) + 1 : 1;
          const ch: Chapter = {
            id,
            paperId,
            number,
            title,
            titleVerified: false,
            placeholder: false,
            priority: "Medium",
            difficulty: "Medium",
            status: "Not Started",
            plannedStart: "",
            plannedFinish: "",
            actualCompletion: "",
            estHours: 6,
            theory: false,
            notes: false,
            cq: false,
            mcq: false,
            rev1: false,
            rev2: false,
            confidence: 0,
            weakAreas: "",
            ...extra,
          };
          return { chapters: [...s.chapters, ch] };
        });
        return id;
      },

      addChaptersBulk: (paperId, titles) => {
        const clean = titles.map((t) => t.trim()).filter(Boolean);
        clean.forEach((t) => get().addChapter(paperId, t, { titleVerified: true }));
        return clean.length;
      },

      deleteChapter: (id) =>
        set((s) => {
          const revisions = { ...s.revisions };
          delete revisions[id];
          return {
            chapters: s.chapters.filter((c) => c.id !== id),
            revisions,
            tasks: s.tasks.map((t) => (t.chapterId === id ? { ...t, chapterId: null } : t)),
            tests: s.tests.map((t) => (t.chapterId === id ? { ...t, chapterId: null } : t)),
          };
        }),

      // ───────────── tasks
      addTask: (t) => {
        const id = uid("t");
        const paper = t.paperId ? PAPER_BY_ID[t.paperId] : undefined;
        const chapter = t.chapterId ? get().chapters.find((c) => c.id === t.chapterId) : undefined;
        const task: Task = {
          id,
          date: t.date,
          paperId: t.paperId ?? chapter?.paperId ?? null,
          chapterId: t.chapterId ?? null,
          topic: t.topic ?? chapter?.title ?? paper?.name ?? "Study task",
          type: t.type,
          kind: "manual",
          plannedMin: t.plannedMin ?? 60,
          actualMin: 0,
          status: "Not Started",
          difficulty: t.difficulty ?? chapter?.difficulty ?? "Medium",
          questionsSolved: 0,
          mistakes: 0,
          notes: t.notes ?? "",
          checklist: t.checklist ?? defaultChecklist(t.type),
          completedOn: "",
          generated: false,
        };
        set((s) => ({ tasks: [...s.tasks, task] }));
        return id;
      },

      updateTask: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

      startTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id && t.status !== "Completed" ? { ...t, status: "In Progress" } : t)),
        })),

      completeTask: (id, actualMin) => {
        const today = todayStr();
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: "Completed",
                  actualMin: actualMin ?? (t.actualMin > 0 ? t.actualMin : t.plannedMin),
                  completedOn: today,
                  checklist: t.checklist.map((c) => ({ ...c, done: true })),
                }
              : t,
          ),
        }));
        // Side effects that never mark a chapter Completed.
        if (task.chapterId) {
          const ch = get().chapters.find((c) => c.id === task.chapterId);
          if (ch && ch.status === "Not Started") {
            set((s) => ({
              chapters: s.chapters.map((c) => (c.id === ch.id ? { ...c, status: "In Progress" } : c)),
            }));
          }
          if (ch && task.type === "Learn") get().ensureRevision(ch.id);
        }
      },

      reopenTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: "Not Started", completedOn: "" } : t)),
        })),

      skipTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, status: "Skipped", completedOn: "" } : t)),
        })),

      toggleChecklist: (taskId, itemId) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? { ...t, checklist: t.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) }
              : t,
          ),
        })),

      moveTasks: (ids, date) =>
        set((s) => ({ tasks: s.tasks.map((t) => (ids.includes(t.id) ? { ...t, date } : t)) })),

      // ───────────── revisions
      ensureRevision: (chapterId) => {
        const s = get();
        if (s.revisions[chapterId]) return;
        const ch = s.chapters.find((c) => c.id === chapterId);
        if (!ch) return;
        set((st) => ({ revisions: { ...st.revisions, [chapterId]: buildRevision(ch, todayStr()) } }));
      },

      updateRevision: (chapterId, patch) =>
        set((s) => {
          const cur = s.revisions[chapterId];
          if (!cur) return {};
          return { revisions: { ...s.revisions, [chapterId]: { ...cur, ...patch } } };
        }),

      markRevisionDone: (chapterId, stage, confidence) => {
        const today = todayStr();
        set((s) => {
          const cur = s.revisions[chapterId];
          if (!cur) return {};
          const key = (`r${stage}Done`) as "r1Done" | "r2Done" | "r3Done";
          return {
            revisions: { ...s.revisions, [chapterId]: { ...cur, [key]: today } },
            chapters: s.chapters.map((c) => {
              if (c.id !== chapterId) return c;
              return {
                ...c,
                rev1: stage === 1 ? true : c.rev1,
                rev2: stage === 2 ? true : c.rev2,
                confidence: confidence && confidence > 0 ? confidence : c.confidence,
              };
            }),
          };
        });
      },

      undoRevision: (chapterId, stage) =>
        set((s) => {
          const cur = s.revisions[chapterId];
          if (!cur) return {};
          const key = (`r${stage}Done`) as "r1Done" | "r2Done" | "r3Done";
          return {
            revisions: { ...s.revisions, [chapterId]: { ...cur, [key]: "" } },
            chapters: s.chapters.map((c) =>
              c.id === chapterId ? { ...c, rev1: stage === 1 ? false : c.rev1, rev2: stage === 2 ? false : c.rev2 } : c,
            ),
          };
        }),

      // ───────────── tests
      addTest: (t) => {
        const id = uid("x");
        const rec: TestRecord = {
          id,
          date: t.date,
          paperId: t.paperId,
          chapterId: t.chapterId ?? null,
          type: t.type,
          totalMarks: t.totalMarks ?? 50,
          marksObtained: t.marksObtained ?? null,
          timeTakenMin: t.timeTakenMin ?? 0,
          mistakes: t.mistakes ?? "",
          weakTopics: t.weakTopics ?? "",
          followUp: t.followUp ?? "",
          generated: false,
        };
        set((s) => ({ tests: [...s.tests, rec] }));
        return id;
      },
      updateTest: (id, patch) => set((s) => ({ tests: s.tests.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      deleteTest: (id) => set((s) => ({ tests: s.tests.filter((t) => t.id !== id) })),
      createFollowUp: (testId) => {
        const t = get().tests.find((x) => x.id === testId);
        if (!t) return;
        const ch = t.chapterId ? get().chapters.find((c) => c.id === t.chapterId) : undefined;
        const base = t.date > todayStr() ? t.date : todayStr();
        const id = get().addTask({
          date: addDays(base, 1),
          paperId: t.paperId,
          chapterId: t.chapterId,
          type: "Practice",
          plannedMin: 60,
          topic: `Follow-up: ${t.followUp || t.weakTopics || ch?.title || PAPER_BY_ID[t.paperId]?.short || "test mistakes"}`,
          difficulty: "Hard",
        });
        get().updateTest(testId, { followUp: t.followUp || "Follow-up task created in planner" });
        return void id;
      },

      // ───────────── weekly / daily / prep
      saveWeekly: (weekStart, patch) =>
        set((s) => ({
          weekly: { ...s.weekly, [weekStart]: { ...(s.weekly[weekStart] ?? emptyWeekly(weekStart)), ...patch } },
        })),

      saveDaily: (date, patch) =>
        set((s) => ({ daily: { ...s.daily, [date]: { ...(s.daily[date] ?? emptyDaily(date)), ...patch } } })),

      setSessionNote: (date, key, text) =>
        set((s) => {
          const cur = s.daily[date] ?? emptyDaily(date);
          return { daily: { ...s.daily, [date]: { ...cur, sessionNotes: { ...cur.sessionNotes, [key]: text } } } };
        }),

      togglePrep: (id) => set((s) => ({ prep: s.prep.map((p) => (p.id === id ? { ...p, done: !p.done } : p)) })),
      addPrep: (label) => set((s) => ({ prep: [...s.prep, { id: uid("prep"), label, done: false }] })),
      removePrep: (id) => set((s) => ({ prep: s.prep.filter((p) => p.id !== id) })),

      // ───────────── settings & plan
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      regeneratePlan: (fromMode) => {
        const s = get();
        const today = todayStr();
        const base = fromMode === "start" ? s.settings.startDate : today < s.settings.startDate ? s.settings.startDate : today;
        const removable = (t: Task) =>
          t.generated && t.status === "Not Started" && t.actualMin === 0 && (t.date >= base || t.kind === "chapter");
        const kept = s.tasks.filter((t) => !removable(t));
        const out = generatePlan({ chapters: s.chapters, keptTasks: kept, settings: s.settings, fromDate: base, today });
        const keptTests = s.tests.filter((t) => !(t.generated && t.marksObtained === null && t.date >= base));
        const chapters = s.chapters.map((c) => {
          const d = out.chapterDates[c.id];
          if (!d) return c;
          const started = c.plannedStart && c.plannedStart < d.plannedStart && fromMode === "today" ? c.plannedStart : d.plannedStart;
          return { ...c, plannedStart: started, plannedFinish: d.plannedFinish };
        });
        set({ tasks: [...kept, ...out.tasks], tests: [...keptTests, ...out.tests], chapters, planReport: out.report });
      },

      // ───────────── data management
      exportData: () => {
        const s = get();
        const data: Partial<Data> = {};
        for (const k of DATA_KEYS) (data as Record<string, unknown>)[k] = s[k];
        const exportedAt = todayStr();
        set({ lastExport: exportedAt });
        return JSON.stringify({ app: "hsc27-command-center", version: SCHEMA_VERSION, exportedAt, data }, null, 2);
      },

      importData: (json) => {
        try {
          const parsed = JSON.parse(json);
          const d = parsed?.data;
          if (parsed?.app !== "hsc27-command-center" || !d) return { ok: false, error: "This file is not a Command Center backup." };
          if (!Array.isArray(d.chapters) || !Array.isArray(d.tasks) || !d.settings) {
            return { ok: false, error: "The backup is missing chapters, tasks or settings." };
          }
          const base = initialData();
          set({
            ...base,
            ...d,
            revisions: d.revisions ?? {},
            weekly: d.weekly ?? {},
            daily: d.daily ?? {},
            tests: d.tests ?? [],
            prep: d.prep ?? base.prep,
          });
          return { ok: true };
        } catch {
          return { ok: false, error: "The file could not be read as JSON." };
        }
      },

      resetAll: () => set({ ...initialData() }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const out: Partial<Data> = {};
        for (const k of DATA_KEYS) (out as Record<string, unknown>)[k] = s[k];
        return out as Store;
      },
    },
  ),
);
