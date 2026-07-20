import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

async function createRecipe(
  page: import("@playwright/test").Page,
  title: string,
  { veggieForward }: { veggieForward: boolean }
) {
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Paste ingredients").fill("1 lb chicken");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Cook it.");
  if (veggieForward) {
    await page.getByLabel("Veggie-forward").check();
  }
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page).toHaveURL(/\/recipes\/[a-z0-9]+$/);
  await page.waitForLoadState("networkidle");
}

test("flag filter shows only recipes with that flag", async ({ page }) => {
  const veggieTitle = `Veggie Bowl ${Date.now()}`;
  const otherTitle = `Plain Chicken ${Date.now()}`;

  await createRecipe(page, veggieTitle, { veggieForward: true });
  await createRecipe(page, otherTitle, { veggieForward: false });

  await page.goto("/recipes");
  await page.getByRole("button", { name: "Veggie-forward" }).click();

  await expect(page).toHaveURL(/[?&]flag=veggieForward/);
  await expect(page.getByText(veggieTitle)).toBeVisible();
  await expect(page.getByText(otherTitle)).not.toBeVisible();
});

test("rating filter updates the URL", async ({ page }) => {
  await page.goto("/recipes");
  await page.getByRole("button", { name: "Min taste 4" }).click();
  await expect(page).toHaveURL(/[?&]minTaste=4/);
});
