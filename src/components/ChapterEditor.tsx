"use client";

import { useEffect, useState } from "react";
import { PAPER_BY_ID } from "@/lib/seed";
import { canComplete, useStore } from "@/lib/store";
import { chapterActualHours, nextRevisionStage } from "@/lib/selectors";
import { fmtShort } from "@/lib/dates";
import type { Chapter, ChapterStatus, Difficulty, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, Field, Modal } from "./ui";

const STATUSES: ChapterStatus[] = ["Not Started", "In Progress", "Completed", "Needs Revision"];
const PRIORITIES: Priority[] = ["High", "Medium", "Low"];
const DIFFS: Difficulty[] = ["Easy", "Medium", "Hard"];

export default function ChapterEditor({ chapterId, onClose }: { chapterId: string | null; onClose: () => void }) {
  const chapter = useStore((s) => (chapterId ? s.chapters.find((c) => c.id === chapterId) : undefined));
  const tasks = useStore((s) => s.tasks);
  const revision = useStore((s) => (chapterId ? s.revisions[chapterId] : undefined));
  const [f, setF] = useState<Chapter | null>(null);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    setF(chapter ? { ...chapter } : null);
    setError("");
    setConfirm(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  if (!chapterId || !chapter || !f) return null;
  const paper = PAPER_BY_ID[f.paperId];
  const set = <K extends keyof Chapter>(k: K, v: Chapter[K]) => setF((p) => (p ? { ...p, [k]: v } : p));
  const completion = canComplete(f);
  const next = revision ? nextRevisionStage(revision) : null;

  function save() {
    if (!f) return;
    const st = useStore.getState();
    const { status, ...rest } = f;
    st.updateChapter(f.id, {
      title: f.title.trim() || chapter!.title,
      titleVerified: f.titleVerified,
      placeholder: f.title.trim().startsWith("[Fill in]"),
      number: f.number,
      priority: f.priority,
      difficulty: f.difficulty,
      plannedStart: f.plannedStart,
      plannedFinish: f.plannedFinish,
      estHours: Math.max(0.5, rest.estHours),
      theory: f.theory,
      notes: f.notes,
      cq: f.cq,
      mcq: f.mcq,
      rev1: f.rev1,
      rev2: f.rev2,
      confidence: f.confidence,
      weakAreas: f.weakAreas,
    });
    const current = useStore.getState().chapters.find((c) => c.id === f.id)!;
    if (status !== current.status) {
      const res = st.setChapterStatus(f.id, status);
      if (!res.ok) {
        setError(res.reason ?? "Could not change status.");
        set("status", current.status);
        return;
      }
    }
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`${paper?.short ?? ""} · Chapter ${f.number}`}
      wide
      footer={
        <>
          {!confirm && (
            <button className="btn mr-auto text-danger" onClick={() => setConfirm(true)}>
              Delete chapter
            </button>
          )}
          {confirm && (
            <button
              className="btn mr-auto border-danger/60 text-danger"
              onClick={() => {
                useStore.getState().deleteChapter(f.id);
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
            Save chapter
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Chapter / topic title" className="sm:col-span-2">
          <input className="field" value={f.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Check
            checked={f.titleVerified}
            onChange={(v) => set("titleVerified", v)}
            label="Title checked against my current NCTB textbook / HSC 2027 syllabus"
          />
          {f.title.trim().startsWith("[Fill in]") && <p className="mt-1 text-xs text-warn">This is a placeholder. Replace it with the real title from your textbook.</p>}
        </div>
        <Field label="Chapter number">
          <input type="number" min={1} className="field" value={f.number} onChange={(e) => set("number", Number(e.target.value))} />
        </Field>
        <Field label="Estimated study hours">
          <input type="number" min={0.5} step={0.5} className="field" value={f.estHours} onChange={(e) => set("estHours", Number(e.target.value))} />
        </Field>
        <Field label="Priority">
          <select className="field" value={f.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Difficulty">
          <select className="field" value={f.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>
            {DIFFS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Planned start date">
          <input type="date" className="field" value={f.plannedStart} onChange={(e) => set("plannedStart", e.target.value)} />
        </Field>
        <Field label="Planned finish date">
          <input type="date" className="field" value={f.plannedFinish} onChange={(e) => set("plannedFinish", e.target.value)} />
        </Field>
        <Field label="Status" hint={error ? undefined : f.status === "Completed" ? undefined : "Completed needs theory, notes, CQ and MCQ ticked."} className="sm:col-span-2">
          <select className="field" value={f.status} onChange={(e) => { setError(""); set("status", e.target.value as ChapterStatus); }}>
            {STATUSES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
          {f.status === "Completed" && !completion.ok && <span className="mt-1 block text-xs text-warn">Not ready: missing {completion.missing.join(", ")}.</span>}
        </Field>
      </div>

      <div className="mt-4 rounded-lg border border-navy-700 p-3">
        <div className="mb-2 text-xs font-medium text-ink-300">Completion checks</div>
        <div className="grid gap-2 sm:grid-cols-3">
          <Check checked={f.theory} onChange={(v) => set("theory", v)} label="Textbook theory" />
          <Check checked={f.notes} onChange={(v) => set("notes", v)} label="Personal notes" />
          <Check checked={f.cq} onChange={(v) => set("cq", v)} label="CQ practice" />
          <Check checked={f.mcq} onChange={(v) => set("mcq", v)} label="MCQ practice" />
          <Check checked={f.rev1} onChange={(v) => set("rev1", v)} label="First revision" />
          <Check checked={f.rev2} onChange={(v) => set("rev2", v)} label="Second revision" />
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 text-xs font-medium text-ink-300">Confidence</div>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Confidence">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={f.confidence === n}
              onClick={() => set("confidence", n)}
              className={cn("h-9 min-w-[2.25rem] rounded-md border px-2 text-sm", f.confidence === n ? "border-ink-50 bg-ink-50 font-semibold text-black" : "border-navy-700 text-ink-300 hover:bg-navy-800")}
            >
              {n === 0 ? "Unrated" : n}
            </button>
          ))}
        </div>
      </div>

      <Field label="Weak areas" className="mt-4">
        <textarea className="field min-h-[64px]" value={f.weakAreas} onChange={(e) => set("weakAreas", e.target.value)} placeholder="Sub-topics, formulas, diagrams you keep missing" />
      </Field>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-ink-400">Actual hours (from tasks)</dt>
          <dd className="text-ink-100">{chapterActualHours(tasks, f.id)}h</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-400">Actual completion</dt>
          <dd className="text-ink-100">{fmtShort(chapter.actualCompletion)}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-400">Next revision</dt>
          <dd className="text-ink-100">{next ? `R${next.stage} · ${fmtShort(next.date)}` : revision ? "All three done" : "Starts after first study"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-400">Status now</dt>
          <dd className="text-ink-100">{chapter.status}</dd>
        </div>
      </dl>
    </Modal>
  );
}
