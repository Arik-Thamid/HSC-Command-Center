import { addDays, listDays, weekday } from "./dates";
import { PAPER_BY_ID, PAPERS, TRACKS, TRACK_ORDER } from "./seed";
import type {
  Chapter,
  ChecklistItem,
  PlanReport,
  Settings,
  Task,
  TaskType,
  TestRecord,
  TrackId,
  TrackReport,
} from "./types";
import { sum, uid } from "./utils";

export const DEFAULT_SETTINGS: Settings = {
  startDate: "2026-10-10",
  endDate: "2026-12-31",
  dailyHours: 9,
  auditDays: 12,
  restWeekday: 5,
  weekStartsOn: 6,
};

export const RECALL_MIN = 30;

const r5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

export function defaultChecklist(type: TaskType): ChecklistItem[] {
  const items: Record<TaskType, string[]> = {
    Learn: ["Read the textbook section", "Write or refine personal notes", "Mark formulas, terms or diagrams"],
    Practice: ["Solve CQs", "Solve MCQs", "Log mistakes in the error notebook"],
    Revise: ["Recall without looking at notes", "Fix errors from last time"],
    Test: ["Attempt under timed conditions", "Mark honestly and log mistakes", "Plan the follow-up task"],
    Practical: ["Do the hands-on practical work", "Write up practical notes"],
  };
  return items[type].map((label, i) => ({ id: `c${i}`, label, done: false }));
}

interface Phase {
  type: TaskType;
  share: number;
}

function phasesFor(track: TrackId): Phase[] {
  switch (track) {
    case "physics":
    case "math":
      return [
        { type: "Learn", share: 0.4 },
        { type: "Practice", share: 0.6 },
      ];
    case "ict":
      return [
        { type: "Learn", share: 0.5 },
        { type: "Practical", share: 0.3 },
        { type: "Practice", share: 0.2 },
      ];
    case "chemistry":
    case "language":
      return [
        { type: "Learn", share: 0.5 },
        { type: "Practice", share: 0.5 },
      ];
    default:
      return [
        { type: "Learn", share: 0.55 },
        { type: "Practice", share: 0.45 },
      ];
  }
}

function interleave(chapters: Chapter[], paperIds: string[]): Chapter[] {
  const lists = paperIds.map((id) => chapters.filter((c) => c.paperId === id).sort((a, b) => a.number - b.number));
  const out: Chapter[] = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}

const AUDIT_ORDER = ["phy1", "phy2", "chem1", "chem2", "bio1", "bio2", "hm1", "hm2", "ict", "bn1", "bn2", "en1", "en2"];
const WEEKLY_TEST_ORDER = ["phy1", "hm1", "chem1", "bio1", "phy2", "hm2", "chem2", "bio2", "ict", "bn1", "en1", "bn2", "en2"];

function makeTask(p: Partial<Task> & Pick<Task, "date" | "type" | "plannedMin" | "topic">): Task {
  return {
    id: uid("t"),
    paperId: null,
    chapterId: null,
    kind: "chapter",
    actualMin: 0,
    status: "Not Started",
    difficulty: "Medium",
    questionsSolved: 0,
    mistakes: 0,
    notes: "",
    checklist: defaultChecklist(p.type),
    completedOn: "",
    generated: true,
    ...p,
  };
}

export interface GenerateInput {
  chapters: Chapter[];
  /** tasks that are kept (completed / skipped / in progress / manual); used to subtract time already spent */
  keptTasks: Task[];
  settings: Settings;
  fromDate: string;
  today: string;
}

export interface GenerateOutput {
  tasks: Task[];
  tests: TestRecord[];
  chapterDates: Record<string, { plannedStart: string; plannedFinish: string }>;
  report: PlanReport;
}

