import { expect, test } from "vitest";
import { pickRandom } from "./surprise";

test("returns the requested count of distinct items", () => {
  const out = pickRandom([1, 2, 3, 4, 5], 3, seq([0, 0, 0]));
  expect(out).toHaveLength(3);
  expect(new Set(out).size).toBe(3);
});

test("count >= pool returns all items (no repeats)", () => {
  const out = pickRandom([1, 2, 3], 10);
  expect(new Set(out)).toEqual(new Set([1, 2, 3]));
  expect(out).toHaveLength(3);
});

test("empty pool returns empty", () => {
  expect(pickRandom([], 3)).toEqual([]);
});

// deterministic rng that yields the given fractions in order, then 0
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++] ?? 0;
}
