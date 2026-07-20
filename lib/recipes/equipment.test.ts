import { expect, test } from "vitest";
import { detectEquipment } from "./equipment";

test("detects equipment mentioned in instructions", () => {
  const found = detectEquipment("Heat a skillet, then transfer to the oven.");
  expect(found).toContain("skillet");
  expect(found).toContain("oven");
});

test("is case-insensitive and de-duplicates", () => {
  expect(detectEquipment("OVEN oven Oven")).toEqual(["oven"]);
});

test("does not match substrings inside words", () => {
  // "panther" must not match "pan"
  expect(detectEquipment("A panther appeared")).not.toContain("pan");
});

test("returns empty array when nothing matches", () => {
  expect(detectEquipment("Mix and serve")).toEqual([]);
});
