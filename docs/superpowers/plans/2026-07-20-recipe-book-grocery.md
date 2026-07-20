# Recipe Book — Grocery (Phase 4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Grocery tab — a per-week shopping list auto-built from that week's planned recipes (at each slot's scale), alphabetically listed with persistent checkboxes, a Pantry Check section for spices/oils, a freeform add-your-own section, and a "Shop at Kroger" button.

**Architecture:** The grocery list is DERIVED live from Phase 3's `PlanSlot` rows: for each slot in the selected week that holds a recipe, expand the recipe's ingredients, scale each quantity by the slot's `scale`, and emit one grocery line per ingredient (no merging — duplicates are separate lines, by design). Per-line UI state (checked, pantry-override) persists in a `GroceryLineFlag` table keyed by a stable `lineKey`; freeform items the user types persist in a `GroceryItem` table. Pure aggregation/classification/sort logic lives in unit-tested `lib/grocery/` modules; reads/writes go through Server Actions; the page reuses the existing `?week=` navigation. All verified with Playwright e2e.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Prisma 6 + Neon Postgres, Tailwind v4, Vitest (unit), Playwright (e2e).

## Global Constraints

- **Cost:** $0/month — free tiers only; no paid AI/scraping; no Kroger API in v1 (the button just opens Kroger in a new tab).
- **Node:** 24 LTS.
- **Auth:** all `/grocery` routes + grocery Server Actions sit behind the existing shared-password `proxy.ts`; no per-user data. (Verify the proxy matcher already covers `/grocery` — it covers everything except static assets, so no change should be needed; confirm.)
- **Palette (exact):** Canyon `#DF6D41`, Buttercream `#F7D89A`, Morning Sky `#8DA6CC`, Olive Grove `#AAA648`, cream `#FDF6E7`, card `#FFFFFF`, ink `#2F2A24` — Tailwind names `canyon/buttercream/sky/olive/cream/card/ink`.
- **Fonts:** Fredoka (h1/h2/h3), Nunito (body) — already global. **Copy:** sentence case, friendly, plain.
- **Reuse, do not reimplement:** `@/lib/plan/week` (`mondayOf`, `weekKey`, `parseWeekKey`, `addWeeks`, `formatWeekRange`); `@/lib/recipes/scale` (`scaleQuantity`, `formatQuantity`); the `weekStart(Date) ↔ weekKey(string)` convention via `parseWeekKey`. The `?week=` param defaults to the current week; the week nav mirrors the Plan tab's `WeekNav`.
- **Live, no finalize button.** Every checkbox/add/remove auto-persists (`revalidatePath("/grocery")`).
- **Simple concatenation, alphabetical by name. No unit merging** (identical ingredients across recipes appear as separate lines).
- **Not printable.**
- **"use server"** files export only async functions (pure/sync helpers live in separate modules — see `lib/recipes/parseRecipeForm.ts` / `lib/plan/customSlotKey.ts` precedent).

---

## File Structure

