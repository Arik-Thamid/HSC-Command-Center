"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useToday } from "@/lib/hooks";

export default function DailyIndex() {
  const router = useRouter();
  const today = useToday();
  useEffect(() => {
    router.replace(`/daily/${today}`);
  }, [router, today]);
  return <p className="py-10 text-center text-sm text-ink-400">Opening today&apos;s page…</p>;
}
