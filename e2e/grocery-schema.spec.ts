import { expect, test } from "@playwright/test";

test("health endpoint still works after grocery schema change", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).ok).toBe(true);
});
