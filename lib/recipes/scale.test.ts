import { expect, test } from "vitest";
import { formatQuantity, scaleQuantity, scaleServings } from "./scale";

test("scales a numeric quantity", () => {
  expect(scaleQuantity(2, 3)).toBe(6);
});

test("scales a fractional quantity", () => {
  expect(scaleQuantity(0.5, 2)).toBe(1);
});

test("null quantity stays null", () => {
  expect(scaleQuantity(null, 2)).toBeNull();
});

test("scales servings", () => {
  expect(scaleServings(4, 2)).toBe(8);
});

test("formats an integer plainly", () => {
  expect(formatQuantity(6)).toBe("6");
});

test("formats a decimal, trimming trailing zeros", () => {
  expect(formatQuantity(1.5)).toBe("1.5");
  expect(formatQuantity(0.25)).toBe("0.25");
});

test("formats null as empty string", () => {
  expect(formatQuantity(null)).toBe("");
});
