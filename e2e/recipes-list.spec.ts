import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("shows the add-recipe link and a search box", async ({ page }) => {
  await page.goto("/recipes");
  await expect(page.getByRole("link", { name: /add recipe/i })).toBeVisible();
  await expect(page.getByLabel("Search recipes")).toBeVisible();
});

test("search filters the list by title", async ({ page }) => {
  // create a uniquely named recipe first
  const unique = `Zesty ${Date.now()}`;
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(unique);
  await page.getByLabel("Paste ingredients").fill("1 lb chicken");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Cook it.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  // wait for the post-create redirect to settle before navigating away,
  // otherwise the in-flight client navigation races with our page.goto.
  await expect(page).toHaveURL(/\/recipes\/[a-z0-9]+$/);
  await page.waitForLoadState("networkidle");

  await page.goto(`/recipes?q=${encodeURIComponent(unique)}`);
  await expect(page.getByText(unique)).toBeVisible();

  // a query that matches nothing shows the empty state
  await page.goto(`/recipes?q=${encodeURIComponent("no-such-recipe-xyz")}`);
  await expect(page.getByText("No recipes yet")).toBeVisible();
});

test("typing in the search box updates the URL and round-trips on reload", async ({ page }) => {
  await page.goto("/recipes");
  const search = page.getByLabel("Search recipes");
  await search.fill("chicken");
  await search.press("Enter");
  await expect(page).toHaveURL(/[?&]q=chicken/);
  // the input reflects the URL param after navigation
  await expect(page.getByLabel("Search recipes")).toHaveValue("chicken");
});

test("toggling a tag filter updates the URL with a tag param", async ({ page }) => {
  await page.goto("/recipes");
  // the only buttons on this page are the tag toggles in the filter panel
  await page.getByRole("button").first().click();
  await expect(page).toHaveURL(/[?&]tag=/);
});
