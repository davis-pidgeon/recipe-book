import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("pantry staples are separated from the main list, and manual overrides persist", async ({ page }) => {
  const title = `Pantry test recipe ${Date.now()}`;

  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Servings").fill("2");
  await page.getByLabel("Paste ingredients").fill("2 cups flour\n1 lb beef");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Cook it up.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByRole("button", { name: "Add to plan" }).click();
  await expect(page.getByRole("dialog", { name: "Add to plan" })).toBeVisible();

  // Use a day/slot combo distinct from grocery-list.spec.ts (Wed/Dinner) so the
  // two specs, which run concurrently against the same week, don't overwrite
  // each other's plan slot.
  await page.getByLabel("Day").selectOption({ label: "Mon" });
  await page.getByLabel("Slot").selectOption({ label: "Breakfast" });
  await page.getByRole("button", { name: "Add to plan" }).click();
  await expect(page.getByRole("dialog", { name: "Add to plan" })).not.toBeVisible();

  await page.goto("/grocery");

  const mainList = page.getByTestId("main-list");
  const pantrySection = page.getByTestId("pantry-section");

  await expect(mainList.getByText("1 lb beef")).toBeVisible();
  await expect(pantrySection.getByText("2 cups flour")).toBeVisible();
  await expect(mainList.getByText("2 cups flour")).toHaveCount(0);
  await expect(pantrySection.getByText("1 lb beef")).toHaveCount(0);

  // The main list may also contain leftover items from other e2e specs
  // sharing this week (e.g. grocery-list.spec.ts's chicken/rice), so scope
  // to the row containing our beef checkbox rather than assuming beef is
  // the only row.
  const beefRow = mainList.getByRole("checkbox", { name: "1 lb beef" }).locator("xpath=ancestor::div[1]");
  await beefRow.getByRole("button", { name: "Move to pantry" }).click();

  await page.reload();

  const pantrySectionAfter = page.getByTestId("pantry-section");
  await expect(pantrySectionAfter.getByText("1 lb beef")).toBeVisible();
  await expect(page.getByTestId("main-list").getByText("1 lb beef")).toHaveCount(0);
});

test("a manual list override on an auto-detected staple persists after reload", async ({ page }) => {
  const title = `Pantry override recipe ${Date.now()}`;

  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Servings").fill("2");
  // Distinct quantity from the "2 cups flour" used in the case above, so the
  // two flour lines (different recipes, both auto-routed to pantry) don't
  // collide on display text within the same shared week.
  await page.getByLabel("Paste ingredients").fill("5 cups flour\n1 lb pork");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Cook it up.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.getByRole("button", { name: "Add to plan" }).click();
  await expect(page.getByRole("dialog", { name: "Add to plan" })).toBeVisible();

  // Distinct day/slot from the other case in this file (Mon/Breakfast) and
  // from grocery-list.spec.ts / plan-add-from-recipe.spec.ts (Wed/Dinner) so
  // specs running concurrently against the same week don't clobber each
  // other's plan slot.
  await page.getByLabel("Day").selectOption({ label: "Tue" });
  await page.getByLabel("Slot").selectOption({ label: "Lunch (Courtney)" });
  await page.getByRole("button", { name: "Add to plan" }).click();
  await expect(page.getByRole("dialog", { name: "Add to plan" })).not.toBeVisible();

  await page.goto("/grocery");

  // "flour" is an auto-detected staple, so it starts under Pantry check.
  const pantrySection = page.getByTestId("pantry-section");
  await expect(pantrySection.getByText("5 cups flour")).toBeVisible();

  const flourRow = pantrySection.getByRole("checkbox", { name: "5 cups flour" }).locator("xpath=ancestor::div[1]");
  await flourRow.getByRole("button", { name: "Move to list" }).click();

  await page.reload();

  // The explicit list override must beat auto-detection after reload.
  await expect(page.getByTestId("main-list").getByText("5 cups flour")).toBeVisible();
  await expect(page.getByTestId("pantry-section").getByText("5 cups flour")).toHaveCount(0);
});
