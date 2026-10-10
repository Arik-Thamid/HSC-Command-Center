"use client";

import { useEffect, useMemo, useState } from "react";
import ChapterEditor from "@/components/ChapterEditor";
import { Badge, Card, Chips, Empty, Field, Modal, PageHeader, ProgressBar, statusTone } from "@/components/ui";
import { fmtShort } from "@/lib/dates";
import { useInitialParam } from "@/lib/hooks";
import { PAPERS, PAPER_BY_ID } from "@/lib/seed";
import { chapterActualHours, checkpointPct, nextRevisionStage } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { Chapter } from "@/lib/types";

type View = "all" | "incomplete" | "high" | "revision" | "completed";

const VIEWS: { value: View; label: string }[] = [
  { value: "all", label: "All" },
  { value: "incomplete", label: "Incomplete" },
  { value: "high", label: "High priority" },
  { value: "revision", label: "Needs revision" },
  { value: "completed", label: "Completed" },
];

export default function SyllabusPage() {
  const chapters = useStore((s) => s.chapters);
  const tasks = useStore((s) => s.tasks);
  const revisions = useStore((s) => s.revisions);
  const addChapter = useStore((s) => s.addChapter);
  const addChaptersBulk = useStore((s) => s.addChaptersBulk);

  const initialPaper = useInitialParam("paper");
  const [view, setView] = useState<View>("all");
  const [paper, setPaper] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [newPaper, setNewPaper] = useState("phy1");
  const [newTitle, setNewTitle] = useState("");
  const [bulkPaper, setBulkPaper] = useState("phy1");
  const [bulkText, setBulkText] = useState("");

  useEffect(() => {
    if (initialPaper && PAPER_BY_ID[initialPaper]) setPaper(initialPaper);
  }, [initialPaper]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chapters
      .filter((c) => (paper === "all" ? true : c.paperId === paper))
      .filter((c) => {
        switch (view) {
          case "incomplete":
            return c.status !== "Completed";
          case "high":
            return c.priority === "High";
          case "revision":
            return c.status === "Needs Revision";
          case "completed":
            return c.status === "Completed";
          default:
            return true;
        }
      })
      .filter((c) => !q || c.title.toLowerCase().includes(q) || PAPER_BY_ID[c.paperId]?.name.toLowerCase().includes(q))
      .sort((a, b) => PAPERS.findIndex((p) => p.id === a.paperId) - PAPERS.findIndex((p) => p.id === b.paperId) || a.number - b.number);
  }, [chapters, view, paper, query]);

  const viewCount = (v: View) =>
    chapters.filter((c) => (paper === "all" || c.paperId === paper) && (v === "all" ? true : v === "incomplete" ? c.status !== "Completed" : v === "high" ? c.priority === "High" : v === "revision" ? c.status === "Needs Revision" : c.status === "Completed")).length;

  const unverified = chapters.filter((c) => !c.titleVerified).length;

  function nextRev(c: Chapter): string {
    const r = revisions[c.id];
    if (!r) return "—";
    const n = nextRevisionStage(r);
    return n ? `R${n.stage} · ${fmtShort(n.date)}` : "Done";
  }

  function submitAdd() {
    if (!newTitle.trim()) return;
    addChapter(newPaper, newTitle.trim(), { titleVerified: true });
    setNewTitle("");
    setAddOpen(false);
  }

  function submitBulk() {
    const lines = bulkText.split("\n");
    if (addChaptersBulk(bulkPaper, lines) > 0) {
      setBulkText("");
      setBulkOpen(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Master Syllabus Tracker"
        subtitle="One row per chapter or topic. Open a row to tick checks, rate confidence and fix titles."
        actions={
          <>
            <button className="btn" onClick={() => setBulkOpen(true)}>
              Paste titles
            </button>
            <button className="btn-primary" onClick={() => setAddOpen(true)}>
              Add chapter
            </button>
          </>
        }
      />

      {unverified > 0 && (
        <div className="mb-4 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          Titles marked “unverified” were seeded from the standard NCTB textbook structure, not from the official HSC 2027 syllabus. Open each chapter, compare it with your textbook, edit it if needed and tick “checked”. Language-paper units marked “[Fill in]” are placeholders. To replace a whole paper at once, delete its rows and use Paste titles.
        </div>
      )}

      <div className="space-y-3">
        <Chips options={VIEWS.map((v) => ({ ...v, count: viewCount(v.value) }))} value={view} onChange={setView} label="Syllabus views" />
        <div className="flex flex-wrap items-center gap-2">
          <select className="field max-w-[16rem]" value={paper} onChange={(e) => setPaper(e.target.value)} aria-label="Filter by paper">
            <option value="all">All 13 papers</option>
            {PAPERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({chapters.filter((c) => c.paperId === p.id).length})
              </option>
            ))}
          </select>
          <input className="field max-w-xs" placeholder="Search chapters" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search chapters" />
          <span className="text-xs text-ink-400">{filtered.length} shown</span>
        </div>
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <Empty title="No chapters match this view" hint="Change the view or paper filter, or add a chapter." />
        ) : (
          <>
            {/* Desktop table */}
            <Card pad={false} className="hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="border-b border-navy-700 text-xs text-ink-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Chapter / topic</th>
                      <th className="px-3 py-2 font-medium">Paper</th>
                      <th className="px-3 py-2 font-medium">Priority</th>
                      <th className="px-3 py-2 font-medium">Difficulty</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Planned</th>
                      <th className="px-3 py-2 font-medium">Hours</th>
                      <th className="px-3 py-2 font-medium">Checks</th>
                      <th className="px-3 py-2 font-medium">Conf.</th>
                      <th className="px-3 py-2 font-medium">Next revision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => (
                      <tr key={c.id} onClick={() => setEditing(c.id)} className="cursor-pointer border-b border-navy-800 hover:bg-navy-800/60">
                        <td className="max-w-[22rem] px-3 py-2">
                          <button className="text-left text-ink-50 hover:underline" onClick={() => setEditing(c.id)}>
                            <span className="mr-1.5 text-ink-400">{c.number}.</span>
                            {c.title}
                          </button>
                          {!c.titleVerified && (
                            <span className="ml-2 align-middle">
                              <Badge tone="warn">{c.placeholder ? "placeholder" : "unverified"}</Badge>
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-ink-300">{PAPER_BY_ID[c.paperId]?.short}</td>
                        <td className="px-3 py-2">
                          <Badge tone={c.priority === "High" ? "warn" : "neutral"}>{c.priority}</Badge>
                        </td>
                        <td className="px-3 py-2 text-ink-300">{c.difficulty}</td>
                        <td className="px-3 py-2">
                          <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-ink-300">
                          {fmtShort(c.plannedStart)} – {fmtShort(c.plannedFinish)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 tabular-nums text-ink-300">
                          {chapterActualHours(tasks, c.id)} / {c.estHours}h
                        </td>
                        <td className="w-24 px-3 py-2">
                          <ProgressBar value={checkpointPct(c)} label="Checks completed" />
                        </td>
                        <td className="px-3 py-2 tabular-nums text-ink-300">{c.confidence ? `${c.confidence}/5` : "—"}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-ink-300">{nextRev(c)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {filtered.map((c) => (
                <button key={c.id} onClick={() => setEditing(c.id)} className="card block w-full p-3 text-left">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm text-ink-50">
                      <span className="mr-1 text-ink-400">{c.number}.</span>
                      {c.title}
                    </div>
                    <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <Badge>{PAPER_BY_ID[c.paperId]?.short}</Badge>
                    <Badge tone={c.priority === "High" ? "warn" : "neutral"}>{c.priority}</Badge>
                    <span className="text-ink-400">{c.difficulty}</span>
                    {!c.titleVerified && <Badge tone="warn">{c.placeholder ? "placeholder" : "unverified"}</Badge>}
                  </div>
                  <ProgressBar className="mt-2" value={checkpointPct(c)} label="Checks completed" />
                  <div className="mt-1.5 flex justify-between text-xs text-ink-400">
                    <span>
                      {fmtShort(c.plannedStart)} – {fmtShort(c.plannedFinish)}
                    </span>
                    <span>Next revision: {nextRev(c)}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <ChapterEditor chapterId={editing} onClose={() => setEditing(null)} />

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add chapter"
        footer={
          <>
            <button className="btn" onClick={() => setAddOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submitAdd} disabled={!newTitle.trim()}>
              Add chapter
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Paper">
            <select className="field" value={newPaper} onChange={(e) => setNewPaper(e.target.value)}>
              {PAPERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Chapter title">
            <input className="field" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submitAdd()} />
          </Field>
          <p className="text-xs text-ink-400">New chapters join the syllabus but not the planner. Use Settings → Rebuild plan to schedule them.</p>
        </div>
      </Modal>

      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title="Paste chapter titles"
        footer={
          <>
            <button className="btn" onClick={() => setBulkOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" onClick={submitBulk} disabled={!bulkText.trim()}>
              Add titles
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Paper">
            <select className="field" value={bulkPaper} onChange={(e) => setBulkPaper(e.target.value)}>
              {PAPERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="One title per line" hint="Added after the paper's existing chapters and marked as verified. Delete unwanted seeded rows first, then rebuild the plan in Settings.">
            <textarea className="field min-h-[160px]" value={bulkText} onChange={(e) => setBulkText(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
