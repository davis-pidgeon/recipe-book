import { expect, test } from "vitest";
import { buildGroceryList, type SourceIngredient } from "./build";
import { lineKey } from "./lineKey";

const src = (over: Partial<SourceIngredient>): SourceIngredient => ({
  planSlotId: "s1", recipeId: "r1", position: 0, quantity: 2, unit: "cups", name: "flour", scale: 1, ...over,
});

test("scales quantities and formats display", () => {
  const out = buildGroceryList([src({ quantity: 2, scale: 2, name: "rice", unit: "cups" })], new Map());
  expect(out.main[0].display).toBe("4 cups rice");
});

test("routes spices/oils to the pantry section", () => {
  const out = buildGroceryList([
    src({ position: 0, name: "chicken", unit: null, quantity: 1, scale: 1 }),
    src({ position: 1, name: "olive oil", unit: "tbsp", quantity: 2, scale: 1 }),
  ], new Map());
  expect(out.main.map((l) => l.name)).toEqual(["chicken"]);
  expect(out.pantry.map((l) => l.name)).toEqual(["olive oil"]);
});

test("sorts each section alphabetically by name", () => {
  const out = buildGroceryList([
    src({ position: 0, name: "zucchini" }),
    src({ position: 1, name: "apples" }),
  ], new Map());
  expect(out.main.map((l) => l.name)).toEqual(["apples", "zucchini"]);
});

test("applies checked + pantry-override flags by lineKey", () => {
  const k = lineKey("s1", "r1", 0);
  const flags = new Map([[k, { checked: true, pantry: true }]]);
  const out = buildGroceryList([src({ position: 0, name: "carrots" })], flags);
  expect(out.pantry[0].checked).toBe(true); // pantry override moved it
  expect(out.main).toEqual([]);
});

test("an explicit list override beats auto-detected staple status", () => {
  const k = lineKey("s1", "r1", 0);
  const flags = new Map([[k, { checked: false, pantry: false }]]);
  const out = buildGroceryList([src({ position: 0, name: "olive oil" })], flags);
  expect(out.main.map((l) => l.name)).toEqual(["olive oil"]);
  expect(out.pantry).toEqual([]);
});

test("a staple with no flag falls back to auto-detection into pantry", () => {
  const out = buildGroceryList([src({ position: 0, name: "olive oil" })], new Map());
  expect(out.pantry.map((l) => l.name)).toEqual(["olive oil"]);
  expect(out.main).toEqual([]);
});

test("a staple with an explicit pantry override stays in the pantry", () => {
  const k = lineKey("s1", "r1", 0);
  const flags = new Map([[k, { checked: false, pantry: true }]]);
  const out = buildGroceryList([src({ position: 0, name: "olive oil" })], flags);
  expect(out.pantry.map((l) => l.name)).toEqual(["olive oil"]);
  expect(out.main).toEqual([]);
});

test("keeps duplicate ingredients as separate lines", () => {
  const out = buildGroceryList([
    src({ planSlotId: "s1", position: 0, name: "chicken" }),
    src({ planSlotId: "s2", position: 0, name: "chicken" }),
  ], new Map());
  expect(out.main).toHaveLength(2);
  expect(out.main[0].lineKey).not.toBe(out.main[1].lineKey);
});
