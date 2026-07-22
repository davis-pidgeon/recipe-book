import { expect, test } from "vitest";
import { isPantryStaple } from "./pantry";

test("detects common spices and oils", () => {
  expect(isPantryStaple("salt")).toBe(true);
  expect(isPantryStaple("kosher salt")).toBe(true);
  expect(isPantryStaple("black pepper")).toBe(true);
  expect(isPantryStaple("olive oil")).toBe(true);
  expect(isPantryStaple("garlic powder")).toBe(true);
});

test("does not flag non-staples", () => {
  expect(isPantryStaple("chicken breast")).toBe(false);
  expect(isPantryStaple("olives")).toBe(false);
  expect(isPantryStaple("bell pepper")).toBe(false);
});

test("is case-insensitive", () => {
  expect(isPantryStaple("Olive Oil")).toBe(true);
});
