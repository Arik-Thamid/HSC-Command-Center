"use client";

import { useRef, useState } from "react";
import { Card, Check, Field, PageHeader } from "@/components/ui";
import { fmtShort } from "@/lib/dates";
import { useStore } from "@/lib/store";

export default function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const prep = useStore((s) => s.prep);
  const lastExport = useStore((s) => s.lastExport);
  const taskCount = useStore((s) => s.tasks.length);
  const chapterCount = useStore((s) => s.chapters.length);
  const updateSettings = useStore((s) => s.updateSettings);
  const regeneratePlan = useStore((s) => s.regeneratePlan);
  const togglePrep = useStore((s) => s.togglePrep);
  const addPrep = useStore((s) => s.addPrep);
  const removePrep = useStore((s) => s.removePrep);

  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<"" | "today" | "start" | "reset">("");
  const [newPrep, setNewPrep] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function doExport() {
    const json = useStore.getState().exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hsc27-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setMessage({ tone: "ok", text: "Backup downloaded." });
  }

  async function doImport(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const res = useStore.getState().importData(text);
    setMessage(res.ok ? { tone: "ok", text: "Backup restored." } : { tone: "err", text: res.error ?? "Import failed." });
    if (fileRef.current) fileRef.current.value = "";
  }

  const datesInvalid = settings.endDate <= settings.startDate;

  return (
    <>
      <PageHeader title="Settings & Data" subtitle="Plan dates, daily hours, the January checklist and your backup." />

      {message && (
        <div className={`mb-4 rounded-lg border px-4 py-3 text-sm ${message.tone === "ok" ? "border-mint-600/40 bg-mint-600/10 text-mint-300" : "border-danger/40 bg-danger/10 text-danger"}`} role="status">
          {message.text}
        </div>
      )}

      <Card title="Study plan" className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Start date">
            <input type="date" className="field" value={settings.startDate} onChange={(e) => updateSettings({ startDate: e.target.value })} />
          </Field>
          <Field label="Target completion date">
            <input type="date" className="field" value={settings.endDate} onChange={(e) => updateSettings({ endDate: e.target.value })} />
          </Field>
          <Field label="Study hours per day (including 30 min recall)">
            <input type="number" min={3} max={16} step={0.5} className="field" value={settings.dailyHours} onChange={(e) => updateSettings({ dailyHours: Math.min(16, Math.max(3, Number(e.target.value))) })} />
          </Field>
          <Field label="Final audit days" hint="Reserved for syllabus audit, weak chapters and mixed practice.">
            <input type="number" min={0} max={30} className="field" value={settings.auditDays} onChange={(e) => updateSettings({ auditDays: Math.min(30, Math.max(0, Number(e.target.value))) })} />
          </Field>
          <Field label="Weekly review day">
            <select className="field" value={settings.restWeekday} onChange={(e) => updateSettings({ restWeekday: Number(e.target.value) })}>
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Week starts on">
            <select className="field" value={settings.weekStartsOn} onChange={(e) => updateSettings({ weekStartsOn: Number(e.target.value) })}>
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {datesInvalid && <p className="mt-3 text-sm text-danger">The target date must be after the start date.</p>}

        <div className="mt-4 rounded-md border border-navy-700 bg-navy-900/60 p-3 text-sm text-ink-300">
          Rebuilding replaces only generated tasks that are still Not Started with no time logged. Completed, skipped and in-progress tasks, tasks you added yourself, chapter progress and test results are kept. Time already spent on a chapter is subtracted from what is scheduled.
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {confirm === "today" ? (
            <button
              className="btn-primary"
              onClick={() => {
                regeneratePlan("today");
                setConfirm("");
                setMessage({ tone: "ok", text: "Plan rebuilt from today. Unfinished chapters were re-spread across the remaining days." });
              }}
            >
              Confirm: rebuild from today
            </button>
          ) : (
            <button className="btn" disabled={datesInvalid} onClick={() => setConfirm("today")}>
              Rebuild remaining plan from today
            </button>
          )}
          {confirm === "start" ? (
            <button
              className="btn-primary"
              onClick={() => {
                regeneratePlan("start");
                setConfirm("");
                setMessage({ tone: "ok", text: `Plan rebuilt from ${fmtShort(settings.startDate)}.` });
              }}
            >
              Confirm: rebuild from start date
            </button>
          ) : (
            <button className="btn" disabled={datesInvalid} onClick={() => setConfirm("start")}>
              Rebuild from the start date
            </button>
          )}
          {confirm && confirm !== "reset" && (
            <button className="btn-ghost" onClick={() => setConfirm("")}>
              Cancel
            </button>
          )}
        </div>
      </Card>

      <Card title="January revision checklist" className="mb-5">
        <div className="space-y-2">
          {prep.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <Check checked={p.done} onChange={() => togglePrep(p.id)} label={p.label} />
              <button className="btn-ghost text-xs" onClick={() => removePrep(p.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className="field"
            placeholder="Add a January preparation item"
            value={newPrep}
            onChange={(e) => setNewPrep(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newPrep.trim()) {
                addPrep(newPrep.trim());
                setNewPrep("");
              }
            }}
          />
          <button
            className="btn"
            onClick={() => {
              if (!newPrep.trim()) return;
              addPrep(newPrep.trim());
              setNewPrep("");
            }}
          >
            Add
          </button>
        </div>
      </Card>

      <Card title="Backup and data" className="mb-5">
        <p className="text-sm text-ink-300">
          Everything is saved automatically in this browser ({chapterCount} chapters, {taskCount} tasks). It does not sync between devices, and clearing site data erases it. Download a backup regularly{lastExport ? `; the last one was on ${fmtShort(lastExport)}` : ", and keep a copy somewhere safe"}.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button className="btn-primary" onClick={doExport}>
            Download backup
          </button>
          <label className="btn cursor-pointer">
            Restore from backup
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => doImport(e.target.files?.[0])} />
          </label>
          {confirm === "reset" ? (
            <button
              className="btn border-danger/60 text-danger"
              onClick={() => {
                useStore.getState().resetAll();
                setConfirm("");
                setMessage({ tone: "ok", text: "Everything was reset to the starting plan." });
              }}
            >
              Confirm: erase all progress
            </button>
          ) : (
            <button className="btn text-danger" onClick={() => setConfirm("reset")}>
              Reset everything
            </button>
          )}
          {confirm === "reset" && (
            <button className="btn-ghost" onClick={() => setConfirm("")}>
              Cancel
            </button>
          )}
        </div>
      </Card>

      <Card title="About the 13 papers">
        <p className="text-sm text-ink-300">
          Your list has Bangla (2), English (2), ICT (1), Higher Mathematics (2), Biology (2), Chemistry (2) and Physics (2). That is 13 papers, not 14, and all 13 are tracked. If you take another subject, add its chapters to the Syllabus tab using any paper and tell me, and I will add it as a separate paper.
        </p>
      </Card>
    </>
  );
}
