import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("edit changes the title", async ({ page }) => {
  const unique = `Edit ${Date.now()}`;
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(unique);
  await page.getByLabel("Paste ingredients").fill("1 lb chicken");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Cook.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: unique })).toBeVisible();

  await page.getByRole("link", { name: /edit/i }).click();
  const changed = `${unique} updated`;
  await page.getByLabel("Title").fill(changed);
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByRole("heading", { name: changed })).toBeVisible();
});
