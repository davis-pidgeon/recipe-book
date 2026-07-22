import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("grocery list shows ingredients from this week's plan and persists checks", async ({ page }) => {
  const title = `Grocery test recipe ${Date.now()}`;

  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Servings").fill("2");
  await page.getByLabel("Paste ingredients").fill("2 cups rice\n1 lb chicken");
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

  await page.goto("/grocery");
  await expect(page.getByText("2 cups rice")).toBeVisible();
  await expect(page.getByText("1 lb chicken")).toBeVisible();

  const riceCheckbox = page.getByRole("checkbox", { name: "2 cups rice" });
  await riceCheckbox.check();
  await expect(riceCheckbox).toBeChecked();

  await page.reload();
  await expect(page.getByRole("checkbox", { name: "2 cups rice" })).toBeChecked();
});
