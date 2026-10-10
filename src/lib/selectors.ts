import { addDays, diffDays, weekStartOf } from "./dates";
import type { Chapter, Revision, Settings, Task, TestRecord } from "./types";
import { pct, sum } from "./utils";

export const CHECKS: (keyof Pick<Chapter, "theory" | "notes" | "cq" | "mcq" | "rev1" | "rev2">)[] = [
  "theory",
  "notes",
  "cq",
  "mcq",
  "rev1",
  "rev2",
];

/** Share of the six checkpoints ticked for one chapter (0-100). */
export function checkpointPct(ch: Chapter): number {
  return pct(CHECKS.filter((k) => ch[k]).length, CHECKS.length);
}

export function chapterStats(chapters: Chapter[]) {
  const total = chapters.length;
  const completed = chapters.filter((c) => c.status === "Completed").length;
  const inProgress = chapters.filter((c) => c.status === "In Progress").length;
  const needsRevision = chapters.filter((c) => c.status === "Needs Revision").length;
  const pending = chapters.filter((c) => c.status === "Not Started").length;
  const checkpoints = sum(chapters.map((c) => CHECKS.filter((k) => c[k]).length));
  return {
    total,
    completed,
    inProgress,
    needsRevision,
    pending,
    completedPct: pct(completed, total),
    checkpointPct: pct(checkpoints, total * CHECKS.length),
  };
}

export function isOpen(t: Task): boolean {
  return t.status === "Not Started" || t.status === "In Progress";
}

export function isOverdue(t: Task, today: string): boolean {
  return t.date < today && isOpen(t);
}

export function loggedMinutes(tasks: Task[], date: string): number {
  return sum(
    tasks
      .filter((t) => (t.completedOn === date && t.status === "Completed") || (t.status === "In Progress" && t.date === date))
      .map((t) => t.actualMin),
  );
}

export function studyStreak(tasks: Task[], today: string): { current: number; best: number } {
  const days = new Set(tasks.filter((t) => t.status === "Completed" && t.completedOn).map((t) => t.completedOn));
  let current = 0;
  let cursor = days.has(today) ? today : addDays(today, -1);
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  const sorted = Array.from(days).sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const d of sorted) {
    run = prev && diffDays(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best };
}

export function chapterActualHours(tasks: Task[], chapterId: string): number {
  const min = sum(tasks.filter((t) => t.chapterId === chapterId && t.actualMin > 0).map((t) => t.actualMin));
  return Math.round(min / 6) / 10;
}

export function testAccuracy(t: TestRecord): number | null {
  if (t.marksObtained === null || !t.totalMarks) return null;
  return Math.round((t.marksObtained / t.totalMarks) * 1000) / 10;
}

export type RevisionStage = 1 | 2 | 3;

export function nextRevisionStage(r: Revision): { stage: RevisionStage; date: string } | null {
  if (!r.r1Done) return { stage: 1, date: r.r1Date };
  if (!r.r2Done) return { stage: 2, date: r.r2Date };
  if (!r.r3Done) return { stage: 3, date: r.r3Date };
  return null;
}

export function weekRange(today: string, settings: Settings): { start: string; end: string } {
  const start = weekStartOf(today, settings.weekStartsOn);
  return { start, end: addDays(start, 6) };
}

export interface WeakEntry {
  chapter: Chapter;
  reasons: string[];
}

export function weakChapters(chapters: Chapter[], tests: TestRecord[]): WeakEntry[] {
  const out: WeakEntry[] = [];
  for (const c of chapters) {
    const reasons: string[] = [];
    if (c.confidence > 0 && c.confidence <= 2) reasons.push(`confidence ${c.confidence}/5`);
    if (c.status === "Needs Revision") reasons.push("needs revision");
    if (c.weakAreas.trim()) reasons.push("weak areas noted");
    const scored = tests.filter((t) => t.chapterId === c.id && testAccuracy(t) !== null);
    if (scored.length) {
      const avg = sum(scored.map((t) => testAccuracy(t) ?? 0)) / scored.length;
      if (avg < 60) reasons.push(`test average ${Math.round(avg)}%`);
    }
    if (reasons.length) out.push({ chapter: c, reasons });
  }
  return out.sort((a, b) => b.reasons.length - a.reasons.length);
}

