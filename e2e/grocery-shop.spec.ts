import { expect, test } from "@playwright/test";
import { mondayOf, weekKey, addWeeks } from "@/lib/plan/week";
import { KROGER_URL } from "@/lib/grocery/kroger";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("shop at Kroger link opens Kroger in a new tab", async ({ page }) => {
  await page.goto("/grocery");
  const link = page.getByRole("link", { name: "Shop at Kroger" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", KROGER_URL);
  await expect(link).toHaveAttribute("target", "_blank");
});

test("empty week shows a friendly hint and still allows adding manual items", async ({ page }) => {
  // A fresh, far-future Monday, unique per run, so the week is guaranteed
  // empty even though tests share the dev DB across runs.
  const weeksAhead = 900 + (Date.now() % 100000);
  const futureMonday = mondayOf(addWeeks(mondayOf(new Date()), weeksAhead));
  const futureWeekKey = weekKey(futureMonday);

  await page.goto(`/grocery?week=${futureWeekKey}`);

  await expect(page.getByTestId("grocery-empty-state")).toBeVisible();
  await expect(
    page.getByText("Nothing to shop for yet — plan some meals, or add your own items below."),
  ).toBeVisible();

  // Manual add section is still present so the user can add their own items.
  await expect(page.getByTestId("manual-section")).toBeVisible();
  await expect(page.getByLabel("Add a pantry item or snack")).toBeVisible();
});
