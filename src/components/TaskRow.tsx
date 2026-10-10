"use client";

import { PAPER_BY_ID } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { fmtMinutes, fmtShort } from "@/lib/dates";
import type { Task } from "@/lib/types";
import { isOverdue } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { Badge, statusTone } from "./ui";

export default function TaskRow({
  task,
  today,
  onEdit,
  showDate,
  compact,
}: {
  task: Task;
  today: string;
  onEdit: (id: string) => void;
  showDate?: boolean;
  compact?: boolean;
}) {
  const completeTask = useStore((s) => s.completeTask);
  const reopenTask = useStore((s) => s.reopenTask);
  const skipTask = useStore((s) => s.skipTask);
  const startTask = useStore((s) => s.startTask);
  const paper = task.paperId ? PAPER_BY_ID[task.paperId] : null;
  const done = task.status === "Completed";
  const overdue = isOverdue(task, today);
  const doneItems = task.checklist.filter((c) => c.done).length;

  return (
    <div className={cn("flex items-start gap-3 rounded-md border px-3 py-2.5", done ? "border-navy-700 bg-navy-900/40" : "border-navy-700 bg-navy-850", overdue && "border-danger/40")}>
      <button
        onClick={() => (done ? reopenTask(task.id) : completeTask(task.id))}
        aria-label={done ? "Mark as not done" : "Mark as completed"}
        aria-pressed={done}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs",
          done ? "border-ink-50 bg-ink-50 text-black" : "border-ink-500 text-transparent hover:border-ink-50",
        )}
      >
        ✓
      </button>
      <div className="min-w-0 flex-1">
        <button onClick={() => onEdit(task.id)} className="block w-full text-left">
          <span className={cn("block text-sm", done ? "text-ink-400 line-through" : "text-ink-50")}>{task.topic}</span>
        </button>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          {paper && <Badge>{paper.short}</Badge>}
          <Badge tone="info">{task.type}</Badge>
          {task.status !== "Not Started" && <Badge tone={statusTone(task.status)}>{task.status}</Badge>}
          {task.difficulty === "Hard" && !compact && <Badge tone="warn">Hard</Badge>}
          <span className="text-ink-400">
            {done || task.actualMin > 0 ? `${fmtMinutes(task.actualMin)} of ${fmtMinutes(task.plannedMin)}` : fmtMinutes(task.plannedMin)}
          </span>
          {showDate && <span className={cn(overdue ? "text-danger" : "text-ink-400")}>{fmtShort(task.date)}</span>}
          {!compact && task.checklist.length > 0 && (
            <span className="text-ink-400">
              {doneItems}/{task.checklist.length} checks
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {!done && task.status === "Not Started" && (
          <button className="btn-ghost hidden text-xs sm:inline-flex" onClick={() => startTask(task.id)}>
            Start
          </button>
        )}
        {!done && task.status !== "Skipped" && (
          <button className="btn-ghost text-xs" onClick={() => skipTask(task.id)}>
            Skip
          </button>
        )}
        <button className="btn-ghost text-xs" onClick={() => onEdit(task.id)}>
          Edit
        </button>
      </div>
    </div>
  );
}
