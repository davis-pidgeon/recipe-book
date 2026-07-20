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
