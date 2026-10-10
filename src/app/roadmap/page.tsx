"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, Chips, PageHeader } from "@/components/ui";
import { dayName, diffDays, fmtMinutes, fmtShort } from "@/lib/dates";
import { useToday } from "@/lib/hooks";
import { PAPERS, PAPER_BY_ID } from "@/lib/seed";
import { analyzeLoad } from "@/lib/scheduler";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function RoadmapPage() {
  const today = useToday();
  const tasks = useStore((s) => s.tasks);
  const chapters = useStore((s) => s.chapters);
  const settings = useStore((s) => s.settings);
  const report = useStore((s) => s.planReport);
  const [paper, setPaper] = useState("all");

  const load = useMemo(() => analyzeLoad(tasks, settings), [tasks, settings]);
  const high = load.filter((l) => l.level === "high");
  const medium = load.filter((l) => l.level === "medium");
  const maxMin = Math.max(1, ...load.map((l) => l.plannedMin));
  const list = useMemo(
    () => chapters.filter((c) => (paper === "all" || c.paperId === paper)).sort((a, b) => (a.plannedStart || "9").localeCompare(b.plannedStart || "9") || a.number - b.number),
    [chapters, paper],
  );
  const unscheduled = chapters.filter((c) => c.status !== "Completed" && !c.plannedStart);

  const verdictText =
    report?.verdict === "overloaded"
      ? "Overloaded: the estimated study time for the syllabus is more than the plan can hold, so every chapter is compressed."
      : report?.verdict === "tight"
        ? "Tight: the plan fits, but with almost no slack."
        : "Workable: estimated study time fits inside the plan.";

  return (
    <>
      <PageHeader
        title="83-Day Roadmap"
        subtitle={`${fmtShort(settings.startDate)} – ${fmtShort(settings.endDate)} · ${load.length} days. Study days cover chapters, rest days hold the weekly review, and the last ${settings.auditDays} days are for auditing, weak chapters and mixed practice.`}
        actions={
          <Link href="/settings" className="btn">
            Rebuild plan
          </Link>
        }
      />

      {report && (
        <div
          className={cn(
            "mb-5 rounded-lg border px-4 py-3 text-sm",
            report.verdict === "overloaded" && "border-danger/40 bg-danger/10 text-danger",
            report.verdict === "tight" && "border-warn/40 bg-warn/10 text-warn",
            report.verdict === "ok" && "border-mint-600/40 bg-mint-600/10 text-mint-300",
          )}
        >
          <div className="font-medium">{verdictText}</div>
          <div className="mt-1 opacity-90">
            Chapter estimates total {report.requiredHours}h; the plan has {report.availableHours}h across {report.studyDays} study days. These are your estimates, so edit hours per chapter in the Syllabus tab, or raise daily hours in Settings, then rebuild.
          </div>
        </div>
      )}

      {report && (
        <Card title="Workload by subject group" className="mb-5" pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-navy-700 text-xs text-ink-400">
                <tr>
                  <th className="px-4 py-2 font-medium">Group</th>
                  <th className="px-4 py-2 font-medium">Chapters</th>
                  <th className="px-4 py-2 font-medium">Needed</th>
                  <th className="px-4 py-2 font-medium">Planned</th>
                  <th className="px-4 py-2 font-medium">Time per chapter vs estimate</th>
                </tr>
              </thead>
              <tbody>
                {report.tracks.map((t) => (
                  <tr key={t.track} className="border-b border-navy-800">
                    <td className="px-4 py-2 text-ink-100">{t.label}</td>
                    <td className="px-4 py-2 tabular-nums text-ink-300">{t.chapters}</td>
                    <td className="px-4 py-2 tabular-nums text-ink-300">{t.requiredHours}h</td>
                    <td className="px-4 py-2 tabular-nums text-ink-300">{t.availableHours}h</td>
                    <td className="px-4 py-2">
                      <Badge tone={t.scale >= 0.95 ? "good" : t.scale >= 0.75 ? "warn" : "bad"}>{Math.round(t.scale * 100)}%</Badge>
                      {t.overflowChapters.length > 0 && <span className="ml-2 text-xs text-danger">{t.overflowChapters.length} did not fit</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Day-by-day load" className="mb-5">
        <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-ink-300">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-mint-500" /> Normal</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-warn" /> Heavy (3+ hard chapters)</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-danger" /> High risk</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink-500" /> Review / audit day</span>
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(14,minmax(0,1fr))]">
          {load.map((l, i) => {
            const color = l.phase !== "study" ? "bg-ink-500" : l.level === "high" ? "bg-danger" : l.level === "medium" ? "bg-warn" : "bg-mint-500";
            return (
              <Link
                key={l.date}
                href={`/daily/${l.date}`}
                title={`Day ${i + 1} · ${dayName(l.date)} ${fmtShort(l.date)} · ${fmtMinutes(l.plannedMin)}${l.reasons.length ? " · " + l.reasons.join("; ") : ""}`}
                aria-label={`Day ${i + 1}, ${fmtShort(l.date)}, ${fmtMinutes(l.plannedMin)} planned, ${l.level} load`}
                className={cn("flex flex-col justify-end rounded-sm border border-navy-700 p-1 hover:border-ink-300", l.date === today && "ring-2 ring-ink-50")}
                style={{ height: 52 }}
              >
                <div className={cn("w-full rounded-sm", color)} style={{ height: `${Math.max(12, (l.plannedMin / maxMin) * 70)}%` }} />
                <div className="mt-0.5 text-center text-[10px] leading-none text-ink-400">{i + 1}</div>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card title={`Highest-risk days (${high.length} high, ${medium.length} heavy)`} className="mb-5">
        {high.length === 0 && medium.length === 0 ? (
          <p className="text-sm text-ink-300">No day stacks several hard chapters.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {[...high, ...medium].slice(0, 20).map((l) => (
              <li key={l.date} className="flex flex-wrap items-center justify-between gap-2">
                <Link href={`/daily/${l.date}`} className="text-ink-100 hover:underline">
                  Day {diffDays(settings.startDate, l.date) + 1} · {dayName(l.date)} {fmtShort(l.date)}
                </Link>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-ink-400">{l.reasons.join("; ")}</span>
                  <Badge tone={l.level === "high" ? "bad" : "warn"}>{l.level === "high" ? "High" : "Heavy"}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-400">Plan lighter practice or protect extra time on these days, and avoid scheduling other commitments around them.</p>
      </Card>

      <Card title="Chapter schedule">
        <div className="mb-3">
          <Chips options={[{ value: "all", label: "All papers" }, ...PAPERS.map((p) => ({ value: p.id, label: p.short }))]} value={paper} onChange={setPaper} label="Filter schedule by paper" />
        </div>
        {unscheduled.length > 0 && <p className="mb-3 text-sm text-warn">{unscheduled.length} unfinished chapters have no planned dates. Rebuild the plan in Settings to schedule them.</p>}
        <ul className="divide-y divide-navy-800">
          {list.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div className="min-w-0">
                <div className="truncate text-ink-100">{c.title}</div>
                <div className="text-xs text-ink-400">
                  {PAPER_BY_ID[c.paperId]?.short} · {c.difficulty} · {c.estHours}h estimated
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ink-300">
                  {fmtShort(c.plannedStart)} – {fmtShort(c.plannedFinish)}
                </span>
                <Badge tone={c.status === "Completed" ? "good" : c.status === "Not Started" ? "neutral" : "info"}>{c.status}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
