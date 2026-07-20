"use client";
import Link from "next/link";
import { addWeeks, formatWeekRange, parseWeekKey, weekKey } from "@/lib/plan/week";

export default function WeekNav({ weekStartKey }: { weekStartKey: string }) {
  const monday = parseWeekKey(weekStartKey);
  const prev = weekKey(addWeeks(monday, -1));
  const next = weekKey(addWeeks(monday, 1));
  return (
    <div className="flex items-center gap-4">
      <Link href={`/plan?week=${prev}`} aria-label="Previous week" className="rounded-full border-2 border-buttercream px-3 py-1">
        ‹
      </Link>
      <span className="font-bold">{formatWeekRange(monday)}</span>
      <Link href={`/plan?week=${next}`} aria-label="Next week" className="rounded-full border-2 border-buttercream px-3 py-1">
        ›
      </Link>
    </div>
  );
}
