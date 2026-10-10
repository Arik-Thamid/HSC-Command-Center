"use client";

import { useEffect, useMemo, useState } from "react";
import { PAPERS } from "@/lib/seed";
import { useStore } from "@/lib/store";
import type { TestType } from "@/lib/types";
import { Field, Modal } from "./ui";

const TYPES: TestType[] = ["CQ", "MCQ", "Written", "Practical", "Model Test"];

interface Form {
  date: string;
  paperId: string;
  chapterId: string;
  type: TestType;
  totalMarks: number;
  marks: string;
  timeTakenMin: number;
  mistakes: string;
  weakTopics: string;
  followUp: string;
}

export default function TestEditor({ open, onClose, testId, defaultDate }: { open: boolean; onClose: () => void; testId?: string | null; defaultDate: string }) {
  const test = useStore((s) => (testId ? s.tests.find((t) => t.id === testId) : undefined));
  const chapters = useStore((s) => s.chapters);
  const [f, setF] = useState<Form>({ date: defaultDate, paperId: "phy1", chapterId: "", type: "MCQ", totalMarks: 25, marks: "", timeTakenMin: 0, mistakes: "", weakTopics: "", followUp: "" });
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirm(false);
    if (test) {
      setF({
        date: test.date,
        paperId: test.paperId,
        chapterId: test.chapterId ?? "",
        type: test.type,
        totalMarks: test.totalMarks,
        marks: test.marksObtained === null ? "" : String(test.marksObtained),
        timeTakenMin: test.timeTakenMin,
        mistakes: test.mistakes,
        weakTopics: test.weakTopics,
        followUp: test.followUp,
      });
    } else {
      setF({ date: defaultDate, paperId: "phy1", chapterId: "", type: "MCQ", totalMarks: 25, marks: "", timeTakenMin: 0, mistakes: "", weakTopics: "", followUp: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, testId]);

  const paperChapters = useMemo(() => chapters.filter((c) => c.paperId === f.paperId).sort((a, b) => a.number - b.number), [chapters, f.paperId]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const marksNum = f.marks.trim() === "" ? null : Number(f.marks);
  const invalid = marksNum !== null && (Number.isNaN(marksNum) || marksNum < 0 || marksNum > f.totalMarks);
  const accuracy = marksNum !== null && !invalid && f.totalMarks > 0 ? Math.round((marksNum / f.totalMarks) * 1000) / 10 : null;

  function save() {
    if (invalid || f.totalMarks <= 0) return;
    const patch = {
      date: f.date,
      paperId: f.paperId,
      chapterId: f.chapterId || null,
      type: f.type,
      totalMarks: f.totalMarks,
      marksObtained: marksNum,
      timeTakenMin: f.timeTakenMin,
      mistakes: f.mistakes,
      weakTopics: f.weakTopics,
      followUp: f.followUp,
    };
    const st = useStore.getState();
    if (test) st.updateTest(test.id, patch);
    else st.addTest(patch);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={test ? "Edit test" : "Log or schedule a test"}
      wide
      footer={
        <>
          {test && !confirm && (
            <button className="btn mr-auto text-danger" onClick={() => setConfirm(true)}>
              Delete
            </button>
          )}
          {test && confirm && (
            <button
              className="btn mr-auto border-danger/60 text-danger"
              onClick={() => {
                useStore.getState().deleteTest(test.id);
                onClose();
              }}
            >
              Confirm delete
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={invalid || f.totalMarks <= 0}>
            Save test
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date">
          <input type="date" className="field" value={f.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        <Field label="Test type">
          <select className="field" value={f.type} onChange={(e) => set("type", e.target.value as TestType)}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Subject / paper">
          <select className="field" value={f.paperId} onChange={(e) => setF((p) => ({ ...p, paperId: e.target.value, chapterId: "" }))}>
            {PAPERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chapter or full paper">
          <select className="field" value={f.chapterId} onChange={(e) => set("chapterId", e.target.value)}>
            <option value="">Full paper</option>
            {paperChapters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.number}. {c.title.length > 56 ? c.title.slice(0, 54) + "…" : c.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Total marks">
          <input type="number" min={1} className="field" value={f.totalMarks} onChange={(e) => set("totalMarks", Number(e.target.value))} />
        </Field>
        <Field label="Marks obtained" hint={invalid ? "Marks must be between 0 and the total." : "Leave blank for an upcoming test."}>
          <input type="number" min={0} step="0.5" className="field" value={f.marks} onChange={(e) => set("marks", e.target.value)} />
        </Field>
        <Field label="Time taken (minutes)">
          <input type="number" min={0} className="field" value={f.timeTakenMin} onChange={(e) => set("timeTakenMin", Number(e.target.value))} />
        </Field>
        <Field label="Accuracy">
          <div className="field flex items-center text-ink-200">{accuracy === null ? "Not scored yet" : `${accuracy}%`}</div>
        </Field>
        <Field label="Mistakes" className="sm:col-span-2">
          <textarea className="field min-h-[64px]" value={f.mistakes} onChange={(e) => set("mistakes", e.target.value)} />
        </Field>
        <Field label="Weak topics" className="sm:col-span-2">
          <input className="field" value={f.weakTopics} onChange={(e) => set("weakTopics", e.target.value)} />
        </Field>
        <Field label="Follow-up task" className="sm:col-span-2">
          <input className="field" value={f.followUp} onChange={(e) => set("followUp", e.target.value)} placeholder="What will you do about the mistakes?" />
        </Field>
      </div>
    </Modal>
  );
}
