import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("auto-detected equipment tags can be deselected and stay removed", async ({ page }) => {
  const unique = `Equip ${Date.now()}`;
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(unique);
  await page.getByLabel("Paste ingredients").fill("1 lb chicken");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Sear the chicken in a skillet.");

  await page.getByRole("button", { name: /detect equipment from instructions/i }).click();
  const skilletChip = page.getByRole("button", { name: "skillet", exact: true });
  await expect(skilletChip).toBeVisible();
  // Detection auto-selects the chip; wait for that state to actually land
  // before toggling it off, since the selection commits after the chip
  // first appears.
  await expect(skilletChip).toHaveClass(/bg-canyon/);

  // Deselect the auto-selected equipment chip.
  await skilletChip.click();
  await expect(skilletChip).not.toHaveClass(/bg-canyon/);

  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: unique })).toBeVisible();

  // The deselected equipment tag must not persist on save.
  await expect(page.getByText("skillet", { exact: true })).toHaveCount(0);
});
