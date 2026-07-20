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

test("suppresses component terms subsumed by compound terms: sheet pan", () => {
  const found = detectEquipment("Place on a sheet pan and bake.");
  expect(found).toEqual(["sheet pan"]);
  expect(found).not.toContain("pan");
});

test("suppresses component terms subsumed by compound terms: dutch oven", () => {
  const found = detectEquipment("Braise in the dutch oven.");
  expect(found).toEqual(["dutch oven"]);
  expect(found).not.toContain("oven");
});

test("preserves independent terms that do not subsume each other", () => {
  const found = detectEquipment("Sear in a skillet, then roast in the oven.");
  expect(found).toContain("skillet");
  expect(found).toContain("oven");
});
