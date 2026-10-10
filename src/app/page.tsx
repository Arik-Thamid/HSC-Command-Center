"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ChapterEditor from "@/components/ChapterEditor";
import TaskEditor from "@/components/TaskEditor";
import TaskRow from "@/components/TaskRow";
import { Badge, Card, Check, Empty, PageHeader, ProgressBar, Stat } from "@/components/ui";
import { diffDays, fmtLong, fmtMinutes, fmtShort } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { PAPERS, PAPER_BY_ID } from "@/lib/seed";
import {
  chapterStats,
  isOverdue,
  loggedMinutes,
  paceCheck,
  revisionQueue,
  studyStreak,
  weakChapters,
  weekRange,
} from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { pct } from "@/lib/utils";

export default function Dashboard() {
  const today = useToday();
  const chapters = useStore((s) => s.chapters);
  const tasks = useStore((s) => s.tasks);
  const revisions = useStore((s) => s.revisions);
  const tests = useStore((s) => s.tests);
  const prep = useStore((s) => s.prep);
  const settings = useStore((s) => s.settings);
  const report = useStore((s) => s.planReport);
  const markRevisionDone = useStore((s) => s.markRevisionDone);
  const togglePrep = useStore((s) => s.togglePrep);

  const [editTask, setEditTask] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editChapter, setEditChapter] = useState<string | null>(null);

  const stats = useMemo(() => chapterStats(chapters), [chapters]);
  const pace = useMemo(() => paceCheck(chapters, today), [chapters, today]);
  const todayTasks = useMemo(() => tasks.filter((t) => t.date === today).sort((a, b) => (a.kind === "recall" ? 1 : 0) - (b.kind === "recall" ? 1 : 0)), [tasks, today]);
  const overdue = useMemo(() => tasks.filter((t) => isOverdue(t, today)).sort((a, b) => a.date.localeCompare(b.date)), [tasks, today]);
  const loggedToday = loggedMinutes(tasks, today);
  const streak = useMemo(() => studyStreak(tasks, today), [tasks, today]);
  const week = weekRange(today, settings);
  const weekTasks = tasks.filter((t) => t.date >= week.start && t.date <= week.end);
  const weekDone = weekTasks.filter((t) => t.status === "Completed").length;
  const queue = useMemo(() => revisionQueue(revisions, chapters, today), [revisions, chapters, today]);
  const weak = useMemo(() => weakChapters(chapters, tests), [chapters, tests]);

  const daysLeft = diffDays(today, settings.endDate);
  const totalDays = diffDays(settings.startDate, settings.endDate) + 1;
  const dayNo = diffDays(settings.startDate, today) + 1;
  const unverified = chapters.filter((c) => !c.titleVerified).length;
  const placeholders = chapters.filter((c) => c.placeholder).length;
  const todayPlanned = todayTasks.reduce((a, t) => a + t.plannedMin, 0);
  const upcomingTests = tests.filter((t) => t.marksObtained === null && t.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  const paceTone = pace.behindBy <= 0 ? "good" : pace.behindBy <= 2 ? "warn" : "bad";

  return (
    <>
      <PageHeader
        title="HSC 2027 Command Center"
        subtitle={fmtLong(today)}
        actions={
          <>
            <button className="btn" onClick={() => setAdding(true)}>
              Add task
            </button>
            <Link href={`/daily/${today}`} className="btn-primary">
              Open today&apos;s page
            </Link>
          </>
        }
      />

      {unverified > 0 && (
        <div className="mb-4 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          {unverified} of {stats.total} chapter titles are not verified yet
          {placeholders > 0 ? `, including ${placeholders} “[Fill in]” placeholders` : ""}. Check them against your NCTB textbooks in the{" "}
          <Link href="/syllabus" className="underline">
            Syllabus tab
          </Link>
          .
        </div>
      )}

      {report && report.verdict !== "ok" && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${report.verdict === "overloaded" ? "border-danger/40 bg-danger/10 text-danger" : "border-warn/40 bg-warn/10 text-warn"}`}>
          Workload is {report.verdict}: the syllabus needs about {report.requiredHours}h and the plan has {report.availableHours}h of chapter time.{" "}
          <Link href="/roadmap" className="underline">
            See the roadmap
          </Link>{" "}
          for the highest-risk days.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="card col-span-2 px-4 py-3 lg:col-span-2">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-ink-400">Overall syllabus completion</div>
              <div className="mt-1 text-4xl font-semibold tabular-nums text-ink-50">{stats.completedPct}%</div>
            </div>
            <div className="text-right text-xs text-ink-400">
              <div>
                {stats.completed} of {stats.total} units completed
              </div>
              <div>All six checks ticked: {stats.checkpointPct}%</div>
            </div>
          </div>
          <ProgressBar className="mt-3 h-2.5" value={stats.completedPct} label="Overall syllabus completion" />
        </div>
        <Stat
          label="Countdown to 31 Dec 2026"
          value={daysLeft >= 0 ? `${daysLeft} days` : "Passed"}
          hint={dayNo >= 1 && dayNo <= totalDays ? `Day ${dayNo} of ${totalDays}` : dayNo < 1 ? `Starts in ${1 - dayNo} days` : "Plan window ended"}
        />
        <Stat label="Study streak" value={`${streak.current} ${streak.current === 1 ? "day" : "days"}`} hint={`Best: ${streak.best}`} tone={streak.current > 0 ? "good" : undefined} />
        <Stat label="Completed" value={stats.completed} tone="good" />
        <Stat label="In progress" value={stats.inProgress} hint={stats.needsRevision ? `${stats.needsRevision} need revision` : undefined} />
        <Stat label="Pending" value={stats.pending} />
        <Stat label="Pace vs plan" value={pace.behindBy <= 0 ? "On pace" : `${pace.behindBy} behind`} hint={`${pace.dueDone}/${pace.dueByNow} planned chapters done`} tone={paceTone} />
        <Stat label="Hours today" value={fmtMinutes(loggedToday)} hint={`of ${fmtMinutes(todayPlanned)} planned`} />
        <Stat label="This week" value={`${pct(weekDone, weekTasks.length)}%`} hint={`${weekDone}/${weekTasks.length} tasks completed`} />
        <Stat label="Overdue tasks" value={overdue.length} tone={overdue.length ? "bad" : "good"} />
        <Stat label="Revisions due" value={queue.due.length} tone={queue.due.length ? "warn" : "good"} hint={`${queue.upcoming.length} upcoming`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <Card
            title="Today's study schedule"
            action={
              <Link href="/planner" className="text-xs text-ink-200 hover:underline">
                Open planner
              </Link>
            }
          >
            {todayTasks.length === 0 ? (
              <Empty title="Nothing scheduled today" hint="Add a task, or check that today falls inside your plan dates in Settings." />
            ) : (
              <div className="space-y-2">
                {todayTasks.map((t) => (
                  <TaskRow key={t.id} task={t} today={today} onEdit={setEditTask} />
                ))}
              </div>
            )}
          </Card>

          <Card
            title={`Overdue tasks (${overdue.length})`}
            action={
              <Link href="/planner?view=overdue" className="text-xs text-ink-200 hover:underline">
                Fix in planner
              </Link>
            }
          >
            {overdue.length === 0 ? (
              <p className="text-sm text-ink-300">Nothing overdue.</p>
            ) : (
              <div className="space-y-2">
                {overdue.slice(0, 6).map((t) => (
                  <TaskRow key={t.id} task={t} today={today} onEdit={setEditTask} showDate compact />
                ))}
                {overdue.length > 6 && <p className="pt-1 text-xs text-ink-400">+ {overdue.length - 6} more in the planner</p>}
              </div>
            )}
          </Card>

          <Card title="Subject-wise progress">
            <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {PAPERS.map((p) => {
                const list = chapters.filter((c) => c.paperId === p.id);
                const done = list.filter((c) => c.status === "Completed").length;
                const inProg = list.filter((c) => c.status === "In Progress" || c.status === "Needs Revision").length;
                return (
                  <Link key={p.id} href={`/syllabus?paper=${p.id}`} className="block rounded-md hover:bg-navy-800/60">
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="text-ink-100">{p.name}</span>
                      <span className="tabular-nums text-ink-300">
                        {done}/{list.length}
                      </span>
                    </div>
                    <ProgressBar className="mt-1.5" value={pct(done, list.length)} label={`${p.name} progress`} />
                    <div className="mt-0.5 text-xs text-ink-400">{inProg} in progress</div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <Card
            title={`Revise today (${queue.due.length})`}
            action={
              <Link href="/revision" className="text-xs text-ink-200 hover:underline">
                Revision tracker
              </Link>
            }
          >
            {queue.due.length === 0 ? (
              <p className="text-sm text-ink-300">No revisions due. They appear here a day or two after you first study a chapter.</p>
            ) : (
              <ul className="space-y-2">
                {queue.due.slice(0, 6).map((r) => (
                  <li key={r.chapter.id} className="flex items-center justify-between gap-2 rounded-md border border-navy-700 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-ink-50">{r.chapter.title}</div>
                      <div className="text-xs text-ink-400">
                        {PAPER_BY_ID[r.chapter.paperId]?.short} · Revision {r.stage}
                        {r.daysLate > 0 ? ` · ${r.daysLate}d late` : " · due today"}
                      </div>
                    </div>
                    <button className="btn" onClick={() => markRevisionDone(r.chapter.id, r.stage)}>
                      Done
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {queue.upcoming.length > 0 && (
              <div className="mt-4">
                <div className="mb-1 text-xs font-medium text-ink-300">Upcoming</div>
                <ul className="space-y-1 text-sm text-ink-200">
                  {queue.upcoming.slice(0, 4).map((r) => (
                    <li key={r.chapter.id} className="flex justify-between gap-2">
                      <span className="truncate">{r.chapter.title}</span>
                      <span className="shrink-0 text-ink-400">
                        R{r.stage} · {fmtShort(r.date)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card title={`Weak chapters (${weak.length})`}>
            {weak.length === 0 ? (
              <p className="text-sm text-ink-300">None flagged. Rate confidence, note weak areas or log tests to populate this list.</p>
            ) : (
              <ul className="space-y-2">
                {weak.slice(0, 7).map((w) => (
                  <li key={w.chapter.id}>
                    <button onClick={() => setEditChapter(w.chapter.id)} className="w-full rounded-md border border-navy-700 px-3 py-2 text-left hover:bg-navy-800">
                      <div className="truncate text-sm text-ink-50">{w.chapter.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                        <Badge>{PAPER_BY_ID[w.chapter.paperId]?.short}</Badge>
                        <span className="text-warn">{w.reasons.join(" · ")}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming tests">
            {upcomingTests.length === 0 ? (
              <p className="text-sm text-ink-300">No tests scheduled.</p>
            ) : (
              <ul className="space-y-1 text-sm text-ink-200">
                {upcomingTests.slice(0, 4).map((t) => (
                  <li key={t.id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {PAPER_BY_ID[t.paperId]?.short} · {t.type}
                    </span>
                    <span className="shrink-0 text-ink-400">{fmtShort(t.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="January revision preparation">
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-navy-900 px-2 py-2">
                <div className="text-lg font-semibold tabular-nums text-ink-50">{stats.total - stats.completed}</div>
                <div className="text-xs text-ink-400">chapters left</div>
              </div>
              <div className="rounded-md bg-navy-900 px-2 py-2">
                <div className="text-lg font-semibold tabular-nums text-ink-50">{weak.length}</div>
                <div className="text-xs text-ink-400">weak</div>
              </div>
              <div className="rounded-md bg-navy-900 px-2 py-2">
                <div className="text-lg font-semibold tabular-nums text-ink-50">{queue.due.length}</div>
                <div className="text-xs text-ink-400">revisions due</div>
              </div>
            </div>
            <div className="space-y-2">
              {prep.map((p) => (
                <Check key={p.id} checked={p.done} onChange={() => togglePrep(p.id)} label={p.label} />
              ))}
            </div>
            <Link href="/settings" className="mt-3 inline-block text-xs text-ink-200 hover:underline">
              Edit this checklist in Settings
            </Link>
          </Card>
        </div>
      </div>

      <TaskEditor open={adding || editTask !== null} onClose={() => { setAdding(false); setEditTask(null); }} taskId={editTask} defaultDate={today} />
      <ChapterEditor chapterId={editChapter} onClose={() => setEditChapter(null)} />
    </>
  );
}
