"use client";

import { useMemo, useState } from "react";
import TestEditor from "@/components/TestEditor";
import TrendChart from "@/components/TrendChart";
import { Badge, Card, Chips, Empty, PageHeader } from "@/components/ui";
import { fmtMinutes, fmtShort } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { PAPERS, PAPER_BY_ID } from "@/lib/seed";
import { testAccuracy } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import type { TestRecord } from "@/lib/types";
import { sum } from "@/lib/utils";

type View = "recent" | "lowest" | "upcoming" | "trend";

export default function TestsPage() {
  const today = useToday();
  const tests = useStore((s) => s.tests);
  const chapters = useStore((s) => s.chapters);
  const createFollowUp = useStore((s) => s.createFollowUp);
  const [view, setView] = useState<View>("recent");
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [trendPaper, setTrendPaper] = useState("all");

  const scored = useMemo(() => tests.filter((t) => t.marksObtained !== null).sort((a, b) => b.date.localeCompare(a.date)), [tests]);
  const upcoming = useMemo(() => tests.filter((t) => t.marksObtained === null).sort((a, b) => a.date.localeCompare(b.date)), [tests]);

  const chapterName = (t: TestRecord) => (t.chapterId ? chapters.find((c) => c.id === t.chapterId)?.title ?? "Chapter" : "Full paper");

  const lowest = useMemo(() => {
    const groups = new Map<string, { paperId: string; chapterId: string | null; accs: number[]; weak: string[] }>();
    for (const t of scored) {
      const key = `${t.paperId}|${t.chapterId ?? "full"}`;
      const g = groups.get(key) ?? { paperId: t.paperId, chapterId: t.chapterId, accs: [], weak: [] };
      g.accs.push(testAccuracy(t) ?? 0);
      if (t.weakTopics.trim()) g.weak.push(t.weakTopics.trim());
      groups.set(key, g);
    }
    return Array.from(groups.values())
      .map((g) => ({ ...g, avg: Math.round((sum(g.accs) / g.accs.length) * 10) / 10 }))
      .sort((a, b) => a.avg - b.avg);
  }, [scored]);

  const trend = useMemo(() => {
    const list = scored.filter((t) => trendPaper === "all" || t.paperId === trendPaper).slice().reverse();
    return list.map((t) => ({ label: fmtShort(t.date), value: testAccuracy(t) ?? 0 }));
  }, [scored, trendPaper]);

  const accTone = (a: number) => (a >= 75 ? "good" : a >= 60 ? "neutral" : a >= 40 ? "warn" : "bad");

  function testCard(t: TestRecord) {
    const acc = testAccuracy(t);
    return (
      <li key={t.id} className="rounded-md border border-navy-700 bg-navy-850 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <button className="min-w-0 text-left" onClick={() => setEditing(t.id)}>
            <div className="text-sm text-ink-50">
              {PAPER_BY_ID[t.paperId]?.short} · {chapterName(t)}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              <Badge>{t.type}</Badge>
              <span className="text-ink-400">{fmtShort(t.date)}</span>
              {t.timeTakenMin > 0 && <span className="text-ink-400">{fmtMinutes(t.timeTakenMin)}</span>}
            </div>
          </button>
          <div className="flex items-center gap-2">
            {acc !== null ? (
              <Badge tone={accTone(acc)}>
                {t.marksObtained}/{t.totalMarks} · {acc}%
              </Badge>
            ) : (
              <Badge tone={t.date < today ? "warn" : "neutral"}>{t.date < today ? "Needs scoring" : `Out of ${t.totalMarks}`}</Badge>
            )}
            <button className="btn" onClick={() => setEditing(t.id)}>
              {acc === null ? "Log result" : "Edit"}
            </button>
          </div>
        </div>
        {(t.mistakes || t.weakTopics) && (
          <div className="mt-2 space-y-0.5 text-xs text-ink-300">
            {t.weakTopics && <div>Weak topics: {t.weakTopics}</div>}
            {t.mistakes && <div>Mistakes: {t.mistakes}</div>}
          </div>
        )}
        {acc !== null && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {t.followUp ? <span className="text-ink-300">Follow-up: {t.followUp}</span> : <span className="text-ink-400">No follow-up yet</span>}
            <button className="btn-ghost text-xs" onClick={() => createFollowUp(t.id)}>
              Create follow-up task
            </button>
          </div>
        )}
      </li>
    );
  }

  const avgAll = scored.length ? Math.round((sum(scored.map((t) => testAccuracy(t) ?? 0)) / scored.length) * 10) / 10 : null;
  const firstThird = trend.slice(0, Math.max(1, Math.floor(trend.length / 2)));
  const lastHalf = trend.slice(Math.floor(trend.length / 2));
  const delta = trend.length >= 4 ? Math.round((sum(lastHalf.map((p) => p.value)) / lastHalf.length - sum(firstThird.map((p) => p.value)) / firstThird.length) * 10) / 10 : null;

  return (
    <>
      <PageHeader
        title="Practice & Mock Tests"
        subtitle="Log every test. Weekly tests and model tests are pre-scheduled; open one and enter your marks when you finish."
        actions={
          <button className="btn-primary" onClick={() => setAdding(true)}>
            Log a test
          </button>
        }
      />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-400">Tests completed</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{scored.length}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-400">Average accuracy</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{avgAll === null ? "—" : `${avgAll}%`}</div>
        </div>
        <div className="card px-4 py-3">
          <div className="text-xs text-ink-400">Upcoming</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{upcoming.filter((t) => t.date >= today).length}</div>
        </div>
      </div>

      <div className="mb-4">
        <Chips
          options={[
            { value: "recent" as View, label: "Recent tests", count: scored.length },
            { value: "lowest" as View, label: "Lowest-scoring topics" },
            { value: "upcoming" as View, label: "Upcoming", count: upcoming.length },
            { value: "trend" as View, label: "Improvement" },
          ]}
          value={view}
          onChange={setView}
          label="Test views"
        />
      </div>

      {view === "recent" && (scored.length === 0 ? <Empty title="No scored tests yet" hint="Open an upcoming test or log a new one." /> : <ul className="space-y-2">{scored.slice(0, 40).map(testCard)}</ul>)}

      {view === "upcoming" && (upcoming.length === 0 ? <Empty title="No upcoming tests" /> : <ul className="space-y-2">{upcoming.map(testCard)}</ul>)}

      {view === "lowest" &&
        (lowest.length === 0 ? (
          <Empty title="Nothing to rank yet" hint="Topics appear here once you have scored tests." />
        ) : (
          <Card pad={false}>
            <ul className="divide-y divide-navy-800">
              {lowest.slice(0, 20).map((g) => (
                <li key={`${g.paperId}${g.chapterId}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm text-ink-50">
                      {g.chapterId ? chapters.find((c) => c.id === g.chapterId)?.title ?? "Chapter" : "Full paper"}
                    </div>
                    <div className="text-xs text-ink-400">
                      {PAPER_BY_ID[g.paperId]?.short} · {g.accs.length} {g.accs.length === 1 ? "test" : "tests"}
                      {g.weak.length ? ` · ${g.weak[g.weak.length - 1]}` : ""}
                    </div>
                  </div>
                  <Badge tone={accTone(g.avg)}>{g.avg}% average</Badge>
                </li>
              ))}
            </ul>
          </Card>
        ))}

      {view === "trend" && (
        <Card
          title="Accuracy over time"
          action={
            <select className="field w-auto py-1 text-xs" value={trendPaper} onChange={(e) => setTrendPaper(e.target.value)} aria-label="Filter by paper">
              <option value="all">All papers</option>
              {PAPERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.short}
                </option>
              ))}
            </select>
          }
        >
          {trend.length === 0 ? (
            <Empty title="No scored tests for this selection" />
          ) : (
            <>
              <TrendChart points={trend} title="Test accuracy percentage by date" />
              <p className="mt-2 text-xs text-ink-400">
                The dashed line marks 60%.{" "}
                {delta === null ? "Log at least four tests to see the change over time." : delta >= 0 ? `Second half averages ${delta} points higher than the first half.` : `Second half averages ${Math.abs(delta)} points lower than the first half.`}
              </p>
            </>
          )}
        </Card>
      )}

      <TestEditor open={adding || editing !== null} onClose={() => { setAdding(false); setEditing(null); }} testId={editing} defaultDate={today} />
    </>
  );
}
