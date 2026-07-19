import { expect, test } from "@playwright/test";

test("unauthenticated visit to a protected page redirects to login", async ({ page }) => {
  await page.goto("/recipes");
  await expect(page).toHaveURL(/\/login/);
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page.getByText(/didn.t work/i)).toBeVisible();
});

test("correct password grants access to recipes", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});
