"use client";

import { useMemo, useState } from "react";
import ChapterEditor from "@/components/ChapterEditor";
import { Badge, Card, Chips, Empty, Field, Modal, PageHeader } from "@/components/ui";
import { fmtShort } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { PAPER_BY_ID } from "@/lib/seed";
import { nextRevisionStage, revisionQueue, type RevisionRow } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type View = "today" | "upcoming" | "all" | "finished";

export default function RevisionPage() {
  const today = useToday();
  const chapters = useStore((s) => s.chapters);
  const revisions = useStore((s) => s.revisions);
  const markRevisionDone = useStore((s) => s.markRevisionDone);
  const undoRevision = useStore((s) => s.undoRevision);
  const updateRevision = useStore((s) => s.updateRevision);
  const ensureRevision = useStore((s) => s.ensureRevision);

  const [view, setView] = useState<View>("today");
  const [rating, setRating] = useState<{ chapterId: string; stage: 1 | 2 | 3 } | null>(null);
  const [conf, setConf] = useState(3);
  const [editChapter, setEditChapter] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const queue = useMemo(() => revisionQueue(revisions, chapters, today), [revisions, chapters, today]);
  const all = useMemo(
    () =>
      Object.values(revisions)
        .map((r) => ({ r, c: chapters.find((c) => c.id === r.chapterId) }))
        .filter((x): x is { r: (typeof revisions)[string]; c: (typeof chapters)[number] } => !!x.c)
        .sort((a, b) => a.r.firstStudyDate.localeCompare(b.r.firstStudyDate)),
    [revisions, chapters],
  );
  const noRevision = chapters.filter((c) => !revisions[c.id] && (c.status === "In Progress" || c.status === "Completed" || c.status === "Needs Revision"));

  function row(x: RevisionRow, showAction = true) {
    const r = x.revision;
    const late = x.daysLate > 0;
    return (
      <li key={x.chapter.id} className="rounded-md border border-navy-700 bg-navy-850 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <button className="text-left text-sm text-ink-50 hover:underline" onClick={() => setDetail(x.chapter.id)}>
              {x.chapter.title}
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              <Badge>{PAPER_BY_ID[x.chapter.paperId]?.short}</Badge>
              <Badge tone={late ? "bad" : x.date === today ? "warn" : "neutral"}>
                Revision {x.stage} · {fmtShort(x.date)}
                {late ? ` · ${x.daysLate}d late` : ""}
              </Badge>
              <span className="text-ink-400">Confidence {x.chapter.confidence || "unrated"}</span>
              {x.stage === 3 && <span className="text-ink-400">Do this as a mixed test</span>}
            </div>
            {r.previousMistakes && <p className="mt-1.5 text-xs text-ink-300">Previous mistakes: {r.previousMistakes}</p>}
          </div>
          {showAction && (
            <button
              className="btn-primary"
              onClick={() => {
                setConf(x.chapter.confidence || 3);
                setRating({ chapterId: x.chapter.id, stage: x.stage });
              }}
            >
              Mark done
            </button>
          )}
        </div>
      </li>
    );
  }

  const detailRev = detail ? revisions[detail] : undefined;
  const detailCh = detail ? chapters.find((c) => c.id === detail) : undefined;

  return (
    <>
      <PageHeader
        title="Revision Tracker"
        subtitle="Spaced review: difficult chapters come back the next day, then within a week, then in a mixed test about three weeks after first study."
      />
      <div className="mb-4">
        <Chips
          options={[
            { value: "today" as View, label: "Revise today", count: queue.due.length },
            { value: "upcoming" as View, label: "Upcoming", count: queue.upcoming.length },
            { value: "all" as View, label: "All items", count: all.length },
            { value: "finished" as View, label: "Finished", count: queue.finished },
          ]}
          value={view}
          onChange={setView}
          label="Revision views"
        />
      </div>

      {view === "today" &&
        (queue.due.length === 0 ? (
          <Empty
            title="Nothing to revise today"
            hint="A chapter enters this tracker when you complete its first Learn task or mark it completed. Chapters you studied before using the app can be added below."
          />
        ) : (
          <ul className="space-y-2">{queue.due.map((x) => row(x))}</ul>
        ))}
      {view === "upcoming" && (queue.upcoming.length === 0 ? <Empty title="No upcoming revisions" /> : <ul className="space-y-2">{queue.upcoming.map((x) => row(x, false))}</ul>)}
      {view === "finished" &&
        (queue.finished === 0 ? (
          <Empty title="No chapter has finished all three revisions yet" />
        ) : (
          <ul className="space-y-2">
            {all
              .filter((x) => !nextRevisionStage(x.r))
              .map((x) => (
                <li key={x.c.id} className="flex items-center justify-between rounded-md border border-navy-700 px-3 py-2 text-sm">
                  <span>{x.c.title}</span>
                  <span className="text-xs text-ink-400">Last done {fmtShort(x.r.r3Done)}</span>
                </li>
              ))}
          </ul>
        ))}
      {view === "all" &&
        (all.length === 0 ? (
          <Empty title="No revision items yet" />
        ) : (
          <>
            <Card pad={false} className="hidden overflow-hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="border-b border-navy-700 text-xs text-ink-400">
                    <tr>
                      <th className="px-3 py-2 font-medium">Chapter</th>
                      <th className="px-3 py-2 font-medium">Subject</th>
                      <th className="px-3 py-2 font-medium">First study</th>
                      <th className="px-3 py-2 font-medium">Revision 1</th>
                      <th className="px-3 py-2 font-medium">Revision 2</th>
                      <th className="px-3 py-2 font-medium">Revision 3</th>
                      <th className="px-3 py-2 font-medium">Conf.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {all.map(({ r, c }) => (
                      <tr key={c.id} className="cursor-pointer border-b border-navy-800 hover:bg-navy-800/60" onClick={() => setDetail(c.id)}>
                        <td className="max-w-[20rem] truncate px-3 py-2 text-ink-50">{c.title}</td>
                        <td className="px-3 py-2 text-ink-300">{PAPER_BY_ID[c.paperId]?.short}</td>
                        <td className="px-3 py-2 text-ink-300">{fmtShort(r.firstStudyDate)}</td>
                        {([1, 2, 3] as const).map((n) => {
                          const date = n === 1 ? r.r1Date : n === 2 ? r.r2Date : r.r3Date;
                          const doneOn = n === 1 ? r.r1Done : n === 2 ? r.r2Done : r.r3Done;
                          return (
                            <td key={n} className={cn("px-3 py-2", doneOn ? "text-mint-300" : date < today ? "text-danger" : "text-ink-300")}>
                              {doneOn ? `Done ${fmtShort(doneOn)}` : fmtShort(date)}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-ink-300">{c.confidence || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <ul className="space-y-2 md:hidden">
              {all.map(({ r, c }) => (
                <li key={c.id}>
                  <button className="card block w-full p-3 text-left" onClick={() => setDetail(c.id)}>
                    <div className="text-sm text-ink-50">{c.title}</div>
                    <div className="mt-1 text-xs text-ink-400">
                      {PAPER_BY_ID[c.paperId]?.short} · first study {fmtShort(r.firstStudyDate)} · R1 {r.r1Done ? "done" : fmtShort(r.r1Date)} · R2 {r.r2Done ? "done" : fmtShort(r.r2Date)} · R3 {r.r3Done ? "done" : fmtShort(r.r3Date)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ))}

      {noRevision.length > 0 && (
        <Card title="Studied before, no revision schedule yet" className="mt-6">
          <ul className="space-y-2">
            {noRevision.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-ink-100">{c.title}</span>
                <button className="btn" onClick={() => ensureRevision(c.id)}>
                  Start schedule from today
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={!!rating}
        onClose={() => setRating(null)}
        title="How well did you recall it?"
        footer={
          <>
            <button className="btn" onClick={() => setRating(null)}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                if (rating) markRevisionDone(rating.chapterId, rating.stage, conf);
                setRating(null);
              }}
            >
              Save revision
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-ink-300">Rate honestly, without looking at your notes. Ratings of 1 or 2 add the chapter to your weak list.</p>
        <div className="flex gap-2" role="radiogroup" aria-label="Confidence rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              role="radio"
              aria-checked={conf === n}
              onClick={() => setConf(n)}
              className={cn("h-11 flex-1 rounded-md border text-sm", conf === n ? "border-ink-50 bg-ink-50 font-semibold text-black" : "border-navy-700 text-ink-300 hover:bg-navy-800")}
            >
              {n}
            </button>
          ))}
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detailCh?.title ?? "Revision"} wide>
        {detailRev && detailCh && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {([1, 2, 3] as const).map((n) => {
                const date = n === 1 ? detailRev.r1Date : n === 2 ? detailRev.r2Date : detailRev.r3Date;
                const doneOn = n === 1 ? detailRev.r1Done : n === 2 ? detailRev.r2Done : detailRev.r3Done;
                return (
                  <div key={n} className="rounded-md border border-navy-700 p-3">
                    <div className="text-xs text-ink-400">Revision {n}</div>
                    <div className="mt-0.5 text-sm text-ink-50">{doneOn ? `Done ${fmtShort(doneOn)}` : `Due ${fmtShort(date)}`}</div>
                    {doneOn && (
                      <button className="btn-ghost mt-1 px-0 text-xs" onClick={() => undoRevision(detailCh.id, n)}>
                        Undo
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <Field label="Previous mistakes">
              <textarea className="field min-h-[72px]" value={detailRev.previousMistakes} onChange={(e) => updateRevision(detailCh.id, { previousMistakes: e.target.value })} />
            </Field>
            <Field label="Next action" hint="Example: redo the 10 hardest CQs, then draw the diagram from memory.">
              <input className="field" value={detailRev.nextAction} onChange={(e) => updateRevision(detailCh.id, { nextAction: e.target.value })} />
            </Field>
            <div className="flex justify-end">
              <button className="btn" onClick={() => { setDetail(null); setEditChapter(detailCh.id); }}>
                Open chapter
              </button>
            </div>
          </div>
        )}
      </Modal>
      <ChapterEditor chapterId={editChapter} onClose={() => setEditChapter(null)} />
    </>
  );
}