- `prisma/schema.prisma` — add `GroceryItem` + `GroceryLineFlag` models + migration
- `lib/grocery/pantry.ts` — `PANTRY_STAPLES`, `isPantryStaple(name)` (spices/oils detection) + test
- `lib/grocery/build.ts` — `buildGroceryList(sources, flags)` pure aggregation/classify/sort + types + test
- `lib/grocery/kroger.ts` — `KROGER_URL` constant
- `lib/grocery/queries.ts` — `getGroceryData(weekKey)` (loads week's recipe slots + ingredients + flags + manual items) → shapes for `buildGroceryList`
- `lib/grocery/actions.ts` ("use server") — `toggleLineChecked`, `toggleLinePantry`, `addGroceryItem`, `toggleItemChecked`, `removeGroceryItem`
- `lib/grocery/lineKey.ts` — `lineKey(planSlotId, recipeId, position)` pure helper (kept out of the "use server" file)
- `app/(app)/grocery/page.tsx` — the grocery page (week nav + lists) — replaces the placeholder
- `components/grocery/GroceryLine.tsx` — one derived line: checkbox + display + "move to pantry" toggle
- `components/grocery/PantrySection.tsx` — the Pantry Check section
- `components/grocery/ManualItems.tsx` — freeform add/check/remove section
- `components/grocery/ShopKrogerButton.tsx` — opens Kroger in a new tab
- `e2e/grocery-*.spec.ts` — e2e per area

---

## Task 1: Data model (GroceryItem + GroceryLineFlag)

**Files:** Modify `prisma/schema.prisma`; create the migration.

**Interfaces produced:**
- `GroceryItem` — `id`, `weekStart DateTime @db.Date`, `name String`, `checked Boolean @default(false)`, `createdAt DateTime @default(now())`. Index `[weekStart]`.
- `GroceryLineFlag` — `id`, `weekStart DateTime @db.Date`, `lineKey String`, `checked Boolean @default(false)`, `pantry Boolean @default(false)`. Unique `@@unique([weekStart, lineKey])`, index `[weekStart]`.

- [ ] **Step 1: Add both models to `prisma/schema.prisma`** (keep existing generator/datasource/models):
```prisma
model GroceryItem {
  id        String   @id @default(cuid())
  weekStart DateTime @db.Date
  name      String
  checked   Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([weekStart])
}

model GroceryLineFlag {
  id        String   @id @default(cuid())
  weekStart DateTime @db.Date
  lineKey   String
  checked   Boolean  @default(false)
  pantry    Boolean  @default(false)

  @@unique([weekStart, lineKey])
  @@index([weekStart])
}
```

- [ ] **Step 2: Create + apply the migration to the DEV branch**

Run: `npx prisma migrate dev --name grocery`
Expected: migration created under `prisma/migrations/`, applied to the Neon DEV branch (local `.env`), client regenerated. Non-destructive (two new tables only).

- [ ] **Step 3: Add an e2e sanity spec** `e2e/grocery-schema.spec.ts`:
```ts
import { expect, test } from "@playwright/test";
test("health endpoint still works after grocery schema change", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).ok).toBe(true);
});
```

- [ ] **Step 4: Run it** — `npm run e2e -- grocery-schema.spec.ts` → PASS. Then `npm run test` (existing units still green).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: add grocery data model"`.

---

## Task 2: Pantry staple detection (pure)

**Files:** Create `lib/grocery/pantry.ts`, `lib/grocery/pantry.test.ts`.

**Interfaces produced:**
- `PANTRY_STAPLES: string[]` — canonical lowercase spice/oil/staple terms.
- `isPantryStaple(name: string): boolean` — case-insensitive whole-word match of the ingredient name against `PANTRY_STAPLES` (so "olive oil" matches but "olive tapenade" does not falsely match "olive oil"; "salt" matches "kosher salt").

- [ ] **Step 1: Write failing tests** `lib/grocery/pantry.test.ts`:
```ts
import { expect, test } from "vitest";
import { isPantryStaple } from "./pantry";

test("detects common spices and oils", () => {
  expect(isPantryStaple("salt")).toBe(true);
  expect(isPantryStaple("kosher salt")).toBe(true);
  expect(isPantryStaple("black pepper")).toBe(true);
  expect(isPantryStaple("olive oil")).toBe(true);
  expect(isPantryStaple("garlic powder")).toBe(true);
});

test("does not flag non-staples", () => {
  expect(isPantryStaple("chicken breast")).toBe(false);
  expect(isPantryStaple("olives")).toBe(false);
  expect(isPantryStaple("bell pepper")).toBe(false);
});

test("is case-insensitive", () => {
  expect(isPantryStaple("Olive Oil")).toBe(true);
});
```

- [ ] **Step 2: Run — confirm fail** — `npm run test -- pantry` → FAIL (module not found).

- [ ] **Step 3: Implement `lib/grocery/pantry.ts`:**
```ts
export const PANTRY_STAPLES = [
  "salt", "pepper", "black pepper", "olive oil", "vegetable oil", "canola oil",
  "cooking spray", "sugar", "brown sugar", "flour", "baking soda", "baking powder",
  "garlic powder", "onion powder", "paprika", "cumin", "oregano", "basil", "thyme",
  "cinnamon", "chili powder", "red pepper flakes", "cayenne", "nutmeg", "bay leaf",
  "vanilla extract", "soy sauce", "vinegar", "honey", "ketchup", "mustard",
  "mayonnaise", "water", "butter",
];

export function isPantryStaple(name: string): boolean {
  const n = name.toLowerCase();
  return PANTRY_STAPLES.some((term) => {
    const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")}\\b`, "i");
    return pattern.test(n);
  });
}
```

- [ ] **Step 4: Run — confirm pass** — `npm run test -- pantry` → PASS (3 tests). `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit** — `feat: add pantry staple detection`.

