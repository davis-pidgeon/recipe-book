import { expect, test } from "vitest";
import { parseRecipeForm } from "./parseRecipeForm";

function form(entries: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

test("parses core fields, ingredients JSON, tags, flags, ratings", () => {
  const f = form([
    ["title", "Fajitas"],
    ["servings", "4"],
    ["instructions", "Cook in a skillet"],
    ["notes", "Great with rice"],
    ["ingredients", JSON.stringify([{ quantity: 2, unit: "cups", name: "peppers" }])],
    ["tagId", "t1"],
    ["tagId", "t2"],
    ["veggieForward", "on"],
    ["tasteRating", "5"],
    ["costRating", ""],
  ]);
  const input = parseRecipeForm(f);
  expect(input.title).toBe("Fajitas");
  expect(input.servings).toBe(4);
  expect(input.instructions).toBe("Cook in a skillet");
  expect(input.notes).toBe("Great with rice");
  expect(input.ingredients).toEqual([{ quantity: 2, unit: "cups", name: "peppers" }]);
  expect(input.tagIds).toEqual(["t1", "t2"]);
  expect(input.flags.veggieForward).toBe(true);
  expect(input.tasteRating).toBe(5);
  expect(input.costRating).toBeNull();
});

test("handles malformed ingredients JSON gracefully", () => {
  const f = form([
    ["title", "Pasta"],
    ["servings", "2"],
    ["instructions", "Boil pasta"],
    ["notes", ""],
    ["ingredients", "not json"],
  ]);
  const input = parseRecipeForm(f);
  expect(input.title).toBe("Pasta");
  expect(input.ingredients).toEqual([]);
});
