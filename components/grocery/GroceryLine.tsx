"use client";
import { useEffect, useState, useTransition } from "react";
import { toggleLineChecked, toggleLinePantry } from "@/lib/grocery/actions";
import type { GroceryLine as GroceryLineType } from "@/lib/grocery/build";

export default function GroceryLine({
  weekStartKey,
  line,
}: {
  weekStartKey: string;
  line: GroceryLineType;
}) {
  const [checked, setChecked] = useState(line.checked);
  const [isPending, startTransition] = useTransition();

  // Server data is authoritative after a revalidation/reload — re-sync if it changes.
  useEffect(() => {
    setChecked(line.checked);
  }, [line.checked]);

  function handleCheckedChange(next: boolean) {
    setChecked(next); // optimistic — flip immediately, persist in the background
    startTransition(async () => {
      await toggleLineChecked(weekStartKey, line.lineKey, next);
    });
  }

  function handlePantryToggle() {
    startTransition(async () => {
      await toggleLinePantry(weekStartKey, line.lineKey, true);
    });
  }

  return (
    <div className="flex items-center gap-3 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => handleCheckedChange(e.target.checked)}
        aria-label={line.display}
        className="h-5 w-5 rounded border-2 border-buttercream accent-canyon"
      />
      <span className={`flex-1 ${checked ? "text-ink/50 line-through" : "text-ink"}`}>
        {line.display}
      </span>
      <button
        type="button"
        onClick={handlePantryToggle}
        disabled={isPending}
        className="rounded-full border-2 border-buttercream px-2 py-0.5 text-xs font-bold text-olive disabled:opacity-50"
      >
        Move to pantry
      </button>
    </div>
  );
}