---

## Task 3: Grocery list builder (pure)

**Files:** Create `lib/grocery/build.ts`, `lib/grocery/build.test.ts`, `lib/grocery/lineKey.ts`.

**Interfaces produced:**
- `lib/grocery/lineKey.ts`: `lineKey(planSlotId: string, recipeId: string, position: number): string` → `` `${planSlotId}:${recipeId}:${position}` `` (stable per slot+recipe+ingredient; a recipe swap in a slot changes the key, avoiding stale checkbox carryover).
- `lib/grocery/build.ts`:
  - `type SourceIngredient = { planSlotId: string; recipeId: string; position: number; quantity: number | null; unit: string | null; name: string; scale: number }`
  - `type GroceryLine = { lineKey: string; display: string; name: string; checked: boolean }`
  - `type BuiltGrocery = { main: GroceryLine[]; pantry: GroceryLine[] }`
  - `buildGroceryList(sources: SourceIngredient[], flags: Map<string, { checked: boolean; pantry: boolean }>): BuiltGrocery`
  - Behavior per source: `key = lineKey(planSlotId, recipeId, position)`; `scaled = scaleQuantity(quantity, scale)`; `display = [formatQuantity(scaled), unit, name].filter(Boolean).join(" ")`; `flag = flags.get(key)`; `checked = flag?.checked ?? false`; `isPantry = isPantryStaple(name) || flag?.pantry === true`. Partition into `pantry` (isPantry) vs `main` (else). Sort EACH array alphabetically by `name` (case-insensitive, `localeCompare`). No merging.

- [ ] **Step 1: Create `lib/grocery/lineKey.ts`:**
```ts
export function lineKey(planSlotId: string, recipeId: string, position: number): string {
  return `${planSlotId}:${recipeId}:${position}`;
}
```

- [ ] **Step 2: Write failing tests** `lib/grocery/build.test.ts`:
```ts
import { expect, test } from "vitest";
import { buildGroceryList, type SourceIngredient } from "./build";
import { lineKey } from "./lineKey";

const src = (over: Partial<SourceIngredient>): SourceIngredient => ({
  planSlotId: "s1", recipeId: "r1", position: 0, quantity: 2, unit: "cups", name: "flour", scale: 1, ...over,
});

test("scales quantities and formats display", () => {
  const out = buildGroceryList([src({ quantity: 2, scale: 2, name: "rice", unit: "cups" })], new Map());
  expect(out.main[0].display).toBe("4 cups rice");
});

test("routes spices/oils to the pantry section", () => {
  const out = buildGroceryList([
    src({ position: 0, name: "chicken", unit: null, quantity: 1, scale: 1 }),
    src({ position: 1, name: "olive oil", unit: "tbsp", quantity: 2, scale: 1 }),
  ], new Map());
  expect(out.main.map((l) => l.name)).toEqual(["chicken"]);
  expect(out.pantry.map((l) => l.name)).toEqual(["olive oil"]);
});

test("sorts each section alphabetically by name", () => {
  const out = buildGroceryList([
    src({ position: 0, name: "zucchini" }),
    src({ position: 1, name: "apples" }),
  ], new Map());
  expect(out.main.map((l) => l.name)).toEqual(["apples", "zucchini"]);
});

test("applies checked + pantry-override flags by lineKey", () => {
  const k = lineKey("s1", "r1", 0);
  const flags = new Map([[k, { checked: true, pantry: true }]]);
  const out = buildGroceryList([src({ position: 0, name: "carrots" })], flags);
  expect(out.pantry[0].checked).toBe(true); // pantry override moved it
  expect(out.main).toEqual([]);
});

test("keeps duplicate ingredients as separate lines", () => {
  const out = buildGroceryList([
    src({ planSlotId: "s1", position: 0, name: "flour" }),
    src({ planSlotId: "s2", position: 0, name: "flour" }),
  ], new Map());
  expect(out.main).toHaveLength(2);
  expect(out.main[0].lineKey).not.toBe(out.main[1].lineKey);
});
```

