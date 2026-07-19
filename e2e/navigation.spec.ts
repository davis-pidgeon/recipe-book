import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("can navigate between all three tabs", async ({ page }) => {
  await page.getByRole("link", { name: "Plan" }).first().click();
  await expect(page.getByRole("heading", { name: /this week/i })).toBeVisible();
  await page.getByRole("link", { name: "Grocery" }).first().click();
  await expect(page.getByRole("heading", { name: /grocery list/i })).toBeVisible();
  await page.getByRole("link", { name: "Recipes" }).first().click();
  await expect(page.getByRole("heading", { name: /my recipes/i })).toBeVisible();
});
