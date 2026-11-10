"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useToday } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Command Center" },
  { href: "/planner", label: "Daily Planner" },
  { href: "/syllabus", label: "Syllabus" },
  { href: "/revision", label: "Revision" },
  { href: "/tests", label: "Tests" },
  { href: "/weekly", label: "Weekly Review" },
  { href: "/roadmap", label: "83-Day Roadmap" },
  { href: "/daily", label: "Today's Page" },
  { href: "/settings", label: "Settings & Data" },
];

const BOTTOM = [
  { href: "/", label: "Home" },
  { href: "/planner", label: "Planner" },
  { href: "/syllabus", label: "Syllabus" },
  { href: "/revision", label: "Revise" },
  { href: "/tests", label: "Tests" },
];

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

export default function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  const [mounted, setMounted] = useState(false);
  const [menu, setMenu] = useState(false);
  const today = useToday();
  const revisions = useStore((s) => s.revisions);

  useEffect(() => setMounted(true), []);
  useEffect(() => setMenu(false), [path]);

  const dueRevisions = mounted
    ? Object.values(revisions).filter((r) => {
        const next = !r.r1Done ? r.r1Date : !r.r2Done ? r.r2Date : !r.r3Done ? r.r3Date : "";
        return next && next <= today;
      }).length
    : 0;

  const href = (h: string) => (h === "/daily" ? `/daily/${today}` : h);

  return (
    <div className="min-h-screen bg-navy-900 text-ink-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-navy-700 bg-navy-950 lg:flex">
        <div className="border-b border-navy-700 px-5 py-4">
          <div className="text-lg font-bold text-ink-50">HSC-Science</div>
          <div className="text-xs text-ink-400">Syllabus Command Center</div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={href(n.href)}
              aria-current={isActive(path, n.href) ? "page" : undefined}
              className={cn(
                "flex items-center justify-between rounded-full px-4 py-2.5 text-[15px] transition-colors",
                isActive(path, n.href) ? "bg-navy-800 font-bold text-ink-50" : "text-ink-100 hover:bg-navy-800",
              )}
            >
              <span>{n.label}</span>
              {n.href === "/revision" && dueRevisions > 0 && (
                <span className="rounded bg-warn/15 px-1.5 text-xs text-warn">{dueRevisions}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-navy-700 px-5 py-3 text-xs text-ink-400">Saved automatically in this browser. Export a backup in Settings.</div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-navy-700 bg-black/80 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-sm font-semibold">HSC Science</div>
          </div>
          <button className="btn" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-controls="mobile-menu">
            {menu ? "Close" : "Menu"}
          </button>
        </div>
        {menu && (
          <nav id="mobile-menu" className="grid grid-cols-2 gap-1 border-t border-navy-700 p-3" aria-label="Main">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={href(n.href)}
                className={cn(
                  "rounded-full px-4 py-2.5 text-sm",
                  isActive(path, n.href) ? "bg-navy-800 font-bold text-ink-50" : "bg-navy-800 text-ink-200",
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <main className="px-4 pb-24 pt-5 sm:px-6 lg:ml-60 lg:pb-10 lg:pt-8">
        <div className="mx-auto max-w-6xl">
          {mounted ? children : <div className="py-20 text-center text-sm text-ink-400">Loading your workspace…</div>}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-navy-700 bg-black/80 backdrop-blur lg:hidden" aria-label="Quick navigation">
        {BOTTOM.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={isActive(path, n.href) ? "page" : undefined}
            className={cn("py-3 text-center text-xs", isActive(path, n.href) ? "font-bold text-ink-50" : "text-ink-400")}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
