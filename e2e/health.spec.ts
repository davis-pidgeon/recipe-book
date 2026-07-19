import { expect, test } from "@playwright/test";

test("health endpoint reports database connectivity", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(typeof body.recipeCount).toBe("number");
});
