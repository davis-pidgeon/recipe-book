import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("can create a recipe and land on its detail page", async ({ page }) => {
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill("Test skillet chicken");
  await page.getByLabel("Servings").fill("4");
  await page.getByLabel("Paste ingredients").fill("2 cups rice\n1 lb chicken");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Cook chicken in a skillet, add rice.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: "Test skillet chicken" })).toBeVisible();
});
