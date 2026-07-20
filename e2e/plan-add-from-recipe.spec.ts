import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("add to plan from a recipe's detail page lands it in the chosen day/slot", async ({ page }) => {
  const title = `Add to plan test ${Date.now()}`;

  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Servings").fill("2");
  await page.getByLabel("Paste ingredients").fill("1 cup rice");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Cook it up.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByRole("button", { name: "Add to plan" }).click();
  await expect(page.getByRole("dialog", { name: "Add to plan" })).toBeVisible();

  await page.getByLabel("Day").selectOption({ label: "Wed" });
  await page.getByLabel("Slot").selectOption({ label: "Dinner" });
  await page.getByRole("button", { name: "Add to plan" }).click();

  await expect(page.getByRole("dialog", { name: "Add to plan" })).not.toBeVisible();

  await page.goto("/plan");
  const wednesdayColumn = page.locator('[data-day="2"]');
  await expect(wednesdayColumn.getByText("Dinner", { exact: true })).toBeVisible();
  await expect(wednesdayColumn.getByText(title)).toBeVisible();
});
