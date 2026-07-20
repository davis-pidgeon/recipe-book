import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("plan grid shows all seven days and navigates weeks", async ({ page }) => {
  await page.goto("/plan");
  for (const d of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
    await expect(page.getByText(d, { exact: true }).first()).toBeVisible();
  }
  const rangeBefore = await page.locator("span.font-bold").first().textContent();
  await page.getByRole("link", { name: "Next week" }).click();
  await expect(page).toHaveURL(/\/plan\?week=\d{4}-\d{2}-\d{2}/);
  const rangeAfter = await page.locator("span.font-bold").first().textContent();
  expect(rangeAfter).not.toEqual(rangeBefore);
});
