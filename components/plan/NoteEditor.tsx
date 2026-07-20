"use client";
import { useState, useTransition } from "react";
import { setSlotNote, clearSlot } from "@/lib/plan/actions";

export type NoteEditorProps = {
  weekStartKey: string;
  dayIndex: number;
  slotKey: string;
  label: string;
  sortOrder: number;
  initialNote: string;
  onClose: () => void;
};

export default function NoteEditor({
  weekStartKey,
  dayIndex,
  slotKey,
  label,
  sortOrder,
  initialNote,
  onClose,
}: NoteEditorProps) {
  const [note, setNote] = useState(initialNote);
  const [isPending, startTransition] = useTransition();

  function save() {
    const trimmed = note.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await setSlotNote(weekStartKey, dayIndex, slotKey, label, sortOrder, trimmed);
      onClose();
    });
  }

  function clear() {
    startTransition(async () => {
      await clearSlot(weekStartKey, dayIndex, slotKey);
      onClose();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-bold" htmlFor="slot-note">
          Note
        </label>
        <input
          id="slot-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Leftovers"
          className="w-full rounded-lg border-2 border-buttercream p-2"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={isPending || !note.trim()}
          className="rounded-full bg-canyon px-4 py-2 font-bold text-white disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={clear}
          disabled={isPending}
          className="rounded-full border-2 border-buttercream px-4 py-2 font-bold disabled:opacity-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
