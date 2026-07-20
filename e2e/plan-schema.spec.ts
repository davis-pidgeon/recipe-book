import { expect, test } from "@playwright/test";

test("health ok after plan schema change", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
});
