import { expect, test } from "vitest";
import { customSlotKey } from "./customSlotKey";

test("customSlotKey is prefixed and unique-ish", () => {
  const a = customSlotKey();
  const b = customSlotKey();
  expect(a.startsWith("custom-")).toBe(true);
  expect(a).not.toBe(b);
});