- [ ] **Step 3: Run — confirm fail** — `npm run test -- build` → FAIL.

- [ ] **Step 4: Implement `lib/grocery/build.ts`:**
```ts
import { scaleQuantity, formatQuantity } from "@/lib/recipes/scale";
import { isPantryStaple } from "./pantry";
import { lineKey } from "./lineKey";

export type SourceIngredient = {
  planSlotId: string; recipeId: string; position: number;
  quantity: number | null; unit: string | null; name: string; scale: number;
};
export type GroceryLine = { lineKey: string; display: string; name: string; checked: boolean };
export type BuiltGrocery = { main: GroceryLine[]; pantry: GroceryLine[] };

export function buildGroceryList(
  sources: SourceIngredient[],
  flags: Map<string, { checked: boolean; pantry: boolean }>,
): BuiltGrocery {
  const main: GroceryLine[] = [];
  const pantry: GroceryLine[] = [];

  for (const s of sources) {
    const key = lineKey(s.planSlotId, s.recipeId, s.position);
    const scaled = scaleQuantity(s.quantity, s.scale);
    const display = [formatQuantity(scaled), s.unit, s.name].filter(Boolean).join(" ");
    const flag = flags.get(key);
    const line: GroceryLine = { lineKey: key, display, name: s.name, checked: flag?.checked ?? false };
    if (isPantryStaple(s.name) || flag?.pantry === true) pantry.push(line);
    else main.push(line);
  }

  const byName = (a: GroceryLine, b: GroceryLine) => a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  main.sort(byName);
  pantry.sort(byName);
  return { main, pantry };
}
```

- [ ] **Step 5: Run — confirm pass** — `npm run test -- build` → PASS (5 tests). `npx tsc --noEmit` clean.

- [ ] **Step 6: Commit** — `feat: add grocery list builder`.

---

## Task 4: Grocery queries + actions

**Files:** Create `lib/grocery/queries.ts`, `lib/grocery/actions.ts`, `lib/grocery/kroger.ts`.

**Interfaces produced:**
- `lib/grocery/kroger.ts`: `export const KROGER_URL = "https://www.kroger.com/";`
- `lib/grocery/queries.ts`: `getGroceryData(weekStartKey: string): Promise<{ built: BuiltGrocery; manual: GroceryItem[] }>` — parseWeekKey→weekStart; load `PlanSlot` rows for the week with a `recipeId`, `include` each recipe's `ingredients` (ordered by position); flatten into `SourceIngredient[]` (`planSlotId = slot.id`, `recipeId = slot.recipeId`, `scale = slot.scale`, each ingredient's position/quantity/unit/name); load `GroceryLineFlag` rows for the week into a `Map<lineKey,{checked,pantry}>`; call `buildGroceryList`; load `GroceryItem` rows (manual) ordered by createdAt. Return `{ built, manual }`.
- `lib/grocery/actions.ts` ("use server"):
  - `toggleLineChecked(weekKey: string, lineKey: string, checked: boolean): Promise<void>` — upsert `GroceryLineFlag` on `[weekStart, lineKey]`, set `checked`.
  - `toggleLinePantry(weekKey: string, lineKey: string, pantry: boolean): Promise<void>` — upsert, set `pantry`.
  - `addGroceryItem(weekKey: string, name: string): Promise<void>` — create a `GroceryItem` (trim; ignore empty).
  - `toggleItemChecked(id: string, checked: boolean): Promise<void>` — update.
  - `removeGroceryItem(id: string): Promise<void>` — delete.
  - Every action `revalidatePath("/grocery")`.

