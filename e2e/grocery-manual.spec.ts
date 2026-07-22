import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("freeform manual items can be added, checked, and removed", async ({ page }) => {
  const itemName = `paper towels ${Date.now()}`;

  await page.goto("/grocery");

  await page.getByLabel("Add a pantry item or snack").fill(itemName);
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByTestId("manual-section").getByText(itemName)).toBeVisible();

  const checkbox = page.getByRole("checkbox", { name: itemName });
  await expect(checkbox).toBeVisible();
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  await page.reload();

  const checkboxAfterReload = page.getByRole("checkbox", { name: itemName });
  await expect(checkboxAfterReload).toBeVisible();
  await expect(checkboxAfterReload).toBeChecked();

  const rowAfterReload = checkboxAfterReload.locator("xpath=ancestor::div[1]");
  await rowAfterReload.getByRole("button", { name: "Remove" }).click();

  await expect(page.getByRole("checkbox", { name: itemName })).toHaveCount(0);
  await expect(page.getByText(itemName)).toHaveCount(0);
});
