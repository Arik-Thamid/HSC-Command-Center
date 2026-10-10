"use client";

import { useEffect, useState } from "react";
import { todayStr } from "./dates";

/** Local calendar date that refreshes at midnight and when the tab regains focus. */
export function useToday(): string {
  const [today, setToday] = useState<string>(() => todayStr());
  useEffect(() => {
    const update = () => setToday(todayStr());
    const id = window.setInterval(update, 60_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return today;
}

/** Reads a query-string value once after mount (avoids Suspense requirements of useSearchParams). */
export function useInitialParam(name: string): string | null {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    setValue(new URLSearchParams(window.location.search).get(name));
  }, [name]);
  return value;
}
