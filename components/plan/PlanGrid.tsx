"use client";
import { useState } from "react";
import { DAY_LABELS, defaultSlotsForDay, isWeekend } from "@/lib/plan/slots";
import SlotCell from "./SlotCell";
import RecipePickerSheet, { type RecipeOption } from "./RecipePickerSheet";

type Slot = {
  dayIndex: number;
  slotKey: string;
  label: string;
  sortOrder: number;
  note: string | null;
  recipe: { id: string; title: string } | null;
};

type OpenSlot = {
  dayIndex: number;
  slotKey: string;
  label: string;
  sortOrder: number;
  note: string | null;
};

export default function PlanGrid({
  weekStartKey,
  slots,
  recipes,
}: {
  weekStartKey: string;
  slots: Slot[];
  recipes: RecipeOption[];
}) {
  const [openSlot, setOpenSlot] = useState<OpenSlot | null>(null);

  const byDay = (d: number) => {
    const stored = slots.filter((s) => s.dayIndex === d);
    const defaults = defaultSlotsForDay(d).map((def) => {
      const hit = stored.find((s) => s.slotKey === def.slotKey);
      return hit ?? { dayIndex: d, ...def, note: null, recipe: null };
    });
    const customs = stored.filter((s) => !defaultSlotsForDay(d).some((def) => def.slotKey === s.slotKey));
    return [...defaults, ...customs].sort((a, b) => a.sortOrder - b.sortOrder);
  };
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-7" data-week={weekStartKey}>
        {DAY_LABELS.map((label, d) => (
          <div key={d}>
            <p className={`text-center text-sm font-bold ${isWeekend(d) ? "text-canyon" : "text-ink"}`}>{label}</p>
            <div className="mt-2 flex flex-col gap-2">
              {byDay(d).map((s) => (
                <SlotCell
                  key={s.slotKey}
                  slot={s}
                  onOpen={() =>
                    setOpenSlot({
                      dayIndex: s.dayIndex,
                      slotKey: s.slotKey,
                      label: s.label,
                      sortOrder: s.sortOrder,
                      note: s.note,
                    })
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {openSlot && (
        <RecipePickerSheet
          weekStartKey={weekStartKey}
          dayIndex={openSlot.dayIndex}
          slotKey={openSlot.slotKey}
          label={openSlot.label}
          sortOrder={openSlot.sortOrder}
          initialNote={openSlot.note}
          recipes={recipes}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </>
  );
}
