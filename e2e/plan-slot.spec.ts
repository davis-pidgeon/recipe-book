import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("pick a recipe for a dinner slot, it persists, then can be cleared", async ({ page }) => {
  const title = `Slot test dinner ${Date.now()}`;

  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Servings").fill("2");
  await page.getByLabel("Paste ingredients").fill("1 cup rice");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Cook the rice.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto("/plan");
  const dinnerSlot = page.getByText("Dinner", { exact: true }).first();
  await dinnerSlot.click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByLabel("Search recipes").fill(title);
  await page.getByRole("button", { name: title }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText(title)).toBeVisible();

  await page.reload();
  await expect(page.getByText(title)).toBeVisible();

  // Reopen the now-filled slot and clear it via the note editor's Clear button.
  await page.getByText(title).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /just a note instead/i }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText(title)).not.toBeVisible();
});

test("add a note to a slot instead of a recipe", async ({ page }) => {
  await page.goto("/plan");
  const dinnerSlot = page.getByText("Dinner", { exact: true }).nth(1);
  await dinnerSlot.click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await page.getByRole("button", { name: /just a note instead/i }).click();
  await page.getByLabel("Note").fill("Leftovers");
  await page.getByRole("button", { name: "Save" }).click();

  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("Leftovers")).toBeVisible();

  // Clean up so repeated runs don't leave stale data for other slots/tests.
  await page.getByText("Leftovers").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: /just a note instead/i }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("Leftovers")).not.toBeVisible();
});

test("switching slots without closing sheet remounts with fresh state (no stale draft notes)", async ({
  page,
}) => {
  await page.goto("/plan");

  // Open a slot and switch to note mode
  const mondayDinner = page.getByText("Dinner", { exact: true }).first();
  await mondayDinner.click();
  await expect(page.getByRole("dialog")).toBeVisible();

  // Switch to note mode and type a draft note WITHOUT saving
  await page.getByRole("button", { name: /just a note instead/i }).click();
  const noteInput = page.getByLabel("Note");
  await noteInput.fill("DRAFT_A");

  // Now switch to a DIFFERENT slot WITHOUT closing the sheet
  // Find Tuesday's dinner (second day's dinner)
  const tuesdayDinner = page.getByText("Dinner", { exact: true }).nth(1);
  await tuesdayDinner.click();

  // The sheet should remount with fresh state
  // Either the note input should be empty (Tuesday has no saved note)
  // or the sheet should have switched back to recipe-picker mode
  const noteInputAfterSwitch = page.getByLabel("Note");
  const noteVisibility = await noteInputAfterSwitch.isVisible();

  if (noteVisibility) {
    // If note input is visible, assert it's empty (Tuesday's fresh state)
    const noteValue = await noteInputAfterSwitch.inputValue();
    expect(noteValue).not.toContain("DRAFT_A");
  }
  // If note input is not visible, the sheet switched to recipe-picker mode (also valid)
});
