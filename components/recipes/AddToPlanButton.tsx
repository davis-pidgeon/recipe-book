"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { setSlotRecipe } from "@/lib/plan/actions";
import { mondayOf, weekKey, addWeeks, formatWeekRange } from "@/lib/plan/week";
import { defaultSlotsForDay, DAY_LABELS } from "@/lib/plan/slots";

function todayDayIndex(): number {
  // Mon=0 .. Sun=6, from UTC to match mondayOf's UTC basis
  return (new Date().getUTCDay() + 6) % 7;
}

export default function AddToPlanButton({
  recipeId,
  recipeTitle,
}: {
  recipeId: string;
  recipeTitle?: string;
}) {
  const [open, setOpen] = useState(false);
  const [monday, setMonday] = useState<Date>(() => mondayOf(new Date()));
  const [dayIndex, setDayIndex] = useState<number>(() => todayDayIndex());
  const [slotKey, setSlotKey] = useState<string>(() => defaultSlotsForDay(todayDayIndex())[0].slotKey);
  const [isPending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const slotOptions = useMemo(() => defaultSlotsForDay(dayIndex), [dayIndex]);
  const selectedSlot = slotOptions.find((s) => s.slotKey === slotKey) ?? slotOptions[0];

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!confirmation) return;
    const t = setTimeout(() => setConfirmation(null), 4000);
    return () => clearTimeout(t);
  }, [confirmation]);

  function handleDayChange(newDayIndex: number) {
    setDayIndex(newDayIndex);
    const opts = defaultSlotsForDay(newDayIndex);
    setSlotKey(opts[0].slotKey);
  }

  function handleConfirm() {
    if (!selectedSlot) return;
    startTransition(async () => {
      await setSlotRecipe(
        weekKey(monday),
        dayIndex,
        selectedSlot.slotKey,
        selectedSlot.label,
        selectedSlot.sortOrder,
        recipeId,
        1,
      );
      setOpen(false);
      setConfirmation(
        `Added ${recipeTitle ?? "recipe"} to ${DAY_LABELS[dayIndex]} ${selectedSlot.label}`,
      );
    });
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border-2 border-buttercream px-3 py-1 font-bold text-canyon"
        >
          Add to plan
        </button>
        {confirmation && (
          <p role="status" className="mt-1 text-xs text-olive">
            {confirmation}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Add to plan"
      className="mt-3 w-full max-w-sm rounded-2xl border-2 border-buttercream bg-cream p-4 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl text-canyon">Add to plan</h2>
        <button
          ref={closeRef}
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="rounded-full border-2 border-buttercream px-3 py-1"
        >
          Close
        </button>
      </div>

      <div className="mt-3">
        <p className="text-sm font-bold">Week</p>
        <div className="mt-1 flex items-center gap-3">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setMonday((m) => addWeeks(m, -1))}
            className="rounded-full border-2 border-buttercream px-3 py-1"
          >
            ‹
          </button>
          <span className="font-bold">{formatWeekRange(monday)}</span>
          <button
            type="button"
            aria-label="Next week"
            onClick={() => setMonday((m) => addWeeks(m, 1))}
            className="rounded-full border-2 border-buttercream px-3 py-1"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="add-to-plan-day" className="text-sm font-bold">
          Day
        </label>
        <select
          id="add-to-plan-day"
          value={dayIndex}
          onChange={(e) => handleDayChange(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border-2 border-buttercream p-2"
        >
          {DAY_LABELS.map((label, i) => (
            <option key={i} value={i}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3">
        <label htmlFor="add-to-plan-slot" className="text-sm font-bold">
          Slot
        </label>
        <select
          id="add-to-plan-slot"
          value={selectedSlot?.slotKey ?? ""}
          onChange={(e) => setSlotKey(e.target.value)}
          className="mt-1 w-full rounded-lg border-2 border-buttercream p-2"
        >
          {slotOptions.map((s) => (
            <option key={s.slotKey} value={s.slotKey}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        disabled={isPending || !selectedSlot}
        onClick={handleConfirm}
        className="mt-4 rounded-full bg-canyon px-4 py-2 font-bold text-white disabled:opacity-50"
      >
        {isPending ? "Adding…" : "Add to plan"}
      </button>
    </div>
  );
}
