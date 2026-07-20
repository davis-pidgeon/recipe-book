export type SlotDef = { slotKey: string; label: string; sortOrder: number };

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function isWeekend(dayIndex: number): boolean {
  return dayIndex >= 4;
}

const WORK: SlotDef[] = [
  { slotKey: "breakfast", label: "Breakfast", sortOrder: 0 },
  { slotKey: "lunch-courtney", label: "Lunch (Courtney)", sortOrder: 1 },
  { slotKey: "lunch-davis", label: "Lunch (Davis)", sortOrder: 2 },
  { slotKey: "dinner", label: "Dinner", sortOrder: 3 },
];

const WEEKEND: SlotDef[] = [
  { slotKey: "breakfast", label: "Breakfast", sortOrder: 0 },
  { slotKey: "lunch", label: "Lunch", sortOrder: 1 },
  { slotKey: "dinner", label: "Dinner", sortOrder: 2 },
];

export function defaultSlotsForDay(dayIndex: number): SlotDef[] {
  return isWeekend(dayIndex) ? WEEKEND : WORK;
}

export type StoredSlot = {
  dayIndex: number;
  slotKey: string;
  label: string;
  sortOrder: number;
  note: string | null;
  recipe: { id: string; title: string } | null;
  scale: number;
};

export type MergedSlot = StoredSlot & { isCustom: boolean };

export type EmptyCoord = {
  dayIndex: number;
  slotKey: string;
  label: string;
  sortOrder: number;
};

// Single source of truth for merging saved PlanSlot rows with the default
// slot layout for a given day. Both PlanGrid (rendering) and computeEmptyCoords
// (the Surprise-me feature) build on this so they can never disagree about
// what counts as "the grid for this day".
export function mergeSlotsForDay(stored: StoredSlot[], dayIndex: number): MergedSlot[] {
  const dayStored = stored.filter((s) => s.dayIndex === dayIndex);
  const defaultKeys = new Set(defaultSlotsForDay(dayIndex).map((def) => def.slotKey));
  const defaults = defaultSlotsForDay(dayIndex).map((def) => {
    const hit = dayStored.find((s) => s.slotKey === def.slotKey);
    return hit
      ? { ...hit, isCustom: false }
      : { dayIndex, ...def, note: null, recipe: null, scale: 1, isCustom: false };
  });
  const customs = dayStored
    .filter((s) => !defaultKeys.has(s.slotKey))
    .map((s) => ({ ...s, isCustom: true }));
  return [...defaults, ...customs].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function isSlotEmpty(s: { recipe: { id: string } | null; note: string | null }): boolean {
  return s.recipe == null && (!s.note || s.note.trim() === "");
}

// Empty default+custom slot coordinates across all 7 days, in the same shape
// surpriseFill expects. Built from the same merge as the grid so the button
// can never target a slot the user is actually looking at as "filled".
export function computeEmptyCoords(stored: StoredSlot[]): EmptyCoord[] {
  const coords: EmptyCoord[] = [];
  for (let d = 0; d < 7; d++) {
    for (const s of mergeSlotsForDay(stored, d)) {
      if (isSlotEmpty(s)) {
        coords.push({ dayIndex: s.dayIndex, slotKey: s.slotKey, label: s.label, sortOrder: s.sortOrder });
      }
    }
  }
  return coords;
}
