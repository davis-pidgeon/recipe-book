"use client";
import { useState, useTransition } from "react";
import { DAY_LABELS, isWeekend, mergeSlotsForDay } from "@/lib/plan/slots";
import SlotCell from "./SlotCell";
import AddSlotButton from "./AddSlotButton";
import RecipePickerSheet, { type RecipeOption } from "./RecipePickerSheet";
import { removeCustomSlot } from "@/lib/plan/actions";

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
  const [, startRemoveTransition] = useTransition();

  const byDay = (d: number) => mergeSlotsForDay(slots, d);

  function handleRemove(dayIndex: number, slotKey: string) {
    startRemoveTransition(async () => {
      await removeCustomSlot(weekStartKey, dayIndex, slotKey);
    });
  }
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-7" data-week={weekStartKey}>
        {DAY_LABELS.map((label, d) => (
          <div key={d} data-day={d}>
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
                  onRemove={s.isCustom ? () => handleRemove(s.dayIndex, s.slotKey) : undefined}
                />
              ))}
              <AddSlotButton weekStartKey={weekStartKey} dayIndex={d} />
            </div>
          </div>
        ))}
      </div>
      {openSlot && (
        <RecipePickerSheet
          key={`${openSlot.dayIndex}-${openSlot.slotKey}`}
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
