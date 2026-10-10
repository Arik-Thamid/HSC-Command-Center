"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ChapterEditor from "@/components/ChapterEditor";
import TaskEditor from "@/components/TaskEditor";
import TaskRow from "@/components/TaskRow";
import { Badge, Card, Chips, Empty, PageHeader, ProgressBar } from "@/components/ui";
import { addDays, dayName, fmtLong, fmtMinutes, fmtShort, listDays, monthKey, monthLabel, weekday } from "@/lib/dates";
import { useInitialParam, useToday } from "@/lib/hooks";
import { PAPERS, PAPER_BY_ID } from "@/lib/seed";
import { checkpointPct, isOverdue, weekRange } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { ChapterStatus, Task } from "@/lib/types";
import { cn, sum } from "@/lib/utils";

type View = "today" | "tomorrow" | "week" | "calendar" | "overdue" | "completed" | "skipped" | "subject" | "board";

const VIEW_IDS: View[] = ["today", "tomorrow", "week", "calendar", "overdue", "completed", "skipped", "subject", "board"];

const byDateThenOrder = (a: Task, b: Task) => a.date.localeCompare(b.date) || (a.kind === "recall" ? 1 : 0) - (b.kind === "recall" ? 1 : 0);

export default function PlannerPage() {
  const today = useToday();
  const tasks = useStore((s) => s.tasks);
  const chapters = useStore((s) => s.chapters);
  const settings = useStore((s) => s.settings);
  const moveTasks = useStore((s) => s.moveTasks);
  const setChapterStatus = useStore((s) => s.setChapterStatus);

  const initialView = useInitialParam("view");
  const [view, setView] = useState<View>("today");
  const [paper, setPaper] = useState("phy1");
  const [month, setMonth] = useState(monthKey(today));
  const [selectedDay, setSelectedDay] = useState(today);
  const [editTask, setEditTask] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editChapter, setEditChapter] = useState<string | null>(null);
  const [boardPaper, setBoardPaper] = useState("all");
  const [boardError, setBoardError] = useState("");

  useEffect(() => {
    if (initialView && (VIEW_IDS as string[]).includes(initialView)) setView(initialView as View);
  }, [initialView]);

  const tomorrow = addDays(today, 1);
  const overdue = useMemo(() => tasks.filter((t) => isOverdue(t, today)).sort(byDateThenOrder), [tasks, today]);
  const completed = useMemo(() => tasks.filter((t) => t.status === "Completed").sort((a, b) => b.completedOn.localeCompare(a.completedOn)), [tasks]);
  const skipped = useMemo(() => tasks.filter((t) => t.status === "Skipped").sort(byDateThenOrder), [tasks]);
  const week = weekRange(today, settings);

  const counts: Record<View, number | undefined> = {
    today: tasks.filter((t) => t.date === today).length,
    tomorrow: tasks.filter((t) => t.date === tomorrow).length,
    week: tasks.filter((t) => t.date >= week.start && t.date <= week.end).length,
    calendar: undefined,
    overdue: overdue.length,
    completed: completed.length,
    skipped: skipped.length,
    subject: undefined,
    board: undefined,
  };

  const list = (items: Task[], opts?: { showDate?: boolean; empty?: string }) =>
    items.length === 0 ? (
      <Empty title={opts?.empty ?? "No tasks here"} />
    ) : (
      <div className="space-y-2">
        {items.map((t) => (
          <TaskRow key={t.id} task={t} today={today} onEdit={setEditTask} showDate={opts?.showDate} />
        ))}
      </div>
    );

  const daySummary = (items: Task[]) => {
    const planned = sum(items.map((t) => t.plannedMin));
    const done = sum(items.filter((t) => t.status === "Completed").map((t) => t.actualMin));
    return `${items.filter((t) => t.status === "Completed").length}/${items.length} done · ${fmtMinutes(done)} of ${fmtMinutes(planned)}`;
  };

  function renderToday(date: string, label: string) {
    const items = tasks.filter((t) => t.date === date).sort(byDateThenOrder);
    return (
      <Card
        title={`${label} · ${fmtLong(date)}`}
        action={
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-ink-400 sm:inline">{daySummary(items)}</span>
            <Link href={`/daily/${date}`} className="text-xs text-ink-200 hover:underline">
              Daily page
            </Link>
          </div>
        }
      >
        {list(items, { empty: "No tasks on this day" })}
      </Card>
    );
  }

  function renderWeek() {
    const days = listDays(week.start, week.end);
    return (
      <div className="space-y-4">
        {days.map((d) => {
          const items = tasks.filter((t) => t.date === d).sort(byDateThenOrder);
          return (
            <Card
              key={d}
              title={`${dayName(d)}, ${fmtShort(d)}${d === today ? " · today" : ""}`}
              action={<span className="text-xs text-ink-400">{items.length ? daySummary(items) : "empty"}</span>}
            >
              {list(items, { empty: "Nothing planned" })}
            </Card>
          );
        })}
      </div>
    );
  }

  function renderCalendar() {
    const [y, m] = month.split("-").map(Number);
    const first = `${month}-01`;
    const daysInMonth = new Date(y, m, 0).getDate();
    const offset = (weekday(first) - settings.weekStartsOn + 7) % 7;
    const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
    const months: string[] = [];
    for (const d of listDays(settings.startDate, settings.endDate)) if (!months.includes(monthKey(d))) months.push(monthKey(d));
    if (!months.includes(month)) months.push(month);
    const headers = Array.from({ length: 7 }, (_, i) => dayName(addDays("2026-10-04", (settings.weekStartsOn + i) % 7)));
    const dayItems = tasks.filter((t) => t.date === selectedDay).sort(byDateThenOrder);
    return (
      <div className="space-y-4">
        <Chips options={months.map((k) => ({ value: k, label: monthLabel(k) }))} value={month} onChange={setMonth} label="Month" />
        <Card pad={false}>
          <div className="grid grid-cols-7 border-b border-navy-700 text-center text-xs text-ink-400">
            {headers.map((h) => (
              <div key={h} className="py-2">
                {h}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              if (!d) return <div key={`e${i}`} className="min-h-[3.5rem] border-b border-r border-navy-800 sm:min-h-[5rem]" />;
              const items = tasks.filter((t) => t.date === d);
              const done = items.filter((t) => t.status === "Completed").length;
              const late = items.filter((t) => isOverdue(t, today)).length;
              const inPlan = d >= settings.startDate && d <= settings.endDate;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  aria-label={`${fmtLong(d)}: ${items.length} tasks, ${done} done`}
                  className={cn(
                    "min-h-[3.5rem] border-b border-r border-navy-800 p-1.5 text-left transition-colors hover:bg-navy-800 sm:min-h-[5rem]",
                    d === selectedDay && "bg-navy-800",
                    !inPlan && "opacity-40",
                  )}
                >
                  <div className={cn("text-xs", d === today ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-ink-50 font-semibold text-black" : "text-ink-300")}>
                    {Number(d.slice(8))}
                  </div>
                  {items.length > 0 && (
                    <div className="mt-1 hidden text-[11px] leading-tight text-ink-400 sm:block">
                      {done}/{items.length} done
                      {late > 0 && <div className="text-danger">{late} overdue</div>}
                    </div>
                  )}
                  {items.length > 0 && <ProgressBar className="mt-1 h-1" value={pct(done, items.length)} tone={late ? "bad" : "mint"} />}
                </button>
              );
            })}
          </div>
        </Card>
        <Card
          title={fmtLong(selectedDay)}
          action={
            <Link href={`/daily/${selectedDay}`} className="text-xs text-ink-200 hover:underline">
              Daily page
            </Link>
          }
        >
          {list(dayItems, { empty: "No tasks on this day" })}
        </Card>
      </div>
    );
  }

  function renderOverdue() {
    return (
      <div className="space-y-3">
        {overdue.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn" onClick={() => moveTasks(overdue.map((t) => t.id), today)}>
              Move all {overdue.length} to today
            </button>
            <button className="btn" onClick={() => moveTasks(overdue.map((t) => t.id), tomorrow)}>
              Move all to tomorrow
            </button>
            <span className="text-xs text-ink-400">Moving keeps progress. Use Skip on a task to record it as not done.</span>
          </div>
        )}
        {list(overdue, { showDate: true, empty: "No overdue tasks" })}
      </div>
    );
  }

  function renderSubject() {
    const items = tasks.filter((t) => t.paperId === paper).sort(byDateThenOrder);
    const chs = chapters.filter((c) => c.paperId === paper).sort((a, b) => a.number - b.number);
    return (
      <div className="space-y-4">
        <Chips options={PAPERS.map((p) => ({ value: p.id, label: p.short }))} value={paper} onChange={setPaper} label="Paper" />
        {chs.map((c) => {
          const cItems = items.filter((t) => t.chapterId === c.id);
          if (!cItems.length) return null;
          const done = cItems.filter((t) => t.status === "Completed").length;
          return (
            <Card
              key={c.id}
              title={`${c.number}. ${c.title}`}
              action={
                <span className="text-xs text-ink-400">
                  {fmtShort(c.plannedStart)} – {fmtShort(c.plannedFinish)} · {done}/{cItems.length}
                </span>
              }
            >
              <div className="space-y-2">
                {cItems.map((t) => (
                  <TaskRow key={t.id} task={t} today={today} onEdit={setEditTask} showDate compact />
                ))}
              </div>
            </Card>
          );
        })}
        {items.filter((t) => !t.chapterId).length > 0 && (
          <Card title="Other tasks for this paper">{list(items.filter((t) => !t.chapterId), { showDate: true })}</Card>
        )}
        {items.length === 0 && <Empty title="No tasks for this paper yet" />}
      </div>
    );
  }

  function renderBoard() {
    const cols: ChapterStatus[] = ["Not Started", "In Progress", "Needs Revision", "Completed"];
    const pool = chapters.filter((c) => boardPaper === "all" || c.paperId === boardPaper).sort((a, b) => a.paperId.localeCompare(b.paperId) || a.number - b.number);
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select className="field max-w-xs" value={boardPaper} onChange={(e) => setBoardPaper(e.target.value)} aria-label="Filter board by paper">
            <option value="all">All papers</option>
            {PAPERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {boardError && <span className="text-sm text-danger">{boardError}</span>}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cols.map((col) => {
            const items = pool.filter((c) => c.status === col);
            return (
              <div key={col} className="rounded-lg border border-navy-700 bg-navy-900/50">
                <div className="flex items-center justify-between border-b border-navy-700 px-3 py-2 text-sm">
                  <span className="font-medium text-ink-100">{col}</span>
                  <Badge>{items.length}</Badge>
                </div>
                <div className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
                  {items.length === 0 && <p className="px-1 py-3 text-xs text-ink-400">No chapters</p>}
                  {items.map((c) => (
                    <div key={c.id} className="rounded-md border border-navy-700 bg-navy-850 p-2.5">
                      <button className="block w-full text-left" onClick={() => setEditChapter(c.id)}>
                        <div className="text-sm text-ink-50">{c.title}</div>
                        <div className="mt-1 text-xs text-ink-400">
                          {PAPER_BY_ID[c.paperId]?.short} · {fmtShort(c.plannedStart)}–{fmtShort(c.plannedFinish)}
                        </div>
                      </button>
                      <ProgressBar className="mt-2" value={checkpointPct(c)} label="Checkpoint progress" />
                      <select
                        className="field mt-2 py-1 text-xs"
                        value={c.status}
                        aria-label={`Move ${c.title}`}
                        onChange={(e) => {
                          const res = setChapterStatus(c.id, e.target.value as ChapterStatus);
                          setBoardError(res.ok ? "" : res.reason ?? "");
                          if (!res.ok) setEditChapter(c.id);
                        }}
                      >
                        {cols.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const options: { value: View; label: string }[] = [
    { value: "today", label: "Today" },
    { value: "tomorrow", label: "Tomorrow" },
    { value: "week", label: "This week" },
    { value: "calendar", label: "Calendar" },
    { value: "overdue", label: "Overdue" },
    { value: "completed", label: "Completed" },
    { value: "skipped", label: "Skipped" },
    { value: "subject", label: "By subject" },
    { value: "board", label: "Chapter board" },
  ];

  return (
    <>
      <PageHeader
        title="Daily Study Planner"
        subtitle="Every task is linked to a chapter. Edit a task to reschedule it; nothing needs to be recreated."
        actions={
          <button className="btn-primary" onClick={() => setAdding(true)}>
            Add task
          </button>
        }
      />
      <div className="mb-4">
        <Chips options={options.map((o) => ({ ...o, count: counts[o.value] }))} value={view} onChange={setView} label="Planner views" />
      </div>

      {view === "today" && renderToday(today, "Today")}
      {view === "tomorrow" && renderToday(tomorrow, "Tomorrow")}
      {view === "week" && renderWeek()}
      {view === "calendar" && renderCalendar()}
      {view === "overdue" && renderOverdue()}
      {view === "completed" && list(completed, { showDate: true, empty: "Nothing completed yet" })}
      {view === "skipped" && (
        <div className="space-y-3">
          {skipped.length > 0 && (
            <button className="btn" onClick={() => moveTasks(skipped.map((t) => t.id), tomorrow)}>
              Move all skipped to tomorrow
            </button>
          )}
          {list(skipped, { showDate: true, empty: "No skipped tasks" })}
          <p className="text-xs text-ink-400">Skipped tasks are never counted as completed. Open one and set its status to Not Started to bring it back.</p>
        </div>
      )}
      {view === "subject" && renderSubject()}
      {view === "board" && renderBoard()}

      <TaskEditor open={adding || editTask !== null} onClose={() => { setAdding(false); setEditTask(null); }} taskId={editTask} defaultDate={view === "tomorrow" ? tomorrow : today} />
      <ChapterEditor chapterId={editChapter} onClose={() => setEditChapter(null)} />
    </>
  );
}

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

