import { expect, test } from "vitest";
import { addWeeks, formatWeekRange, mondayOf, parseWeekKey, weekKey } from "./week";

test("mondayOf returns Monday for a mid-week date", () => {
  // 2026-07-22 is a Wednesday → Monday 2026-07-20
  expect(weekKey(mondayOf(new Date("2026-07-22T12:00:00Z")))).toBe("2026-07-20");
});

test("mondayOf on a Sunday returns that week's Monday", () => {
  // 2026-07-26 is Sunday → Monday 2026-07-20
  expect(weekKey(mondayOf(new Date("2026-07-26T00:00:00Z")))).toBe("2026-07-20");
});

test("weekKey/parseWeekKey round-trip", () => {
  const m = parseWeekKey("2026-07-20");
  expect(weekKey(m)).toBe("2026-07-20");
});

test("parseWeekKey invalid falls back to this week's Monday", () => {
  const m = parseWeekKey("not-a-date");
  // result is a Monday
  expect(m.getUTCDay()).toBe(1);
});

test("parseWeekKey rejects calendar-invalid dates (month 13)", () => {
  const invalid = parseWeekKey("2026-13-01");
  const fallback = mondayOf(new Date());
  expect(weekKey(invalid)).toBe(weekKey(fallback));
});

test("parseWeekKey rejects calendar-invalid dates (day 0)", () => {
  const invalid = parseWeekKey("2026-07-00");
  const fallback = mondayOf(new Date());
  expect(weekKey(invalid)).toBe(weekKey(fallback));
});

test("addWeeks moves by 7-day multiples", () => {
  expect(weekKey(addWeeks(parseWeekKey("2026-07-20"), 1))).toBe("2026-07-27");
  expect(weekKey(addWeeks(parseWeekKey("2026-07-20"), -1))).toBe("2026-07-13");
});

test("formatWeekRange same month", () => {
  expect(formatWeekRange(parseWeekKey("2026-07-20"))).toBe("Jul 20 – 26");
});

test("formatWeekRange spanning months", () => {
  expect(formatWeekRange(parseWeekKey("2026-07-27"))).toBe("Jul 27 – Aug 2");
});
