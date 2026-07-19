import { expect, test } from "vitest";
import { signSession, verifySession } from "./auth";

const secret = "test-secret";

test("a freshly signed session verifies true", async () => {
  const token = await signSession(secret);
  expect(await verifySession(token, secret)).toBe(true);
});

test("a tampered token verifies false", async () => {
  const token = (await signSession(secret)) + "x";
  expect(await verifySession(token, secret)).toBe(false);
});

test("an undefined token verifies false", async () => {
  expect(await verifySession(undefined, secret)).toBe(false);
});

test("a token signed with a different secret verifies false", async () => {
  const token = await signSession(secret);
  expect(await verifySession(token, "other-secret")).toBe(false);
});
