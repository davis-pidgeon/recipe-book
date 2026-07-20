import { expect, test } from "vitest";
import { defaultSlotsForDay, isWeekend } from "./slots";

test("weekend detection", () => {
  expect([0,1,2,3].map(isWeekend)).toEqual([false,false,false,false]);
  expect([4,5,6].map(isWeekend)).toEqual([true,true,true]);
});

test("work day has 4 slots incl. two lunches", () => {
  const keys = defaultSlotsForDay(0).map((s) => s.slotKey);
  expect(keys).toEqual(["breakfast","lunch-courtney","lunch-davis","dinner"]);
});

test("weekend day has 3 slots", () => {
  const keys = defaultSlotsForDay(5).map((s) => s.slotKey);
  expect(keys).toEqual(["breakfast","lunch","dinner"]);
});