- [ ] **Step 1: `lib/grocery/kroger.ts`** — the one-line constant above.

- [ ] **Step 2: Implement `lib/grocery/queries.ts`** (server, no "use server"):
```ts
import prisma from "@/lib/db";
import { parseWeekKey } from "@/lib/plan/week";
import { buildGroceryList, type SourceIngredient } from "./build";

export async function getGroceryData(weekStartKey: string) {
  const weekStart = parseWeekKey(weekStartKey);
  const slots = await prisma.planSlot.findMany({
    where: { weekStart, recipeId: { not: null } },
    include: { recipe: { include: { ingredients: { orderBy: { position: "asc" } } } } },
  });
  const sources: SourceIngredient[] = [];
  for (const slot of slots) {
    if (!slot.recipe) continue;
    for (const ing of slot.recipe.ingredients) {
      sources.push({
        planSlotId: slot.id, recipeId: slot.recipe.id, position: ing.position,
        quantity: ing.quantity, unit: ing.unit, name: ing.name, scale: slot.scale,
      });
    }
  }
  const flagRows = await prisma.groceryLineFlag.findMany({ where: { weekStart } });
  const flags = new Map(flagRows.map((f) => [f.lineKey, { checked: f.checked, pantry: f.pantry }]));
  const built = buildGroceryList(sources, flags);
  const manual = await prisma.groceryItem.findMany({ where: { weekStart }, orderBy: { createdAt: "asc" } });
  return { built, manual };
}
```

- [ ] **Step 3: Implement `lib/grocery/actions.ts`** ("use server") with the five async actions above — each parseWeekKey→weekStart where needed, upsert on the `weekStart_lineKey` compound unique for the flag actions, create/update/delete for items, and `revalidatePath("/grocery")`. Example for one:
```ts
"use server";
import prisma from "@/lib/db";
import { parseWeekKey } from "@/lib/plan/week";
import { revalidatePath } from "next/cache";

export async function toggleLineChecked(weekKey: string, lineKey: string, checked: boolean): Promise<void> {
  const weekStart = parseWeekKey(weekKey);
  await prisma.groceryLineFlag.upsert({
    where: { weekStart_lineKey: { weekStart, lineKey } },
    update: { checked },
    create: { weekStart, lineKey, checked },
  });
  revalidatePath("/grocery");
}
```
(Implement `toggleLinePantry`, `addGroceryItem`, `toggleItemChecked`, `removeGroceryItem` in the same file following this pattern. `addGroceryItem` trims and returns early on empty. All async — this is a "use server" file.)

- [ ] **Step 4: Verify** — `npx tsc --noEmit` clean; `npm run lint`; `npm run test` still green. (These DB actions are exercised by e2e in Tasks 5–8.)

- [ ] **Step 5: Commit** — `feat: add grocery queries and actions`.

---

## Task 5: Grocery page + week nav + main list

**Files:** Create `app/(app)/grocery/page.tsx` (replace placeholder), `components/grocery/GroceryLine.tsx`; reuse `components/plan/WeekNav.tsx`. Create `e2e/grocery-list.spec.ts`.

**Interfaces:** page awaits `searchParams` (Next 16 Promise); `weekStartKey = sp.week ?? weekKey(mondayOf(new Date()))`; calls `getGroceryData(weekStartKey)`; renders `<WeekNav weekStartKey={...} />` (reused from Plan) — NOTE: WeekNav currently pushes to `/plan?week=`; if it hardcodes `/plan`, generalize it to accept a `basePath` prop (default `/plan`) and pass `basePath="/grocery"` here, OR create a thin `GroceryWeekNav`. Prefer generalizing WeekNav with a `basePath` prop (update the Plan usage to pass `/plan`).

