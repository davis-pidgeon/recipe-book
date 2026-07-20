"use client";
import { useId, useState, useTransition } from "react";
import { addCustomSlot } from "@/lib/plan/actions";

export type AddSlotButtonProps = {
  weekStartKey: string;
  dayIndex: number;
};

export default function AddSlotButton({ weekStartKey, dayIndex }: AddSlotButtonProps) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  function reset() {
    setAdding(false);
    setLabel("");
  }

  function submit() {
    const trimmed = label.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addCustomSlot(weekStartKey, dayIndex, trimmed);
      reset();
    });
  }

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="mt-1 w-full rounded-lg border-2 border-dashed border-buttercream px-2 py-1 text-left text-sm text-ink/50"
      >
        + Add a slot
      </button>
    );
  }

  return (
    <div className="mt-1 flex flex-col gap-1 rounded-lg border-2 border-buttercream p-2">
      <label htmlFor={inputId} className="text-[10px] uppercase text-ink/50">
        Slot name
      </label>
      <input
        id={inputId}
        autoFocus
        value={label}
        disabled={isPending}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            reset();
          }
        }}
        placeholder="Slot name"
        className="w-full rounded-lg border-2 border-buttercream p-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !label.trim()}
          className="rounded-full bg-olive px-3 py-1 text-sm font-bold text-white disabled:opacity-50"
        >
          Add
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={isPending}
          className="rounded-full border-2 border-buttercream px-3 py-1 text-sm disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
