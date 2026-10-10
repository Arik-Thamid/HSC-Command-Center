"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import SavedField from "@/components/SavedField";
import TaskEditor from "@/components/TaskEditor";
import TaskRow from "@/components/TaskRow";
import { Card, Empty, Field, PageHeader, ProgressBar } from "@/components/ui";
import { addDays, diffDays, fmtLong, fmtMinutes, isDateStr } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { PAPER_BY_ID, SCIENCE_TRACKS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { Task } from "@/lib/types";
import { pct, sum } from "@/lib/utils";

const SESSIONS = [
  { key: "s1", title: "Session 1: Main science subject" },
  { key: "s2", title: "Session 2: Second science subject" },
  { key: "s3", title: "Session 3: Practice or another scheduled chapter" },
  { key: "s4", title: "Session 4: Language or ICT" },
  { key: "s5", title: "Final session: Recall and error correction" },
];

const RANK = { Hard: 3, Medium: 2, Easy: 1 } as const;

function assign(dayTasks: Task[]): Record<string, Task[]> {
  const out: Record<string, Task[]> = { s1: [], s2: [], s3: [], s4: [], s5: [] };
  const science = new Map<string, Task[]>();
  for (const t of dayTasks) {
    if (t.kind === "recall") {
      out.s5.push(t);
      continue;
    }
    const track = t.paperId ? PAPER_BY_ID[t.paperId]?.track : undefined;
    if (track && SCIENCE_TRACKS.includes(track)) science.set(track, [...(science.get(track) ?? []), t]);
    else if (track === "language" || track === "ict") out.s4.push(t);
    else out.s3.push(t);
  }
  const groups = Array.from(science.values()).sort(
    (a, b) => sum(b.map((t) => RANK[t.difficulty] * t.plannedMin)) - sum(a.map((t) => RANK[t.difficulty] * t.plannedMin)),
  );
  if (groups[0]) out.s1.push(...groups[0]);
  if (groups[1]) out.s2.push(...groups[1]);
  for (const g of groups.slice(2)) out.s3.push(...g);
  return out;
}

export default function DailyPage() {
  const params = useParams<{ date: string }>();
  const date = params?.date ?? "";
  const today = useToday();
  const tasks = useStore((s) => s.tasks);
  const page = useStore((s) => s.daily[date]);
  const settings = useStore((s) => s.settings);
  const saveDaily = useStore((s) => s.saveDaily);
  const setSessionNote = useStore((s) => s.setSessionNote);
  const [editTask, setEditTask] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const valid = isDateStr(date);
  const dayTasks = useMemo(() => (valid ? tasks.filter((t) => t.date === date) : []), [tasks, date, valid]);
  const buckets = useMemo(() => assign(dayTasks), [dayTasks]);

  if (!valid) return <Empty title="That date is not valid" hint="Use the planner calendar to pick a day." action={<Link href="/planner" className="btn">Open planner</Link>} />;

  const planned = sum(dayTasks.map((t) => t.plannedMin));
  const done = dayTasks.filter((t) => t.status === "Completed");
  const doneMin = sum(done.map((t) => t.actualMin));
  const questions = sum(dayTasks.map((t) => t.questionsSolved));
  const mistakes = sum(dayTasks.map((t) => t.mistakes));
  const dayNo = diffDays(settings.startDate, date) + 1;
  const unfinished = dayTasks.filter((t) => t.status === "Not Started" || t.status === "In Progress");
  const sciences = [buckets.s1[0], buckets.s2[0]];
  const practiceMin = sum(dayTasks.filter((t) => t.type === "Practice").map((t) => t.plannedMin));

  return (
    <>
      <PageHeader
        title={fmtLong(date)}
        subtitle={dayNo >= 1 ? `Day ${dayNo} of ${diffDays(settings.startDate, settings.endDate) + 1}${date === today ? " · today" : ""}` : "Before the plan starts"}
        actions={
          <>
            <Link href={`/daily/${addDays(date, -1)}`} className="btn">
              Previous day
            </Link>
            {date !== today && (
              <Link href={`/daily/${today}`} className="btn">
                Today
              </Link>
            )}
            <Link href={`/daily/${addDays(date, 1)}`} className="btn">
              Next day
            </Link>
            <button className="btn-primary" onClick={() => setAdding(true)}>
              Add task
            </button>
          </>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-ink-200">
            {done.length}/{dayTasks.length} tasks done · {fmtMinutes(doneMin)} of {fmtMinutes(planned)} planned
          </span>
          <span className="text-ink-400">
            {questions} questions · {mistakes} mistakes logged
          </span>
        </div>
        <ProgressBar className="mt-2" value={pct(done.length, dayTasks.length)} label="Tasks completed today" />
      </Card>

      <Card title="Today's main goals" className="mb-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Most important chapter">
            <SavedField value={page?.mainGoal ?? ""} onSave={(v) => saveDaily(date, { mainGoal: v })} placeholder={sciences[0] ? sciences[0].topic : "Pick the chapter that matters most"} />
          </Field>
          <Field label="Second priority">
            <SavedField value={page?.secondGoal ?? ""} onSave={(v) => saveDaily(date, { secondGoal: v })} placeholder={sciences[1] ? sciences[1].topic : "Next most important"} />
          </Field>
          <Field label="Practice target">
            <SavedField value={page?.practiceTarget ?? ""} onSave={(v) => saveDaily(date, { practiceTarget: v })} placeholder={practiceMin ? `e.g. ${Math.max(10, Math.round(practiceMin / 3))} questions` : "e.g. 30 questions"} />
          </Field>
        </div>
      </Card>

      <div className="mb-5 space-y-4">
        {SESSIONS.map((s) => (
          <Card key={s.key} title={s.title}>
            {buckets[s.key].length === 0 ? (
              <p className="text-sm text-ink-400">No task assigned to this session today.</p>
            ) : (
              <div className="space-y-2">
                {buckets[s.key].map((t) => (
                  <TaskRow key={t.id} task={t} today={today} onEdit={setEditTask} />
                ))}
              </div>
            )}
            <div className="mt-3">
              <SavedField multiline rows={2} value={page?.sessionNotes?.[s.key] ?? ""} onSave={(v) => setSessionNote(date, s.key, v)} placeholder="Session notes" ariaLabel={`${s.title} notes`} />
            </div>
          </Card>
        ))}
      </div>

      <Card title="End-of-day review">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="What did I finish?" hint={done.length ? `Completed in planner: ${done.map((t) => t.topic).slice(0, 3).join("; ")}${done.length > 3 ? "…" : ""}` : undefined}>
            <SavedField multiline value={page?.finished ?? ""} onSave={(v) => saveDaily(date, { finished: v })} />
          </Field>
          <Field label="What can I recall without looking at my notes?">
            <SavedField multiline value={page?.recall ?? ""} onSave={(v) => saveDaily(date, { recall: v })} />
          </Field>
          <Field label="How many questions did I solve?" hint={`Planner total: ${questions}`}>
            <SavedField value={page?.questions ?? ""} onSave={(v) => saveDaily(date, { questions: v })} placeholder={String(questions)} />
          </Field>
          <Field label="What mistakes did I make?" hint={`Planner total: ${mistakes}`}>
            <SavedField multiline value={page?.mistakes ?? ""} onSave={(v) => saveDaily(date, { mistakes: v })} />
          </Field>
          <Field label="What remains unfinished?" hint={unfinished.length ? `${unfinished.length} planner tasks still open` : "All planner tasks are closed"}>
            <SavedField multiline value={page?.unfinished ?? ""} onSave={(v) => saveDaily(date, { unfinished: v })} />
          </Field>
          <Field label="What must I do tomorrow?">
            <SavedField multiline value={page?.tomorrow ?? ""} onSave={(v) => saveDaily(date, { tomorrow: v })} />
          </Field>
        </div>
      </Card>

      <TaskEditor open={adding || editTask !== null} onClose={() => { setAdding(false); setEditTask(null); }} taskId={editTask} defaultDate={date} />
    </>
  );
}