- [ ] **Step 1:** If needed, add a `basePath?: string` prop to `components/plan/WeekNav.tsx` (default `/plan`) and use it in its `router.push`. Update the Plan page to pass `basePath="/plan"` (or rely on the default). Keep Plan e2e green.
- [ ] **Step 2:** `components/grocery/GroceryLine.tsx` (client): a row with a checkbox (checked from `line.checked`; `onChange` → `toggleLineChecked(weekStartKey, line.lineKey, next)` in a transition), the `line.display` text (strike-through when checked), and a small "move to pantry" / "move to list" toggle button (`toggleLinePantry(weekStartKey, line.lineKey, next)`). Accessible: the checkbox has an aria-label of the display text.
- [ ] **Step 3:** `app/(app)/grocery/page.tsx`: header "Grocery list" (Fredoka) + `WeekNav`; a "This week's list" section rendering `built.main` via `GroceryLine`; show a count. (Pantry + manual sections come in Tasks 6–7 — for now render a placeholder/empty area or leave room.) Palette + sentence case.
- [ ] **Step 4:** e2e `e2e/grocery-list.spec.ts`: create a recipe with ingredients `2 cups rice` + `1 lb chicken` (via /recipes/new), add it to this week's a slot (via the recipe's "Add to plan" → this week + a day + Dinner), then go to `/grocery`; assert "2 cups rice" and "1 lb chicken" appear; check the "rice" line's checkbox; reload → it stays checked (persisted).
- [ ] **Step 5:** `npx tsc --noEmit` clean; `npm run lint`; run `npm run e2e -- grocery-list.spec.ts` + a Plan spec (e.g. `plan-grid.spec.ts`) to confirm WeekNav change didn't regress; `npm run test` green.
- [ ] **Step 6: Commit** — `feat: add grocery page with week nav and main list`.

---

## Task 6: Pantry Check section

**Files:** Create `components/grocery/PantrySection.tsx`; wire into `app/(app)/grocery/page.tsx`. Create `e2e/grocery-pantry.spec.ts`.

- [ ] **Step 1:** `PantrySection.tsx` (server or client wrapper): renders a labelled "Pantry check" section at the BOTTOM (above/below manual — keep pantry then manual), listing `built.pantry` lines via the same `GroceryLine` component (checkbox + display + a "move to list" toggle to un-flag a manual override). Sentence-case heading; visually secondary (e.g. smaller / muted) so the main list stays prominent.
- [ ] **Step 2:** Wire into the page below the main list. If `built.pantry` is empty, hide the section (or show nothing).
- [ ] **Step 3:** e2e `e2e/grocery-pantry.spec.ts`: create a recipe with `2 cups flour` (staple) + `1 lb beef` (not); add to this week; on `/grocery` assert "beef" is in the main list and "flour" is under the Pantry check section. Then on a normal main-list line (e.g. "beef") click "move to pantry"; reload → it now appears under Pantry check (override persisted).
- [ ] **Step 4:** tsc + lint clean; run `npm run e2e -- grocery-pantry.spec.ts` → PASS; `npm run test` green.
- [ ] **Step 5: Commit** — `feat: add grocery pantry check section`.

---

## Task 7: Freeform add-your-own items

**Files:** Create `components/grocery/ManualItems.tsx`; wire into the page. Create `e2e/grocery-manual.spec.ts`.

- [ ] **Step 1:** `ManualItems.tsx` (client): a labelled text input + "Add" button (`addGroceryItem(weekStartKey, name)` in a transition; clears on success), and a list of the week's `manual` items each with a checkbox (`toggleItemChecked(id, next)`, strike-through when checked) and a remove button (`removeGroceryItem(id)`). Accessible labels; sentence case ("Add a pantry item or snack").
- [ ] **Step 2:** Wire into the page as a section at the bottom (after Pantry check). Pass the week's `manual` items + `weekStartKey`.
- [ ] **Step 3:** e2e `e2e/grocery-manual.spec.ts`: on `/grocery`, add "paper towels"; assert it appears; check it (strike-through / checked); reload → still present + checked; remove it → gone.
- [ ] **Step 4:** tsc + lint clean; `npm run e2e -- grocery-manual.spec.ts` → PASS; `npm run test` green.
- [ ] **Step 5: Commit** — `feat: add freeform grocery items`.