export function generatePlan(input: GenerateInput): GenerateOutput {
  const { chapters, keptTasks, settings, fromDate, today } = input;
  const from = fromDate < settings.startDate ? settings.startDate : fromDate;
  const tasks: Task[] = [];
  const tests: TestRecord[] = [];
  const chapterDates: GenerateOutput["chapterDates"] = {};

  const emptyReport: PlanReport = {
    generatedOn: today,
    fromDate: from,
    studyDays: 0,
    reviewDays: 0,
    auditDays: 0,
    tracks: [],
    requiredHours: 0,
    availableHours: 0,
    verdict: "ok",
  };
  if (from > settings.endDate) return { tasks, tests, chapterDates, report: emptyReport };

  const dailyMin = Math.round(settings.dailyHours * 60);
  const allDays = listDays(from, settings.endDate);
  const auditCount = Math.min(settings.auditDays, allDays.length);
  const auditStart = addDays(settings.endDate, -(auditCount - 1));
  const auditDayList = allDays.filter((d) => d >= auditStart);
  const preAudit = allDays.filter((d) => d < auditStart);
  const reviewDays = preAudit.filter((d) => weekday(d) === settings.restWeekday);
  let studyDays = preAudit.filter((d) => weekday(d) !== settings.restWeekday);
  // Edge case: the audit window already covers everything that is left.
  if (studyDays.length === 0) studyDays = allDays.filter((d) => weekday(d) !== settings.restWeekday);

  const trackReports: TrackReport[] = [];

  for (const track of TRACK_ORDER) {
    const def = TRACKS[track];
    const queue = interleave(
      chapters.filter((c) => c.status !== "Completed"),
      def.papers,
    );
    if (queue.length === 0) {
      trackReports.push({
        track,
        label: def.label,
        chapters: 0,
        requiredHours: 0,
        availableHours: 0,
        scale: 1,
        overflowChapters: [],
      });
      continue;
    }
    const budget = r5((dailyMin - RECALL_MIN) * def.weight);
    const capacity = studyDays.length * budget;

    const remaining = queue.map((c) => {
      const spent = sum(keptTasks.filter((t) => t.chapterId === c.id && t.kind === "chapter").map((t) => t.actualMin));
      const base = c.estHours * 60;
      return spent > 0 ? Math.max(base - spent, 45) : base;
    });
    const need = sum(remaining);

    let scale = need > 0 ? Math.min(1, capacity / need) : 1;
    const minutesFor = (s: number) => remaining.map((m) => Math.max(30, r5(m * s)));
    let mins = minutesFor(scale);
    let guard = 0;
    while (sum(mins) > capacity && scale > 0.2 && guard < 80) {
      scale -= 0.01;
      mins = minutesFor(scale);
      guard += 1;
    }

    const phases = phasesFor(track);
    let dayIdx = 0;
    let left = budget;
    const overflow: string[] = [];

    queue.forEach((ch, i) => {
      const total = mins[i];
      const phaseMins = phases.map((ph) => Math.max(15, r5(total * ph.share)));
      let first = "";
      let last = "";
      let spilled = false;
      phases.forEach((ph, pi) => {
        let rem = phaseMins[pi];
        while (rem > 0) {
          if (dayIdx >= studyDays.length) {
            spilled = true;
            break;
          }
          const take = Math.min(rem, left);
          const date = studyDays[dayIdx];
          tasks.push(
            makeTask({
              date,
              paperId: ch.paperId,
              chapterId: ch.id,
              kind: "chapter",
              type: ph.type,
              plannedMin: take,
              topic: ch.title,
              difficulty: ch.difficulty,
            }),
          );
          if (!first) first = date;
          last = date;
          rem -= take;
          left -= take;
          if (left <= 0) {
            dayIdx += 1;
            left = budget;
          }
        }
      });
      if (spilled) overflow.push(ch.id);
      if (first) chapterDates[ch.id] = { plannedStart: first, plannedFinish: last };
    });

    trackReports.push({
      track,
      label: def.label,
      chapters: queue.length,
      requiredHours: Math.round(need / 6) / 10,
      availableHours: Math.round(capacity / 6) / 10,
      scale: Math.round(scale * 100) / 100,
      overflowChapters: overflow,
    });
  }

  // Daily recall block on every day.
  for (const date of allDays) {
    tasks.push(
      makeTask({
        date,
        kind: "recall",
        type: "Revise",
        plannedMin: RECALL_MIN,
        topic: "Daily recall and error correction",
        checklist: [
          { id: "c0", label: "Write what I remember from today without notes", done: false },
          { id: "c1", label: "Correct today's mistakes in the error notebook", done: false },
        ],
      }),
    );
  }

  // Weekly review + catch-up + mixed test on the rest day.
  reviewDays.forEach((date, i) => {
    const paperId = WEEKLY_TEST_ORDER[i % WEEKLY_TEST_ORDER.length];
    const paper = PAPER_BY_ID[paperId];
    tasks.push(
      makeTask({
        date,
        kind: "review",
        type: "Revise",
        plannedMin: 150,
        topic: "Weekly review and catch-up block",
        checklist: [
          { id: "c0", label: "Finish skipped or overdue tasks from this week", done: false },
          { id: "c1", label: "Fill in the weekly review", done: false },
          { id: "c2", label: "Re-plan next week's priorities", done: false },
        ],
      }),
    );
    tasks.push(
      makeTask({
        date,
        paperId,
        kind: "review",
        type: "Test",
        plannedMin: 90,
        topic: `Weekly mixed test: ${paper.short}`,
      }),
    );
    const recent = chapters
      .filter((c) => c.paperId === paperId && (chapterDates[c.id]?.plannedFinish ?? c.plannedFinish) && (chapterDates[c.id]?.plannedFinish ?? c.plannedFinish) <= date)
      .sort((a, b) => b.number - a.number)[0];
    tests.push({
      id: uid("x"),
      date,
      paperId,
      chapterId: recent ? recent.id : null,
      type: i % 2 === 0 ? "Written" : "MCQ",
      totalMarks: 30,
      marksObtained: null,
      timeTakenMin: 0,
      mistakes: "",
      weakTopics: "",
      followUp: "",
      generated: true,
    });
  });

  // Audit window: weak chapters, mixed practice, model tests, 15% buffer.
  const auditBase = dailyMin - RECALL_MIN;
  auditDayList.forEach((date, i) => {
    const n = AUDIT_ORDER.length;
    if (i === 0) {
      tasks.push(
        makeTask({
          date,
          kind: "audit",
          type: "Revise",
          plannedMin: r5(auditBase * 0.15),
          topic: "Syllabus audit: open every chapter, tick its checklist, list what is unfinished",
        }),
      );
    }
    const a = AUDIT_ORDER[(i * 3) % n];
    const b = AUDIT_ORDER[(i * 3 + 1) % n];
    const c = AUDIT_ORDER[(i * 3 + 2) % n];
    tasks.push(
      makeTask({ date, paperId: a, kind: "audit", type: "Revise", plannedMin: r5(auditBase * 0.3), topic: `Weak chapters and error log: ${PAPER_BY_ID[a].short}`, difficulty: "Hard" }),
      makeTask({ date, paperId: b, kind: "audit", type: "Practice", plannedMin: r5(auditBase * 0.3), topic: `Mixed question practice: ${PAPER_BY_ID[b].short}` }),
      makeTask({ date, paperId: c, kind: "audit", type: "Test", plannedMin: r5(auditBase * 0.25), topic: `Model test: ${PAPER_BY_ID[c].short}` }),
    );
    tests.push({
      id: uid("x"),
      date,
      paperId: c,
      chapterId: null,
      type: "Model Test",
      totalMarks: 50,
      marksObtained: null,
      timeTakenMin: 0,
      mistakes: "",
      weakTopics: "",
      followUp: "",
      generated: true,
    });
  });

  const requiredHours = Math.round(sum(trackReports.map((t) => t.requiredHours)) * 10) / 10;
  const availableHours = Math.round(sum(trackReports.map((t) => t.availableHours)) * 10) / 10;
  const ratio = availableHours > 0 ? requiredHours / availableHours : 0;
  const verdict: PlanReport["verdict"] = ratio <= 0.9 ? "ok" : ratio <= 1 ? "tight" : "overloaded";

  return {
    tasks,
    tests,
    chapterDates,
    report: {
      generatedOn: today,
      fromDate: from,
      studyDays: studyDays.length,
      reviewDays: reviewDays.length,
      auditDays: auditDayList.length,
      tracks: trackReports,
      requiredHours,
      availableHours,
      verdict,
    },
  };
}

