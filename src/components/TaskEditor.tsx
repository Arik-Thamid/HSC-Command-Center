"use client";

import { useEffect, useMemo, useState } from "react";
import { PAPERS, PAPER_BY_ID } from "@/lib/seed";
import { defaultChecklist } from "@/lib/scheduler";
import { useStore } from "@/lib/store";
import type { ChecklistItem, Difficulty, Task, TaskStatus, TaskType } from "@/lib/types";
import { addDays } from "@/lib/dates";
import { uid } from "@/lib/utils";
import { Check, Field, Modal } from "./ui";

const TYPES: TaskType[] = ["Learn", "Practice", "Revise", "Test", "Practical"];
const STATUSES: TaskStatus[] = ["Not Started", "In Progress", "Completed", "Skipped"];
const DIFFS: Difficulty[] = ["Easy", "Medium", "Hard"];

interface Props {
  open: boolean;
  onClose: () => void;
  taskId?: string | null;
  defaultDate: string;
}

interface Form {
  date: string;
  paperId: string;
  chapterId: string;
  topic: string;
  type: TaskType;
  plannedMin: number;
  actualMin: number;
  status: TaskStatus;
  difficulty: Difficulty;
  questionsSolved: number;
  mistakes: number;
  notes: string;
  checklist: ChecklistItem[];
}

function blank(date: string): Form {
  return {
    date,
    paperId: "",
    chapterId: "",
    topic: "",
    type: "Learn",
    plannedMin: 60,
    actualMin: 0,
    status: "Not Started",
    difficulty: "Medium",
    questionsSolved: 0,
    mistakes: 0,
    notes: "",
    checklist: defaultChecklist("Learn"),
  };
}

function fromTask(t: Task): Form {
  return {
    date: t.date,
    paperId: t.paperId ?? "",
    chapterId: t.chapterId ?? "",
    topic: t.topic,
    type: t.type,
    plannedMin: t.plannedMin,
    actualMin: t.actualMin,
    status: t.status,
    difficulty: t.difficulty,
    questionsSolved: t.questionsSolved,
    mistakes: t.mistakes,
    notes: t.notes,
    checklist: t.checklist,
  };
}

