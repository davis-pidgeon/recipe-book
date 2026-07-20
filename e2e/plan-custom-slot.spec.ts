import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("add a custom slot to Saturday, fill it with a recipe, persist, then remove it", async ({
  page,
}) => {
  const title = `Custom slot snack ${Date.now()}`;

  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Servings").fill("2");
  await page.getByLabel("Paste ingredients").fill("1 apple");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Slice the apple.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/plan");
  const saturday = page.locator('[data-day="5"]');
  await expect(saturday.getByText("Sat", { exact: true })).toBeVisible();

  await saturday.getByRole("button", { name: "+ Add a slot" }).click();
  await saturday.getByLabel("Slot name").fill("Snack");
  await saturday.getByRole("button", { name: "Add", exact: true }).click();

  // The custom slot now renders like any other slot, in Saturday's column only.
  await expect(saturday.getByText("Snack", { exact: true })).toBeVisible();

  await saturday.getByText("Snack", { exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Search recipes").fill(title);
  await page.getByRole("button", { name: title }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(saturday.getByText(title)).toBeVisible();

  await page.reload();
  const saturdayAfterReload = page.locator('[data-day="5"]');
  await expect(saturdayAfterReload.getByText("Snack", { exact: true })).toBeVisible();
  await expect(saturdayAfterReload.getByText(title)).toBeVisible();

  await saturdayAfterReload
    .getByRole("button", { name: "Remove Snack slot" })
    .click();
  await expect(saturdayAfterReload.getByText("Snack", { exact: true })).not.toBeVisible();
  await expect(saturdayAfterReload.getByText(title)).not.toBeVisible();
});