/** Chapters the plan says should be finished by `today`, versus chapters actually completed. */
export function paceCheck(chapters: Chapter[], today: string) {
  const due = chapters.filter((c) => c.plannedFinish && c.plannedFinish <= today);
  const dueDone = due.filter((c) => c.status === "Completed").length;
  return { dueByNow: due.length, dueDone, behindBy: due.length - dueDone };
}

export interface WeekStats {
  tasksPlanned: number;
  tasksCompleted: number;
  tasksSkipped: number;
  tasksMissed: number;
  plannedMin: number;
  actualMin: number;
  questions: number;
  mistakes: number;
  chaptersPlanned: Chapter[];
  chaptersCompleted: Chapter[];
  testsDone: TestRecord[];
  bySubject: { subject: string; plannedMin: number; doneMin: number; ratio: number }[];
  best: string | null;
  weakest: string | null;
}

export function weekStats(
  weekStart: string,
  tasks: Task[],
  chapters: Chapter[],
  tests: TestRecord[],
  today: string,
  paperSubject: (paperId: string) => string,
): WeekStats {
  const end = addDays(weekStart, 6);
  const inWeek = tasks.filter((t) => t.date >= weekStart && t.date <= end);
  const completed = inWeek.filter((t) => t.status === "Completed");
  const skipped = inWeek.filter((t) => t.status === "Skipped");
  const missed = inWeek.filter((t) => t.status === "Skipped" || (t.date < today && isOpen(t)));
  const subjMap = new Map<string, { planned: number; done: number }>();
  for (const t of inWeek) {
    if (!t.paperId) continue;
    const key = paperSubject(t.paperId);
    const cur = subjMap.get(key) ?? { planned: 0, done: 0 };
    cur.planned += t.plannedMin;
    if (t.status === "Completed") cur.done += t.plannedMin;
    subjMap.set(key, cur);
  }
  const bySubject = Array.from(subjMap.entries())
    .map(([subject, v]) => ({ subject, plannedMin: v.planned, doneMin: v.done, ratio: v.planned ? v.done / v.planned : 0 }))
    .sort((a, b) => b.ratio - a.ratio);
  const started = bySubject.filter((s) => s.plannedMin > 0);
  return {
    tasksPlanned: inWeek.length,
    tasksCompleted: completed.length,
    tasksSkipped: skipped.length,
    tasksMissed: missed.length,
    plannedMin: sum(inWeek.map((t) => t.plannedMin)),
    actualMin: sum(completed.map((t) => t.actualMin)),
    questions: sum(inWeek.map((t) => t.questionsSolved)),
    mistakes: sum(inWeek.map((t) => t.mistakes)),
    chaptersPlanned: chapters.filter((c) => c.plannedFinish >= weekStart && c.plannedFinish <= end),
    chaptersCompleted: chapters.filter((c) => c.status === "Completed" && c.actualCompletion >= weekStart && c.actualCompletion <= end),
    testsDone: tests.filter((t) => t.date >= weekStart && t.date <= end && t.marksObtained !== null),
    bySubject,
    best: started.length && started[0].ratio > 0 ? started[0].subject : null,
    weakest: started.length > 1 ? started[started.length - 1].subject : null,
  };
}

export interface RevisionRow {
  revision: Revision;
  chapter: Chapter;
  stage: RevisionStage;
  date: string;
  daysLate: number;
}

export function revisionQueue(revisions: Record<string, Revision>, chapters: Chapter[], today: string) {
  const byId = new Map(chapters.map((c) => [c.id, c]));
  const rows: RevisionRow[] = [];
  for (const r of Object.values(revisions)) {
    const chapter = byId.get(r.chapterId);
    if (!chapter) continue;
    const next = nextRevisionStage(r);
    if (!next) continue;
    rows.push({ revision: r, chapter, stage: next.stage, date: next.date, daysLate: diffDays(next.date, today) });
  }
  const byDate = (a: RevisionRow, b: RevisionRow) => a.date.localeCompare(b.date);
  return {
    due: rows.filter((r) => r.date <= today).sort(byDate),
    upcoming: rows.filter((r) => r.date > today).sort(byDate),
    finished: Object.values(revisions).filter((r) => !nextRevisionStage(r)).length,
  };
}
