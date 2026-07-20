import { expect, test } from "vitest";
import { parseIngredientLine, splitIngredients } from "./ingredients";

test("parses quantity, unit, and name", () => {
  expect(parseIngredientLine("2 cups flour")).toEqual({ quantity: 2, unit: "cups", name: "flour" });
});

test("parses a decimal quantity", () => {
  expect(parseIngredientLine("1.5 tbsp olive oil")).toEqual({ quantity: 1.5, unit: "tbsp", name: "olive oil" });
});

test("parses a simple fraction", () => {
  expect(parseIngredientLine("1/2 tsp salt")).toEqual({ quantity: 0.5, unit: "tsp", name: "salt" });
});

test("parses a mixed number", () => {
  expect(parseIngredientLine("1 1/2 cups milk")).toEqual({ quantity: 1.5, unit: "cups", name: "milk" });
});

test("no unit: number then name", () => {
  expect(parseIngredientLine("3 eggs")).toEqual({ quantity: 3, unit: null, name: "eggs" });
});

test("no leading number: all name", () => {
  expect(parseIngredientLine("a pinch of salt")).toEqual({ quantity: null, unit: null, name: "a pinch of salt" });
});

test("splitIngredients ignores blank lines", () => {
  const out = splitIngredients("2 cups flour\n\n3 eggs\n");
  expect(out).toEqual([
    { quantity: 2, unit: "cups", name: "flour" },
    { quantity: 3, unit: null, name: "eggs" },
  ]);
});