export default function TaskEditor({ open, onClose, taskId, defaultDate }: Props) {
  const task = useStore((s) => (taskId ? s.tasks.find((t) => t.id === taskId) : undefined));
  const chapters = useStore((s) => s.chapters);
  const { addTask, updateTask, deleteTask, completeTask, skipTask, reopenTask } = useStore.getState();
  const [f, setF] = useState<Form>(() => blank(defaultDate));
  const [newItem, setNewItem] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(task ? fromTask(task) : blank(defaultDate));
    setNewItem("");
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId]);

  const paperChapters = useMemo(
    () => chapters.filter((c) => c.paperId === f.paperId).sort((a, b) => a.number - b.number),
    [chapters, f.paperId],
  );

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  function pickChapter(id: string) {
    const ch = chapters.find((c) => c.id === id);
    setF((p) => ({ ...p, chapterId: id, topic: ch && (!p.topic || chapters.some((c) => c.title === p.topic)) ? ch.title : p.topic, difficulty: ch ? ch.difficulty : p.difficulty }));
  }

  function save() {
    const base = {
      date: f.date,
      paperId: f.paperId || null,
      chapterId: f.chapterId || null,
      topic: f.topic.trim() || (f.paperId ? PAPER_BY_ID[f.paperId].name : "Study task"),
      type: f.type,
      plannedMin: Math.max(0, f.plannedMin),
      actualMin: Math.max(0, f.actualMin),
      difficulty: f.difficulty,
      questionsSolved: Math.max(0, f.questionsSolved),
      mistakes: Math.max(0, f.mistakes),
      notes: f.notes,
      checklist: f.checklist,
    };
    let id = taskId ?? "";
    const prevStatus: TaskStatus = task ? task.status : "Not Started";
    if (task) {
      updateTask(task.id, base);
    } else {
      id = addTask({ ...base, type: f.type, date: f.date });
      updateTask(id, { actualMin: base.actualMin, questionsSolved: base.questionsSolved, mistakes: base.mistakes });
    }
    if (f.status !== prevStatus) {
      if (f.status === "Completed") completeTask(id, base.actualMin > 0 ? base.actualMin : undefined);
      else if (f.status === "Skipped") skipTask(id);
      else if (f.status === "Not Started") reopenTask(id);
      else updateTask(id, { status: f.status, completedOn: "" });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task ? "Edit task" : "Add task"}
      wide
      footer={
        <>
          {task && !confirmDelete && (
            <button className="btn mr-auto text-danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          )}
          {task && confirmDelete && (
            <button
              className="btn mr-auto border-danger/60 text-danger"
              onClick={() => {
                deleteTask(task.id);
                onClose();
              }}
            >
              Confirm delete
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Save task
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date">
          <input type="date" className="field" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Task type">
          <select className="field" value={f.type} onChange={(e) => set("type", e.target.value as TaskType)}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Paper">
          <select
            className="field"
            value={f.paperId}
            onChange={(e) => setF((p) => ({ ...p, paperId: e.target.value, chapterId: "" }))}
          >
            <option value="">General (no paper)</option>
            {PAPERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chapter">
          <select className="field" value={f.chapterId} onChange={(e) => pickChapter(e.target.value)} disabled={!f.paperId}>
            <option value="">{f.paperId ? "No chapter" : "Pick a paper first"}</option>
            {paperChapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.number}. {c.title.length > 60 ? c.title.slice(0, 58) + "…" : c.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Topic" className="sm:col-span-2">
          <input className="field" value={f.topic} onChange={(e) => set("topic", e.target.value)} placeholder="What exactly will you do?" />
        </Field>
        <Field label="Planned minutes">
          <input type="number" min={0} className="field" value={f.plannedMin} onChange={(e) => set("plannedMin", Number(e.target.value))} />
        </Field>
        <Field label="Actual minutes">
          <input type="number" min={0} className="field" value={f.actualMin} onChange={(e) => set("actualMin", Number(e.target.value))} />
        </Field>
        <Field label="Status">
          <select className="field" value={f.status} onChange={(e) => set("status", e.target.value as TaskStatus)}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Difficulty">
          <select className="field" value={f.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>
            {DIFFS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Questions solved">
          <input type="number" min={0} className="field" value={f.questionsSolved} onChange={(e) => set("questionsSolved", Number(e.target.value))} />
        </Field>
        <Field label="Mistakes found">
          <input type="number" min={0} className="field" value={f.mistakes} onChange={(e) => set("mistakes", Number(e.target.value))} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <textarea className="field min-h-[72px]" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </div>

      <div className="mt-4">
        <div className="mb-2 text-xs font-medium text-ink-300">Completion checklist</div>
        <div className="space-y-2">
          {f.checklist.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2">
              <Check
                checked={c.done}
                label={c.label}
                onChange={(v) => set("checklist", f.checklist.map((x) => (x.id === c.id ? { ...x, done: v } : x)))}
              />
              <button className="btn-ghost text-xs" onClick={() => set("checklist", f.checklist.filter((x) => x.id !== c.id))}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className="field"
            placeholder="Add a checklist item"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newItem.trim()) {
                set("checklist", [...f.checklist, { id: uid("c"), label: newItem.trim(), done: false }]);
                setNewItem("");
              }
            }}
          />
          <button
            className="btn"
            onClick={() => {
              if (!newItem.trim()) return;
              set("checklist", [...f.checklist, { id: uid("c"), label: newItem.trim(), done: false }]);
              setNewItem("");
            }}
          >
            Add
          </button>
        </div>
      </div>
      {task && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn" onClick={() => set("date", addDays(f.date, 1))}>
            Push one day later
          </button>
        </div>
      )}
    </Modal>
  );
}