---

## Task 8: Shop at Kroger + empty state + finalize

**Files:** Create `components/grocery/ShopKrogerButton.tsx`; modify `app/(app)/grocery/page.tsx`. Create `e2e/grocery-shop.spec.ts`.

- [ ] **Step 1:** `ShopKrogerButton.tsx`: a link/button styled as a primary action (canyon) that opens `KROGER_URL` in a new tab (`<a href={KROGER_URL} target="_blank" rel="noopener noreferrer">Shop at Kroger</a>`). Place it in the grocery page header.
- [ ] **Step 2:** Empty state: when the week has NO planned-recipe lines AND no manual items, show a friendly sentence-case hint ("Nothing to shop for yet — plan some meals, or add your own items below."). Still render the manual-add section so the user can add items.
- [ ] **Step 3:** e2e `e2e/grocery-shop.spec.ts`: on `/grocery`, assert the "Shop at Kroger" link exists with `href` = the Kroger URL and `target="_blank"`. On a fresh future empty week (`?week=` far ahead, unique per run like the plan-surprise test), assert the empty-state hint shows.
- [ ] **Step 4: Run EVERYTHING:** `npm run test` (all unit) + `npm run e2e` (all specs) — capture totals; `npm run build` + `npx tsc --noEmit` + `npm run lint` clean. (Known: one non-grocery parallel-load flake may need a single re-run.)
- [ ] **Step 5: Commit** — `feat: add shop-at-kroger and grocery empty state`.

---

## Self-Review

**Spec coverage (§6 Grocery):**
- Per-week, same week selector as Plan → Tasks 4,5 (reused WeekNav, `?week=`) ✓
- Auto-built from the week's planned recipes at scaled quantities → Tasks 3,4 (buildGroceryList over PlanSlot recipes × scale) ✓
- Simple concatenation, alphabetical, no merging → Task 3 (sort by name; duplicates separate via slot-scoped lineKey) ✓
- Live, no finalize; checkbox + manual items persist per week → Tasks 1,4 (GroceryLineFlag.checked, GroceryItem; revalidate) ✓
- Pantry Check auto (spices/oils) + manual override → Tasks 2,3,6 (isPantryStaple + flag.pantry) ✓
- Freeform add section → Task 7 (GroceryItem) ✓
- Shop at Kroger opens Kroger in a new tab, no auto-cart → Task 8 ✓
- Not printable → nothing to build ✓

**Placeholder scan:** Pure/data tasks (1–3) carry complete code + tests; action task (4) gives one full action + an explicit pattern for the other four (same shape); UI tasks (5–8) name exact files, the exact actions to call with signatures from Task 4, and concrete e2e. The WeekNav `basePath` generalization is called out in Task 5 so the Plan tab isn't broken.

**Type consistency:** `lineKey(planSlotId, recipeId, position)` and `SourceIngredient`/`GroceryLine`/`BuiltGrocery` shapes are defined in Tasks 3 and reused verbatim by Task 4's `getGroceryData` and the UI. Action signatures in Task 4 (`toggleLineChecked`, `toggleLinePantry`, `addGroceryItem`, `toggleItemChecked`, `removeGroceryItem`) are reused verbatim by Tasks 5–8. `weekStart(Date) ↔ weekKey(string)` handled via `parseWeekKey`, consistent with the Plan phase.

**Note for the controller (subagent execution):** capture Task 4's exact action signatures into the ledger and pass them into Tasks 5–8 dispatches (those briefs are directed steps that reference Task 4). Reuse the Phase 3 pattern: pure tasks → cheap model; DB/UI tasks → standard model + reviewer each; final whole-branch review; then deploy with the same procedure (apply the `grocery` migration to prod via `prisma migrate deploy`, merge to main).
