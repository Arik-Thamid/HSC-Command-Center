"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink-50 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-300">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, action, children, className, pad = true }: { title?: string; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cn("card", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-navy-700 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-ink-100">{title}</h2>}
          {action}
        </header>
      )}
      <div className={cn(pad && "p-4")}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="card px-4 py-3">
      <div className="text-xs text-ink-400">{label}</div>
      <div
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums",
          tone === "good" && "text-mint-400",
          tone === "warn" && "text-warn",
          tone === "bad" && "text-danger",
          !tone && "text-ink-50",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-ink-400">{hint}</div>}
    </div>
  );
}

export function ProgressBar({ value, tone = "mint", className, label }: { value: number; tone?: "mint" | "warn" | "bad" | "ink"; className?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-navy-700", className)}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn(
          "h-full rounded-full",
          tone === "mint" && "bg-ink-50",
          tone === "warn" && "bg-warn",
          tone === "bad" && "bg-danger",
          tone === "ink" && "bg-ink-400",
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

const BADGE: Record<string, string> = {
  neutral: "border-navy-700 bg-transparent text-ink-300",
  good: "border-mint-600/50 bg-navy-800 font-bold text-ink-50",
  warn: "border-warn/40 bg-warn/10 text-warn",
  bad: "border-danger/40 bg-danger/10 text-danger",
  info: "border-ink-500/50 bg-ink-500/10 text-ink-200",
};

export function Badge({ children, tone = "neutral", title }: { children: ReactNode; tone?: keyof typeof BADGE; title?: string }) {
  return (
    <span title={title} className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-1.5 py-0.5 text-xs", BADGE[tone])}>
      {children}
    </span>
  );
}

export function statusTone(s: string): keyof typeof BADGE {
  switch (s) {
    case "Completed":
      return "good";
    case "In Progress":
      return "info";
    case "Needs Revision":
    case "Skipped":
      return "warn";
    default:
      return "neutral";
  }
}

export function Chips<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
            o.value === value ? "border-ink-50 bg-ink-50 font-semibold text-black" : "border-navy-700 bg-black text-ink-300 hover:bg-navy-800",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 text-xs text-ink-400">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-navy-600 px-4 py-8 text-center">
      <p className="text-sm font-medium text-ink-200">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-ink-400">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium text-ink-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export function Check({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2 text-sm text-ink-100", disabled && "cursor-not-allowed opacity-60")}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-navy-600 bg-navy-950 accent-white"
      />
      {label}
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-500/40" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-navy-700 bg-black shadow-2xl focus:outline-none sm:rounded-2xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-xl",
        )}
      >
        <header className="flex items-center justify-between gap-3 border-b border-navy-700 px-4 py-3">
          <h2 className="text-base font-semibold text-ink-50">{title}</h2>
          <button onClick={onClose} className="btn-ghost" aria-label="Close dialog">
            Close
          </button>
        </header>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-navy-700 px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}
