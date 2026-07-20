import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

async function createRecipe(page: Page, title: string, opts: { dislike?: boolean } = {}) {
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Servings").fill("2");
  await page.getByLabel("Paste ingredients").fill("1 cup rice");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Cook it up.");
  if (opts.dislike) {
    await page.getByLabel("Dislike").check();
  }
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
}

test("surprise me fills empty slots but never with a disliked recipe", async ({ page }) => {
  const stamp = Date.now();
  const goodTitle = `Surprise good ${stamp}`;
  const dislikedTitle = `Surprise disliked ${stamp}`;

  await createRecipe(page, goodTitle);
  await createRecipe(page, dislikedTitle, { dislike: true });

  // A fresh, far-future Monday so every default slot is empty.
  await page.goto("/plan?week=2030-01-07");
  const grid = page.locator('[data-week="2030-01-07"]');
  await expect(grid.getByText("Mon", { exact: true }).first()).toBeVisible();

  // Open the surprise-me sheet, then confirm from inside it.
  await page.getByRole("button", { name: "Surprise me" }).click();
  await page.getByRole("button", { name: "Surprise me" }).click();

  // At least one slot picked up a recipe...
  await expect(grid.locator("span.bg-sky").first()).toBeVisible();
  // ...and it's never the disliked one.
  await expect(grid.getByText(dislikedTitle)).toHaveCount(0);
});
