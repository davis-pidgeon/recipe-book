import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("scaling doubles quantities and shows the scaled badge", async ({ page }) => {
  const unique = `Scale ${Date.now()}`;
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(unique);
  await page.getByLabel("Servings").fill("4");
  await page.getByLabel("Paste ingredients").fill("2 cups flour");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Mix.");
  await page.getByRole("button", { name: /save recipe/i }).click();

  await expect(page.getByRole("heading", { name: unique })).toBeVisible();
  await expect(page.getByText(/2 cups flour/)).toBeVisible();
  await page.getByRole("button", { name: "2x" }).click();
  await expect(page.getByText(/2x scaled/)).toBeVisible();
  await expect(page.getByText(/4 cups flour/)).toBeVisible();
  await expect(page.getByText(/Serves 8/)).toBeVisible();
});
