"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

/** Text input that keeps local state and saves to the store after a short pause, on blur and on unmount. */
export default function SavedField({ value, onSave, multiline, rows = 3, placeholder, ariaLabel, className }: Props) {
  const [v, setV] = useState(value);
  const lastSaved = useRef(value);
  const latest = useRef(value);
  const timer = useRef<number | null>(null);
  const saveRef = useRef(onSave);
  saveRef.current = onSave;

  useEffect(() => {
    if (value !== lastSaved.current) {
      lastSaved.current = value;
      latest.current = value;
      setV(value);
    }
  }, [value]);

  const flush = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (latest.current !== lastSaved.current) {
      lastSaved.current = latest.current;
      saveRef.current(latest.current);
    }
  };

  useEffect(() => () => flush(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (next: string) => {
    setV(next);
    latest.current = next;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 600);
  };

  const cls = `field ${className ?? ""}`;
  return multiline ? (
    <textarea className={cls} rows={rows} value={v} placeholder={placeholder} aria-label={ariaLabel} onChange={(e) => change(e.target.value)} onBlur={flush} />
  ) : (
    <input className={cls} value={v} placeholder={placeholder} aria-label={ariaLabel} onChange={(e) => change(e.target.value)} onBlur={flush} />
  );
}
