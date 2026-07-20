import { expect, test, type Page } from "@playwright/test";
import { mondayOf, weekKey, addWeeks } from "@/lib/plan/week";

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

  // A fresh, far-future Monday, unique per run, so every default slot is
  // empty even though tests share the dev DB across runs. Base offset keeps
  // it well past any hardcoded/near-term weeks other specs might touch;
  // the Date.now()-derived offset keeps it from colliding with prior runs.
  const weeksAhead = 500 + (Date.now() % 100000);
  const futureMonday = mondayOf(addWeeks(mondayOf(new Date()), weeksAhead));
  const futureWeekKey = weekKey(futureMonday);

  await page.goto(`/plan?week=${futureWeekKey}`);
  const grid = page.locator(`[data-week="${futureWeekKey}"]`);
  await expect(grid.getByText("Mon", { exact: true }).first()).toBeVisible();

  // Open the surprise-me sheet, then confirm from inside it.
  await page.getByRole("button", { name: "Surprise me" }).click();
  await page.getByRole("button", { name: "Surprise me" }).click();

  // At least one slot picked up a recipe...
  await expect(grid.locator("span.bg-sky").first()).toBeVisible();
  // ...and it's never the disliked one.
  await expect(grid.getByText(dislikedTitle)).toHaveCount(0);
});
