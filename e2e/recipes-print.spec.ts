import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("print page shows title, ingredients, and instructions", async ({ page }) => {
  const unique = `Print ${Date.now()}`;
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(unique);
  await page.getByLabel("Paste ingredients").fill("2 cups flour");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Bake it.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: unique })).toBeVisible();

  await page.getByRole("link", { name: /print/i }).click();
  await expect(page.getByRole("heading", { name: unique })).toBeVisible();
  await expect(page.getByText(/2 cups flour/)).toBeVisible();
  await expect(page.getByText(/Bake it\./)).toBeVisible();
});

test("print reflects the scale selected on the detail page", async ({ page }) => {
  const unique = `Print Scale ${Date.now()}`;
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(unique);
  await page.getByLabel("Servings").fill("4");
  await page.getByLabel("Paste ingredients").fill("2 cups flour");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Bake.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: unique })).toBeVisible();

  await page.getByRole("button", { name: "2x" }).click();
  await page.getByRole("link", { name: /print/i }).click();

  await expect(page.getByText(/4 cups flour/)).toBeVisible();
  await expect(page.getByText(/Serves 8/)).toBeVisible();
  await expect(page.getByText(/2x scaled/)).toBeVisible();
});
