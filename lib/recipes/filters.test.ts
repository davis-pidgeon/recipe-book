import { expect, test } from "vitest";
import { buildRecipeWhere } from "./filters";

test("empty filters yield empty where", () => {
  expect(buildRecipeWhere({})).toEqual({});
});

test("query matches title or ingredient name", () => {
  const where = buildRecipeWhere({ query: "chicken" });
  expect(where.OR).toEqual([
    { title: { contains: "chicken", mode: "insensitive" } },
    { ingredients: { some: { name: { contains: "chicken", mode: "insensitive" } } } },
  ]);
});

test("tagIds require all selected tags (AND of relations)", () => {
  const where = buildRecipeWhere({ tagIds: ["t1", "t2"] });
  expect(where.AND).toEqual([
    { tags: { some: { id: "t1" } } },
    { tags: { some: { id: "t2" } } },
  ]);
});

test("flags require each flag true", () => {
  const where = buildRecipeWhere({ flags: ["veggieForward", "freezerFriendly"] });
  expect(where.veggieForward).toBe(true);
  expect(where.freezerFriendly).toBe(true);
});

test("rating thresholds use gte", () => {
  const where = buildRecipeWhere({ minTaste: 4, minCost: 3 });
  expect(where.tasteRating).toEqual({ gte: 4 });
  expect(where.costRating).toEqual({ gte: 3 });
});
