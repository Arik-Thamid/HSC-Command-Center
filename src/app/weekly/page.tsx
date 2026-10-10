"use client";

import { useEffect, useMemo, useState } from "react";
import SavedField from "@/components/SavedField";
import TaskEditor from "@/components/TaskEditor";
import TaskRow from "@/components/TaskRow";
import { Badge, Card, Empty, Field, PageHeader, ProgressBar } from "@/components/ui";
import { addDays, fmtMinutes, fmtShort, weekStartOf } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { PAPER_BY_ID } from "@/lib/seed";
import { weekStats } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { pct } from "@/lib/utils";

export default function WeeklyPage() {
  const today = useToday();
  const settings = useStore((s) => s.settings);
  const tasks = useStore((s) => s.tasks);
  const chapters = useStore((s) => s.chapters);
  const tests = useStore((s) => s.tests);
  const weekly = useStore((s) => s.weekly);
  const saveWeekly = useStore((s) => s.saveWeekly);

  const weeks = useMemo(() => {
    const out: string[] = [];
    let w = weekStartOf(settings.startDate, settings.weekStartsOn);
    while (w <= settings.endDate) {
      out.push(w);
      w = addDays(w, 7);
    }
    return out;
  }, [settings]);

  const current = weekStartOf(today, settings.weekStartsOn);
  const [week, setWeek] = useState(current);
  const [editTask, setEditTask] = useState<string | null>(null);
  useEffect(() => {
    if (weeks.includes(current)) setWeek(current);
    else setWeek(current < weeks[0] ? weeks[0] : weeks[weeks.length - 1]);
  }, [current, weeks]);

  const idx = weeks.indexOf(week);
  const stats = useMemo(() => weekStats(week, tasks, chapters, tests, today, (id) => PAPER_BY_ID[id]?.subject ?? "Other"), [week, tasks, chapters, tests, today]);
  const review = weekly[week];
  const missed = tasks.filter((t) => t.date >= week && t.date <= addDays(week, 6) && (t.status === "Skipped" || (t.date < today && (t.status === "Not Started" || t.status === "In Progress")))).sort((a, b) => a.date.localeCompare(b.date));
  const completionRate = pct(stats.tasksCompleted, stats.tasksPlanned);
  const hoursRate = pct(stats.actualMin, stats.plannedMin);
  const nextWeekStart = addDays(week, 7);

  return (
    <>
      <PageHeader title="Weekly Review" subtitle="Skipped and overdue tasks are counted as missed, never as completed." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className="btn" disabled={idx <= 0} onClick={() => setWeek(weeks[idx - 1])}>
          Previous
        </button>
        <select className="field w-auto" value={week} onChange={(e) => setWeek(e.target.value)} aria-label="Select week">
          {weeks.map((w, i) => (
            <option key={w} value={w}>
              Week {i + 1}: {fmtShort(w)} – {fmtShort(addDays(w, 6))}
              {w === current ? " (this week)" : ""}
            </option>
          ))}
        </select>
        <button className="btn" disabled={idx < 0 || idx >= weeks.length - 1} onClick={() => setWeek(weeks[idx + 1])}>
          Next
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-400">Chapters planned</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.chaptersPlanned.length}</div>
          <div className="text-xs text-ink-400">planned to finish this week</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-400">Chapters completed</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-mint-400">{stats.chaptersCompleted.length}</div>
          <div className="text-xs text-ink-400">marked Completed this week</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-400">Study hours</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {fmtMinutes(stats.actualMin)} <span className="text-sm font-normal text-ink-400">of {fmtMinutes(stats.plannedMin)}</span>
          </div>
          <ProgressBar className="mt-2" value={hoursRate} label="Hours completed" />
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-400">Task completion</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{completionRate}%</div>
          <div className="text-xs text-ink-400">
            {stats.tasksCompleted}/{stats.tasksPlanned} done · {stats.tasksMissed} missed
          </div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-400">Best-performing subject</div>
          <div className="mt-1 text-base font-semibold">{stats.best ?? "Not enough data"}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-400">Weakest subject</div>
          <div className="mt-1 text-base font-semibold">{stats.weakest ?? "Not enough data"}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-400">Questions solved</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.questions}</div>
          <div className="text-xs text-ink-400">{stats.mistakes} mistakes logged</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-400">Tests completed</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{stats.testsDone.length}</div>
        </div>
      </div>

      {stats.bySubject.length > 0 && (
        <Card title="Subject completion this week" className="mt-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.bySubject.map((s) => (
              <div key={s.subject}>
                <div className="flex justify-between text-sm">
                  <span>{s.subject}</span>
                  <span className="tabular-nums text-ink-300">{Math.round(s.ratio * 100)}%</span>
                </div>
                <ProgressBar className="mt-1" value={s.ratio * 100} tone={s.ratio < 0.5 ? "warn" : "mint"} label={`${s.subject} completion`} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title={`Missed tasks (${missed.length})`} className="mt-5">
        {missed.length === 0 ? (
          <p className="text-sm text-ink-300">No missed tasks in this week so far.</p>
        ) : (
          <div className="space-y-2">
            {missed.map((t) => (
              <TaskRow key={t.id} task={t} today={today} onEdit={setEditTask} showDate compact />
            ))}
          </div>
        )}
      </Card>

      <Card title="Review notes" className="mt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Repeated mistakes">
            <SavedField multiline value={review?.repeatedMistakes ?? ""} onSave={(v) => saveWeekly(week, { repeatedMistakes: v })} placeholder="Same error appearing again and again" />
          </Field>
          <Field label="Reasons for falling behind">
            <SavedField multiline value={review?.reasonsBehind ?? ""} onSave={(v) => saveWeekly(week, { reasonsBehind: v })} placeholder="Be specific: sleep, phone, hard chapter, unplanned events" />
          </Field>
          <Field label={`Next week's priorities (from ${fmtShort(nextWeekStart)})`}>
            <SavedField multiline value={review?.nextPriorities ?? ""} onSave={(v) => saveWeekly(week, { nextPriorities: v })} />
          </Field>
          <Field label="Recovery plan">
            <SavedField multiline value={review?.recoveryPlan ?? ""} onSave={(v) => saveWeekly(week, { recoveryPlan: v })} placeholder="Which missed tasks move where, and what you will drop if needed" />
          </Field>
          <Field label="Honest one-line summary" className="sm:col-span-2">
            <SavedField value={review?.honestNote ?? ""} onSave={(v) => saveWeekly(week, { honestNote: v })} placeholder="Did this week match what I planned?" />
          </Field>
        </div>
      </Card>

      {stats.tasksPlanned === 0 && <div className="mt-5"><Empty title="No tasks fall in this week" /></div>}
      {stats.chaptersPlanned.length > 0 && (
        <Card title="Chapters planned this week" className="mt-5">
          <ul className="space-y-1.5 text-sm">
            {stats.chaptersPlanned.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-ink-100">{c.title}</span>
                <Badge tone={c.status === "Completed" ? "good" : "neutral"}>{c.status}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <TaskEditor open={editTask !== null} onClose={() => setEditTask(null)} taskId={editTask} defaultDate={today} />
    </>
  );
}