export interface DayLoad {
  date: string;
  plannedMin: number;
  hardMin: number;
  level: "normal" | "medium" | "high";
  phase: "study" | "review" | "audit";
  reasons: string[];
}

/** Per-day workload and risk, computed from the tasks currently in the planner. */
export function analyzeLoad(tasks: Task[], settings: Settings): DayLoad[] {
  const days = listDays(settings.startDate, settings.endDate);
  const auditStart = addDays(settings.endDate, -(Math.min(settings.auditDays, days.length) - 1));
  const dailyMin = settings.dailyHours * 60;
  return days.map((date) => {
    const dayTasks = tasks.filter((t) => t.date === date && t.status !== "Skipped");
    const plannedMin = sum(dayTasks.map((t) => t.plannedMin));
    const hardTasks = dayTasks.filter((t) => t.kind === "chapter" && t.difficulty === "Hard");
    const hardMin = sum(hardTasks.map((t) => t.plannedMin));
    const hardChapters = new Set(hardTasks.map((t) => t.chapterId)).size;
    const reasons: string[] = [];
    let level: DayLoad["level"] = "normal";
    if (hardMin >= 270 || hardChapters >= 4) {
      level = "high";
      reasons.push(`${hardChapters} hard chapters (${Math.round(hardMin / 60 * 10) / 10}h of hard material)`);
    } else if (hardMin >= 210 || hardChapters >= 3) {
      level = "medium";
      reasons.push(`${hardChapters} hard chapters in one day`);
    }
    if (plannedMin > dailyMin * 1.1) {
      level = "high";
      reasons.push(`${Math.round(plannedMin / 6) / 10}h planned vs ${settings.dailyHours}h target`);
    }
    const phase: DayLoad["phase"] = date >= auditStart ? "audit" : weekday(date) === settings.restWeekday ? "review" : "study";
    return { date, plannedMin, hardMin, level, phase, reasons };
  });
}

export { PAPERS };
