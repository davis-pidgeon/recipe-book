# Recipe Book — Recipes (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Recipes tab — create/edit/view recipes with structured ingredients, 1x/2x/3x scaling, auto-detected equipment, extensible tags, yes/no flags, star ratings, multi-facet search/filter, a full-screen cooking view, and half-sheet printing.

**Architecture:** Extends the Foundation app. Recipe data lives in Postgres via Prisma (Recipe + Ingredient + Tag, with a many-to-many Recipe↔Tag). Pure logic (ingredient parsing, scaling math, equipment detection, filter query building) lives in unit-tested modules under `lib/recipes/`. Writes go through Next.js Server Actions. UI is server components for lists/detail plus focused client components for the add/edit form, scaling control, and filters. Full behavior is verified with Playwright e2e against the real Neon database.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Prisma 6 + Neon Postgres, Tailwind v4, Vitest (unit), Playwright (e2e).

## Global Constraints

- **Cost:** $0/month — free tiers only; no paid AI or scraping. Ingredient splitting is rule-based, not AI.
- **Node:** 24 LTS.
- **Auth:** all recipe routes sit behind the existing shared-password `proxy.ts`; no per-user data.
- **Palette (exact hex):** Canyon `#DF6D41`, Buttercream `#F7D89A`, Morning Sky `#8DA6CC`, Olive Grove `#AAA648`, cream `#FDF6E7`, card `#FFFFFF`, ink `#2F2A24`. Use the existing Tailwind color names `canyon`, `buttercream`, `sky`, `olive`, `cream`, `card`, `ink`.
- **Fonts:** Fredoka (headings via `h1/h2/h3`), Nunito (body). Already configured globally.
- **Copy style:** sentence case everywhere; friendly, plain language.
- **Ingredients + instructions are independent:** ingredients are structured (quantity/unit/name); instructions are free text stored verbatim with amounts written in by the user. Never auto-sync amounts between them.
- **Scaling:** presets 1x/2x/3x only; scales ingredient quantities and displayed servings; instructions are NOT scaled; a clear badge shows whenever the view is not 1x.
- **Tags are extensible** in six groups: Meal Occasion, Dietary, Cuisine, Meat, Grocery Store, Equipment. **Flags are fixed yes/no.** **Ratings are 1–5 stars, may be blank.**
- **Dislike** flag keeps a recipe searchable but must be excludable from planning later (Phase 3).
- **Out of scope for Phase 2:** the "Add to plan" button (spec 4.9), meal planner, and grocery list — those are Phases 3–4. Do not build them here.

---

## File Structure

- `prisma/schema.prisma` — add `Recipe` fields, `Ingredient`, `Tag`, `TagGroup` enum, relations
- `prisma/seed.ts` — seed the default tags
- `lib/recipes/tags.ts` — default tag lists + `TagGroup` labels (single source of truth)
- `lib/recipes/ingredients.ts` — `parseIngredientLine`, `splitIngredients`
- `lib/recipes/ingredients.test.ts`
- `lib/recipes/scale.ts` — `scaleQuantity`, `scaleServings`, `formatQuantity`
- `lib/recipes/scale.test.ts`
- `lib/recipes/equipment.ts` — `EQUIPMENT_TERMS`, `detectEquipment`
- `lib/recipes/equipment.test.ts`
- `lib/recipes/filters.ts` — `RecipeFilters` type, `buildRecipeWhere`
- `lib/recipes/filters.test.ts`
- `lib/recipes/actions.ts` — `createRecipe`, `updateRecipe`, `deleteRecipe` server actions + `parseRecipeForm`
- `lib/recipes/actions.test.ts` — unit tests for `parseRecipeForm`
- `lib/recipes/queries.ts` — `listRecipes`, `getRecipe`, `listTags` (server data access)
- `components/recipes/RecipeForm.tsx` — the one long scrolling add/edit form (client)
- `components/recipes/IngredientRows.tsx` — paste box + editable rows (client)
- `components/recipes/TagPicker.tsx` — grouped, extensible tag selection (client)
- `components/recipes/FlagToggles.tsx` — yes/no flag toggles (client)
- `components/recipes/StarRating.tsx` — 1–5 star input/display (client)
- `components/recipes/RecipeCard.tsx` — list card (server)
- `components/recipes/RecipeFilters.tsx` — multi-facet filter UI (client)
- `components/recipes/ScaleControl.tsx` — 1x/2x/3x control + scaled badge (client)
- `components/ui/EmptyState.tsx` — reusable empty-state with illustration slot
- `app/(app)/recipes/page.tsx` — list + search/filter (replace placeholder)
- `app/(app)/recipes/new/page.tsx` — add form
- `app/(app)/recipes/[id]/page.tsx` — full-screen detail + scaling
- `app/(app)/recipes/[id]/edit/page.tsx` — edit form
- `app/(app)/recipes/[id]/print/page.tsx` — print view (half-sheet)
- `app/print.css` or print styles co-located — half-sheet print rules
- `e2e/recipes-*.spec.ts` — e2e per area

---

## Task 1: Extend the data model (Recipe, Ingredient, Tag)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `lib/recipes/tags.ts`, `prisma/seed.ts`
- Modify: `package.json` (add `prisma.seed` + `db:seed` script)

**Interfaces:**
- Produces: Prisma models `Recipe` (with flag booleans + rating ints + `instructions`, `notes`), `Ingredient` (`quantity Float?`, `unit String?`, `name`, `position`, `recipeId`), `Tag` (`group TagGroup`, `name`, unique `[group, name]`), implicit m-n `Recipe.tags`/`Tag.recipes`. Enum `TagGroup { MEAL_OCCASION DIETARY CUISINE MEAT GROCERY_STORE EQUIPMENT }`.
- Produces: `lib/recipes/tags.ts` exports `DEFAULT_TAGS: { group: TagGroup; names: string[] }[]` and `TAG_GROUP_LABELS: Record<TagGroup, string>`.

- [ ] **Step 1: Replace the Recipe model and add new models in `prisma/schema.prisma`**

Keep the existing `generator`/`datasource` blocks. Replace the `Recipe` model and append the rest:
```prisma
model Recipe {
  id           String       @id @default(cuid())
  title        String
  servings     Int          @default(1)
  instructions String       @default("")
  notes        String       @default("")

  tasteRating  Int?
  costRating   Int?

  easyScaleable    Boolean @default(false)
  veggieForward    Boolean @default(false)
  runningRecovery  Boolean @default(false)
  lowCalorie       Boolean @default(false)
  davisFavorite    Boolean @default(false)
  courtneyFavorite Boolean @default(false)
  fellowshipFav    Boolean @default(false)
  freezerFriendly  Boolean @default(false)
  dislike          Boolean @default(false)

  ingredients Ingredient[]
  tags        Tag[]        @relation("RecipeTags")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Ingredient {
  id       String  @id @default(cuid())
  recipe   Recipe  @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  recipeId String
  position Int
  quantity Float?
  unit     String?
  name     String

  @@index([recipeId])
}

enum TagGroup {
  MEAL_OCCASION
  DIETARY
  CUISINE
  MEAT
  GROCERY_STORE
  EQUIPMENT
}

model Tag {
  id      String    @id @default(cuid())
  group   TagGroup
  name    String
  recipes Recipe[]  @relation("RecipeTags")

  @@unique([group, name])
}
```

- [ ] **Step 2: Create the migration**

Run: `npx prisma migrate dev --name recipes`
Expected: a new migration applied to Neon; Prisma Client regenerated with the new models.

- [ ] **Step 3: Create the default-tags source of truth `lib/recipes/tags.ts`**

```ts
import { TagGroup } from "@prisma/client";

export const TAG_GROUP_LABELS: Record<TagGroup, string> = {
  MEAL_OCCASION: "Meal occasion",
  DIETARY: "Dietary",
  CUISINE: "Cuisine",
  MEAT: "Meat",
  GROCERY_STORE: "Grocery store",
  EQUIPMENT: "Equipment",
};

export const DEFAULT_TAGS: { group: TagGroup; names: string[] }[] = [
  {
    group: TagGroup.MEAL_OCCASION,
    names: [
      "Work breakfast", "Work lunch", "Work dinner",
      "Weekend breakfast", "Weekend lunch", "Weekend dinner",
    ],
  },
  { group: TagGroup.DIETARY, names: ["Gluten free", "Dairy free"] },
  {
    group: TagGroup.CUISINE,
    names: [
      "Italian", "Mexican", "Chinese", "Japanese", "Thai", "Indian",
      "Southern", "Mediterranean", "French", "Middle Eastern",
      "Korean", "Vietnamese", "Greek",
    ],
  },
  { group: TagGroup.MEAT, names: ["Chicken", "Beef", "Pork", "Turkey", "Seafood", "Vegetarian"] },
  { group: TagGroup.GROCERY_STORE, names: ["Kroger", "Trader Joe's", "Specialty"] },
];
```

- [ ] **Step 4: Create `prisma/seed.ts`**

```ts
import { PrismaClient } from "@prisma/client";
import { DEFAULT_TAGS } from "../lib/recipes/tags";

const prisma = new PrismaClient();

async function main() {
  for (const { group, names } of DEFAULT_TAGS) {
    for (const name of names) {
      await prisma.tag.upsert({
        where: { group_name: { group, name } },
        update: {},
        create: { group, name },
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

- [ ] **Step 5: Register the seed in `package.json`**

Add a top-level `"prisma"` block and a script:
```json
"prisma": { "seed": "tsx prisma/seed.ts" },
```
Add to `"scripts"`: `"db:seed": "tsx prisma/seed.ts"`.
Install the runner: `npm install --save-dev tsx`.

- [ ] **Step 6: Seed the database**

Run: `npm run db:seed`
Expected: completes with no error. Verify:
`npx prisma studio` is optional; instead run a quick count via the health pattern is unnecessary — trust the next step's e2e.

- [ ] **Step 7: Add an e2e assertion that tags seeded**

Create `e2e/recipes-schema.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("health endpoint still works after schema change", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect((await res.json()).ok).toBe(true);
});
```

- [ ] **Step 8: Run it**

Run: `npm run e2e -- recipes-schema.spec.ts`
Expected: PASS (confirms the migrated schema still serves).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: extend schema with recipes, ingredients, and tags"
```

---

## Task 2: Ingredient parsing utility

**Files:**
- Create: `lib/recipes/ingredients.ts`, `lib/recipes/ingredients.test.ts`

**Interfaces:**
- Produces:
  - `type ParsedIngredient = { quantity: number | null; unit: string | null; name: string }`
  - `parseIngredientLine(line: string): ParsedIngredient`
  - `splitIngredients(text: string): ParsedIngredient[]` (one entry per non-blank line)
- Rules: leading number (integer, decimal, or simple fraction like `1/2`, or mixed `1 1/2`) → `quantity`; a following known unit word → `unit`; the remainder → `name`. If no leading number, `quantity`/`unit` are null and the whole line is `name`.

- [ ] **Step 1: Write failing tests `lib/recipes/ingredients.test.ts`**

```ts
import { expect, test } from "vitest";
import { parseIngredientLine, splitIngredients } from "./ingredients";

test("parses quantity, unit, and name", () => {
  expect(parseIngredientLine("2 cups flour")).toEqual({ quantity: 2, unit: "cups", name: "flour" });
});

test("parses a decimal quantity", () => {
  expect(parseIngredientLine("1.5 tbsp olive oil")).toEqual({ quantity: 1.5, unit: "tbsp", name: "olive oil" });
});

test("parses a simple fraction", () => {
  expect(parseIngredientLine("1/2 tsp salt")).toEqual({ quantity: 0.5, unit: "tsp", name: "salt" });
});

test("parses a mixed number", () => {
  expect(parseIngredientLine("1 1/2 cups milk")).toEqual({ quantity: 1.5, unit: "cups", name: "milk" });
});

test("no unit: number then name", () => {
  expect(parseIngredientLine("3 eggs")).toEqual({ quantity: 3, unit: null, name: "eggs" });
});

test("no leading number: all name", () => {
  expect(parseIngredientLine("a pinch of salt")).toEqual({ quantity: null, unit: null, name: "a pinch of salt" });
});

test("splitIngredients ignores blank lines", () => {
  const out = splitIngredients("2 cups flour\n\n3 eggs\n");
  expect(out).toEqual([
    { quantity: 2, unit: "cups", name: "flour" },
    { quantity: 3, unit: null, name: "eggs" },
  ]);
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm run test -- ingredients`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/recipes/ingredients.ts`**

```ts
export type ParsedIngredient = {
  quantity: number | null;
  unit: string | null;
  name: string;
};

const UNITS = new Set([
  "cup", "cups", "tbsp", "tablespoon", "tablespoons", "tsp", "teaspoon", "teaspoons",
  "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds", "g", "gram", "grams",
  "kg", "ml", "l", "liter", "liters", "clove", "cloves", "can", "cans", "pinch",
  "package", "packages", "slice", "slices", "stick", "sticks", "quart", "quarts",
  "pint", "pints", "gallon", "gallons", "dash", "handful",
]);

function parseNumber(tokens: string[]): { value: number | null; rest: string[] } {
  const first = tokens[0];
  if (first === undefined) return { value: null, rest: tokens };

  // Mixed number: "1 1/2"
  if (/^\d+$/.test(first) && tokens[1] && /^\d+\/\d+$/.test(tokens[1])) {
    const [n, d] = tokens[1].split("/").map(Number);
    return { value: Number(first) + n / d, rest: tokens.slice(2) };
  }
  // Simple fraction: "1/2"
  if (/^\d+\/\d+$/.test(first)) {
    const [n, d] = first.split("/").map(Number);
    return { value: n / d, rest: tokens.slice(1) };
  }
  // Integer or decimal
  if (/^\d+(\.\d+)?$/.test(first)) {
    return { value: Number(first), rest: tokens.slice(1) };
  }
  return { value: null, rest: tokens };
}

export function parseIngredientLine(line: string): ParsedIngredient {
  const trimmed = line.trim();
  const tokens = trimmed.split(/\s+/);
  const { value, rest } = parseNumber(tokens);

  if (value === null) {
    return { quantity: null, unit: null, name: trimmed };
  }

  let unit: string | null = null;
  let nameTokens = rest;
  if (rest[0] && UNITS.has(rest[0].toLowerCase().replace(/\.$/, ""))) {
    unit = rest[0];
    nameTokens = rest.slice(1);
  }

  return { quantity: value, unit, name: nameTokens.join(" ") };
}

export function splitIngredients(text: string): ParsedIngredient[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map(parseIngredientLine);
}
```

- [ ] **Step 4: Run — confirm pass**

Run: `npm run test -- ingredients`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add rule-based ingredient parser"
```

---

## Task 3: Scaling utility

**Files:**
- Create: `lib/recipes/scale.ts`, `lib/recipes/scale.test.ts`

**Interfaces:**
- Produces:
  - `scaleQuantity(quantity: number | null, multiplier: number): number | null` (null stays null)
  - `scaleServings(servings: number, multiplier: number): number`
  - `formatQuantity(quantity: number | null): string` (integer → plain; else up to 2 decimals with trailing zeros trimmed; null → `""`)

- [ ] **Step 1: Write failing tests `lib/recipes/scale.test.ts`**

```ts
import { expect, test } from "vitest";
import { formatQuantity, scaleQuantity, scaleServings } from "./scale";

test("scales a numeric quantity", () => {
  expect(scaleQuantity(2, 3)).toBe(6);
});

test("scales a fractional quantity", () => {
  expect(scaleQuantity(0.5, 2)).toBe(1);
});

test("null quantity stays null", () => {
  expect(scaleQuantity(null, 2)).toBeNull();
});

test("scales servings", () => {
  expect(scaleServings(4, 2)).toBe(8);
});

test("formats an integer plainly", () => {
  expect(formatQuantity(6)).toBe("6");
});

test("formats a decimal, trimming trailing zeros", () => {
  expect(formatQuantity(1.5)).toBe("1.5");
  expect(formatQuantity(0.25)).toBe("0.25");
});

test("formats null as empty string", () => {
  expect(formatQuantity(null)).toBe("");
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm run test -- scale`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/recipes/scale.ts`**

```ts
export function scaleQuantity(quantity: number | null, multiplier: number): number | null {
  if (quantity === null) return null;
  return Math.round(quantity * multiplier * 100) / 100;
}

export function scaleServings(servings: number, multiplier: number): number {
  return servings * multiplier;
}

export function formatQuantity(quantity: number | null): string {
  if (quantity === null) return "";
  return Number(quantity.toFixed(2)).toString();
}
```

- [ ] **Step 4: Run — confirm pass**

Run: `npm run test -- scale`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add ingredient scaling helpers"
```

---

## Task 4: Equipment auto-detection utility

**Files:**
- Create: `lib/recipes/equipment.ts`, `lib/recipes/equipment.test.ts`

**Interfaces:**
- Produces:
  - `EQUIPMENT_TERMS: string[]` (canonical lowercase terms)
  - `detectEquipment(instructions: string): string[]` — returns matched canonical terms (deduped, in `EQUIPMENT_TERMS` order), case-insensitive whole-word match.

- [ ] **Step 1: Write failing tests `lib/recipes/equipment.test.ts`**

```ts
import { expect, test } from "vitest";
import { detectEquipment } from "./equipment";

test("detects equipment mentioned in instructions", () => {
  const found = detectEquipment("Heat a skillet, then transfer to the oven.");
  expect(found).toContain("skillet");
  expect(found).toContain("oven");
});

test("is case-insensitive and de-duplicates", () => {
  expect(detectEquipment("OVEN oven Oven")).toEqual(["oven"]);
});

test("does not match substrings inside words", () => {
  // "panther" must not match "pan"
  expect(detectEquipment("A panther appeared")).not.toContain("pan");
});

test("returns empty array when nothing matches", () => {
  expect(detectEquipment("Mix and serve")).toEqual([]);
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm run test -- equipment`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/recipes/equipment.ts`**

```ts
export const EQUIPMENT_TERMS = [
  "oven", "skillet", "pan", "saucepan", "pot", "baking sheet", "sheet pan",
  "blender", "food processor", "stand mixer", "hand mixer", "whisk",
  "slow cooker", "instant pot", "pressure cooker", "air fryer", "grill",
  "dutch oven", "wok", "colander", "rolling pin", "microwave", "toaster",
];

export function detectEquipment(instructions: string): string[] {
  const text = instructions.toLowerCase();
  const found: string[] = [];
  for (const term of EQUIPMENT_TERMS) {
    const pattern = new RegExp(`\\b${term.replace(/ /g, "\\s+")}\\b`, "i");
    if (pattern.test(text)) found.push(term);
  }
  return found;
}
```

- [ ] **Step 4: Run — confirm pass**

Run: `npm run test -- equipment`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add equipment auto-detection"
```

---

## Task 5: Recipe filter query builder

**Files:**
- Create: `lib/recipes/filters.ts`, `lib/recipes/filters.test.ts`

**Interfaces:**
- Produces:
  - `type RecipeFilters = { query?: string; tagIds?: string[]; flags?: string[]; minTaste?: number; minCost?: number }`
  - `buildRecipeWhere(filters: RecipeFilters): Prisma.RecipeWhereInput`
  - Behavior: `query` matches title contains (case-insensitive) OR any ingredient name contains; `tagIds` requires ALL selected tags present; `flags` (property names like `"veggieForward"`) each required true; `minTaste`/`minCost` apply `gte`.

- [ ] **Step 1: Write failing tests `lib/recipes/filters.test.ts`**

```ts
import { expect, test } from "vitest";
import { buildRecipeWhere } from "./filters";

test("empty filters yield empty where", () => {
  expect(buildRecipeWhere({})).toEqual({});
});

test("query matches title or ingredient name", () => {
  const where = buildRecipeWhere({ query: "chicken" });
  expect(where.OR).toEqual([
    { title: { contains: "chicken", mode: "insensitive" } },
    { ingredients: { some: { name: { contains: "chicken", mode: "insensitive" } } } },
  ]);
});

test("tagIds require all selected tags (AND of relations)", () => {
  const where = buildRecipeWhere({ tagIds: ["t1", "t2"] });
  expect(where.AND).toEqual([
    { tags: { some: { id: "t1" } } },
    { tags: { some: { id: "t2" } } },
  ]);
});

test("flags require each flag true", () => {
  const where = buildRecipeWhere({ flags: ["veggieForward", "glutenFreeNope"] });
  expect(where.veggieForward).toBe(true);
  expect(where.glutenFreeNope).toBe(true);
});

test("rating thresholds use gte", () => {
  const where = buildRecipeWhere({ minTaste: 4, minCost: 3 });
  expect(where.tasteRating).toEqual({ gte: 4 });
  expect(where.costRating).toEqual({ gte: 3 });
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm run test -- filters`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/recipes/filters.ts`**

```ts
import type { Prisma } from "@prisma/client";

export type RecipeFilters = {
  query?: string;
  tagIds?: string[];
  flags?: string[];
  minTaste?: number;
  minCost?: number;
};

export function buildRecipeWhere(filters: RecipeFilters): Prisma.RecipeWhereInput {
  const where: Prisma.RecipeWhereInput = {};

  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { ingredients: { some: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }

  if (filters.tagIds && filters.tagIds.length > 0) {
    where.AND = filters.tagIds.map((id) => ({ tags: { some: { id } } }));
  }

  if (filters.flags) {
    for (const flag of filters.flags) {
      (where as Record<string, unknown>)[flag] = true;
    }
  }

  if (typeof filters.minTaste === "number") where.tasteRating = { gte: filters.minTaste };
  if (typeof filters.minCost === "number") where.costRating = { gte: filters.minCost };

  return where;
}
```

- [ ] **Step 4: Run — confirm pass**

Run: `npm run test -- filters`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add recipe filter query builder"
```

---

## Task 6: Recipe form parsing + server actions

**Files:**
- Create: `lib/recipes/actions.ts`, `lib/recipes/actions.test.ts`, `lib/recipes/queries.ts`

**Interfaces:**
- Produces:
  - `type RecipeInput = { title: string; servings: number; instructions: string; notes: string; ingredients: ParsedIngredient[]; tagIds: string[]; flags: Record<string, boolean>; tasteRating: number | null; costRating: number | null }`
  - `parseRecipeForm(form: FormData): RecipeInput` (reads fields; ingredients come as a JSON string field `ingredients`; tagIds as repeated `tagId` entries; flags as checkbox presence; ratings as numbers or null)
  - `createRecipe(form: FormData): Promise<void>` (server action; writes Recipe + nested Ingredients + connects tags + auto-detected equipment tags; redirects to `/recipes/[id]`)
  - `updateRecipe(id: string, form: FormData): Promise<void>`
  - `deleteRecipe(id: string): Promise<void>`
  - `lib/recipes/queries.ts`: `listRecipes(filters)`, `getRecipe(id)`, `listTags()`
- Consumes: `parseIngredientLine`/`splitIngredients` (Task 2), `detectEquipment` (Task 4), `buildRecipeWhere` (Task 5), `prisma` (`@/lib/db`).

- [ ] **Step 1: Write failing unit tests for `parseRecipeForm` `lib/recipes/actions.test.ts`**

```ts
import { expect, test } from "vitest";
import { parseRecipeForm } from "./actions";

function form(entries: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

test("parses core fields, ingredients JSON, tags, flags, ratings", () => {
  const f = form([
    ["title", "Fajitas"],
    ["servings", "4"],
    ["instructions", "Cook in a skillet"],
    ["notes", "Great with rice"],
    ["ingredients", JSON.stringify([{ quantity: 2, unit: "cups", name: "peppers" }])],
    ["tagId", "t1"],
    ["tagId", "t2"],
    ["veggieForward", "on"],
    ["tasteRating", "5"],
    ["costRating", ""],
  ]);
  const input = parseRecipeForm(f);
  expect(input.title).toBe("Fajitas");
  expect(input.servings).toBe(4);
  expect(input.instructions).toBe("Cook in a skillet");
  expect(input.notes).toBe("Great with rice");
  expect(input.ingredients).toEqual([{ quantity: 2, unit: "cups", name: "peppers" }]);
  expect(input.tagIds).toEqual(["t1", "t2"]);
  expect(input.flags.veggieForward).toBe(true);
  expect(input.tasteRating).toBe(5);
  expect(input.costRating).toBeNull();
});
```

- [ ] **Step 2: Run — confirm fail**

Run: `npm run test -- actions`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `lib/recipes/actions.ts`**

```ts
"use server";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import type { ParsedIngredient } from "./ingredients";
import { detectEquipment } from "./equipment";
import { TagGroup } from "@prisma/client";

const FLAG_NAMES = [
  "easyScaleable", "veggieForward", "runningRecovery", "lowCalorie",
  "davisFavorite", "courtneyFavorite", "fellowshipFav", "freezerFriendly", "dislike",
] as const;

export type RecipeInput = {
  title: string;
  servings: number;
  instructions: string;
  notes: string;
  ingredients: ParsedIngredient[];
  tagIds: string[];
  flags: Record<string, boolean>;
  tasteRating: number | null;
  costRating: number | null;
};

export function parseRecipeForm(form: FormData): RecipeInput {
  const num = (v: FormDataEntryValue | null) =>
    v === null || v === "" ? null : Number(v);

  const flags: Record<string, boolean> = {};
  for (const name of FLAG_NAMES) flags[name] = form.get(name) === "on";

  return {
    title: String(form.get("title") ?? "").trim(),
    servings: Number(form.get("servings") ?? 1) || 1,
    instructions: String(form.get("instructions") ?? ""),
    notes: String(form.get("notes") ?? ""),
    ingredients: JSON.parse(String(form.get("ingredients") ?? "[]")) as ParsedIngredient[],
    tagIds: form.getAll("tagId").map(String),
    flags,
    tasteRating: num(form.get("tasteRating")),
    costRating: num(form.get("costRating")),
  };
}

async function equipmentTagIds(instructions: string): Promise<string[]> {
  const terms = detectEquipment(instructions);
  const ids: string[] = [];
  for (const name of terms) {
    const tag = await prisma.tag.upsert({
      where: { group_name: { group: TagGroup.EQUIPMENT, name } },
      update: {},
      create: { group: TagGroup.EQUIPMENT, name },
    });
    ids.push(tag.id);
  }
  return ids;
}

function recipeData(input: RecipeInput) {
  return {
    title: input.title,
    servings: input.servings,
    instructions: input.instructions,
    notes: input.notes,
    tasteRating: input.tasteRating,
    costRating: input.costRating,
    ...input.flags,
  };
}

export async function createRecipe(form: FormData): Promise<void> {
  const input = parseRecipeForm(form);
  const equipmentIds = await equipmentTagIds(input.instructions);
  const tagIds = [...new Set([...input.tagIds, ...equipmentIds])];

  const recipe = await prisma.recipe.create({
    data: {
      ...recipeData(input),
      ingredients: {
        create: input.ingredients.map((ing, i) => ({
          position: i,
          quantity: ing.quantity,
          unit: ing.unit,
          name: ing.name,
        })),
      },
      tags: { connect: tagIds.map((id) => ({ id })) },
    },
  });

  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(id: string, form: FormData): Promise<void> {
  const input = parseRecipeForm(form);
  const equipmentIds = await equipmentTagIds(input.instructions);
  const tagIds = [...new Set([...input.tagIds, ...equipmentIds])];

  await prisma.$transaction([
    prisma.ingredient.deleteMany({ where: { recipeId: id } }),
    prisma.recipe.update({
      where: { id },
      data: {
        ...recipeData(input),
        ingredients: {
          create: input.ingredients.map((ing, i) => ({
            position: i,
            quantity: ing.quantity,
            unit: ing.unit,
            name: ing.name,
          })),
        },
        tags: { set: tagIds.map((id) => ({ id })) },
      },
    }),
  ]);

  redirect(`/recipes/${id}`);
}

export async function deleteRecipe(id: string): Promise<void> {
  await prisma.recipe.delete({ where: { id } });
  redirect("/recipes");
}
```

- [ ] **Step 4: Run — confirm pass**

Run: `npm run test -- actions`
Expected: PASS (1 test).

- [ ] **Step 5: Implement `lib/recipes/queries.ts`**

```ts
import prisma from "@/lib/db";
import { buildRecipeWhere, type RecipeFilters } from "./filters";

export function listRecipes(filters: RecipeFilters = {}) {
  return prisma.recipe.findMany({
    where: buildRecipeWhere(filters),
    include: { tags: true },
    orderBy: { title: "asc" },
  });
}

export function getRecipe(id: string) {
  return prisma.recipe.findUnique({
    where: { id },
    include: { ingredients: { orderBy: { position: "asc" } }, tags: true },
  });
}

export function listTags() {
  return prisma.tag.findMany({ orderBy: [{ group: "asc" }, { name: "asc" }] });
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add recipe server actions and queries"
```

---

## Task 7: Add-recipe form (one long scrolling form)

**Files:**
- Create: `components/recipes/RecipeForm.tsx`, `components/recipes/IngredientRows.tsx`, `components/recipes/TagPicker.tsx`, `components/recipes/FlagToggles.tsx`, `components/recipes/StarRating.tsx`, `app/(app)/recipes/new/page.tsx`
- Create: `e2e/recipes-create.spec.ts`

**Interfaces:**
- Consumes: `createRecipe` (Task 6), `listTags` (Task 6), `splitIngredients` (Task 2), `TAG_GROUP_LABELS`/`DEFAULT_TAGS` grouping (Task 1).
- Produces: `<RecipeForm action={...} tags={...} initial?={...} />` used by both new and edit pages. Ingredients serialized into a hidden `ingredients` input as JSON; each selected tag rendered as a hidden `tagId` input; flags as named checkboxes; ratings via `StarRating` writing hidden `tasteRating`/`costRating`.

This is a UI task; build the pieces, then verify with e2e. Detailed component code:

- [ ] **Step 1: `components/recipes/StarRating.tsx`**

```tsx
"use client";
import { useState } from "react";

export default function StarRating({ name, initial }: { name: string; initial?: number | null }) {
  const [value, setValue] = useState<number | null>(initial ?? null);
  return (
    <div className="flex items-center gap-1">
      <input type="hidden" name={name} value={value ?? ""} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${name} ${n} stars`}
          onClick={() => setValue(n === value ? null : n)}
          className={n <= (value ?? 0) ? "text-canyon" : "text-ink/30"}
        >
          ★
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: `components/recipes/FlagToggles.tsx`**

```tsx
"use client";

const FLAGS: { name: string; label: string }[] = [
  { name: "easyScaleable", label: "Easy scaleable" },
  { name: "veggieForward", label: "Veggie-forward" },
  { name: "runningRecovery", label: "Running recovery" },
  { name: "lowCalorie", label: "Low calorie" },
  { name: "davisFavorite", label: "Davis favorite" },
  { name: "courtneyFavorite", label: "Courtney favorite" },
  { name: "fellowshipFav", label: "Fellowship favorite" },
  { name: "freezerFriendly", label: "Freezer friendly" },
  { name: "dislike", label: "Dislike" },
];

export default function FlagToggles({ initial }: { initial?: Record<string, boolean> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {FLAGS.map((f) => (
        <label key={f.name} className="flex items-center gap-2 rounded-full border-2 border-buttercream px-3 py-1">
          <input type="checkbox" name={f.name} defaultChecked={initial?.[f.name] ?? false} />
          {f.label}
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: `components/recipes/IngredientRows.tsx`**

```tsx
"use client";
import { useState } from "react";
import { splitIngredients, type ParsedIngredient } from "@/lib/recipes/ingredients";

export default function IngredientRows({ initial }: { initial?: ParsedIngredient[] }) {
  const [rows, setRows] = useState<ParsedIngredient[]>(initial ?? []);
  const [paste, setPaste] = useState("");

  function doSplit() {
    setRows([...rows, ...splitIngredients(paste)]);
    setPaste("");
  }
  function update(i: number, patch: Partial<ParsedIngredient>) {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    setRows(rows.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <input type="hidden" name="ingredients" value={JSON.stringify(rows)} />
      <textarea
        aria-label="Paste ingredients"
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        className="w-full rounded-lg border-2 border-buttercream p-2"
        placeholder={"2 cups flour\n3 eggs"}
        rows={4}
      />
      <button type="button" onClick={doSplit} className="mt-2 rounded-full bg-sky px-3 py-1">
        Split into rows
      </button>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((r, i) => (
          <li key={i} className="flex gap-2">
            <input aria-label="quantity" value={r.quantity ?? ""} onChange={(e) => update(i, { quantity: e.target.value === "" ? null : Number(e.target.value) })} className="w-16 rounded border p-1" />
            <input aria-label="unit" value={r.unit ?? ""} onChange={(e) => update(i, { unit: e.target.value || null })} className="w-24 rounded border p-1" />
            <input aria-label="name" value={r.name} onChange={(e) => update(i, { name: e.target.value })} className="flex-1 rounded border p-1" />
            <button type="button" onClick={() => remove(i)} aria-label="remove">✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: `components/recipes/TagPicker.tsx`**

```tsx
"use client";
import { useState } from "react";
import type { Tag, TagGroup } from "@prisma/client";
import { TAG_GROUP_LABELS } from "@/lib/recipes/tags";

export default function TagPicker({ tags, initialIds }: { tags: Tag[]; initialIds?: string[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialIds ?? []));

  const groups = Array.from(new Set(tags.map((t) => t.group))) as TagGroup[];
  function toggle(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="tagId" value={id} />
      ))}
      {groups.map((g) => (
        <div key={g}>
          <p className="text-sm font-bold">{TAG_GROUP_LABELS[g]}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {tags.filter((t) => t.group === g).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className={`rounded-full px-3 py-1 ${selected.has(t.id) ? "bg-canyon text-white" : "border-2 border-buttercream"}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

Note: extensible "add a new tag" inline is handled in a later refinement within this task if time permits; the reviewer should confirm the spec's extensibility. If not implemented here, record as a Minor finding for the phase and ensure Task 10 or a follow-up covers it. (Implementer: add a small "+ add" input per group that POSTs a new tag via a `createTag` server action and appends it to the list.)

- [ ] **Step 5: `components/recipes/RecipeForm.tsx`** — compose all pieces with title, servings, instructions, notes, and a submit button; `action` is the passed server action.

```tsx
import type { Tag } from "@prisma/client";
import IngredientRows from "./IngredientRows";
import TagPicker from "./TagPicker";
import FlagToggles from "./FlagToggles";
import StarRating from "./StarRating";
import type { ParsedIngredient } from "@/lib/recipes/ingredients";

type Initial = {
  title?: string; servings?: number; instructions?: string; notes?: string;
  ingredients?: ParsedIngredient[]; tagIds?: string[];
  flags?: Record<string, boolean>; tasteRating?: number | null; costRating?: number | null;
};

export default function RecipeForm({
  action, tags, initial, submitLabel,
}: {
  action: (form: FormData) => void | Promise<void>;
  tags: Tag[];
  initial?: Initial;
  submitLabel: string;
}) {
  return (
    <form action={action} className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <label className="text-sm font-bold" htmlFor="title">Title</label>
        <input id="title" name="title" defaultValue={initial?.title} required className="w-full rounded-lg border-2 border-buttercream p-2" />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="servings">Servings</label>
        <input id="servings" name="servings" type="number" min={1} defaultValue={initial?.servings ?? 1} className="w-24 rounded-lg border-2 border-buttercream p-2" />
      </div>
      <div>
        <p className="text-sm font-bold">Ingredients</p>
        <IngredientRows initial={initial?.ingredients} />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="instructions">Instructions</label>
        <textarea id="instructions" name="instructions" defaultValue={initial?.instructions} rows={8} className="w-full rounded-lg border-2 border-buttercream p-2" />
      </div>
      <div>
        <label className="text-sm font-bold" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" defaultValue={initial?.notes} rows={3} className="w-full rounded-lg border-2 border-buttercream p-2" />
      </div>
      <div>
        <p className="text-sm font-bold">Tags</p>
        <TagPicker tags={tags} initialIds={initial?.tagIds} />
      </div>
      <div>
        <p className="text-sm font-bold">Flags</p>
        <FlagToggles initial={initial?.flags} />
      </div>
      <div className="flex gap-6">
        <div><p className="text-sm font-bold">Taste</p><StarRating name="tasteRating" initial={initial?.tasteRating} /></div>
        <div><p className="text-sm font-bold">Cost</p><StarRating name="costRating" initial={initial?.costRating} /></div>
      </div>
      <button type="submit" className="rounded-full bg-canyon px-4 py-2 font-bold text-white">{submitLabel}</button>
    </form>
  );
}
```

- [ ] **Step 6: `app/(app)/recipes/new/page.tsx`**

```tsx
import { createRecipe } from "@/lib/recipes/actions";
import { listTags } from "@/lib/recipes/queries";
import RecipeForm from "@/components/recipes/RecipeForm";

export default async function NewRecipePage() {
  const tags = await listTags();
  return (
    <div className="p-2">
      <h1 className="px-6 pt-6 text-3xl text-canyon">Add a recipe</h1>
      <RecipeForm action={createRecipe} tags={tags} submitLabel="Save recipe" />
    </div>
  );
}
```

- [ ] **Step 7: Write e2e `e2e/recipes-create.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("can create a recipe and land on its detail page", async ({ page }) => {
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill("Test skillet chicken");
  await page.getByLabel("Servings").fill("4");
  await page.getByLabel("Paste ingredients").fill("2 cups rice\n1 lb chicken");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Cook chicken in a skillet, add rice.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: /test skillet chicken/i })).toBeVisible();
});
```

- [ ] **Step 8: Run e2e — confirm pass** (detail page from Task 9 may not exist yet; if so, assert redirect URL `/recipes/` pattern instead, and re-enable the heading assertion after Task 9)

Run: `npm run e2e -- recipes-create.spec.ts`
Expected: PASS once Task 9 detail page exists. If running before Task 9, temporarily assert `await expect(page).toHaveURL(/\/recipes\/[a-z0-9]+/)`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add recipe creation form"
```

---

## Task 8: Recipes list with search and multi-facet filter

**Files:**
- Create: `components/recipes/RecipeCard.tsx`, `components/recipes/RecipeFilters.tsx`, `components/ui/EmptyState.tsx`
- Modify: `app/(app)/recipes/page.tsx`
- Create: `e2e/recipes-list.spec.ts`

**Interfaces:**
- Consumes: `listRecipes` + `listTags` (Task 6), `RecipeFilters` (Task 5). Filters passed via URL search params (`q`, `tag` repeated, `flag` repeated, `minTaste`, `minCost`); the page reads `searchParams`, builds `RecipeFilters`, and calls `listRecipes`.
- Produces: recipes list with a filter panel and an empty state.

- [ ] **Step 1: `components/ui/EmptyState.tsx`**

```tsx
export default function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-12 text-center">
      <div aria-hidden className="flex h-32 w-32 items-center justify-center rounded-3xl bg-buttercream text-5xl">🍽️</div>
      <p className="text-xl">{title}</p>
      {hint && <p className="text-ink/70">{hint}</p>}
    </div>
  );
}
```
(Illustration slot: drop `public/illustrations/recipes-empty.png` later; swap the emoji for `<img>` with fallback as in `HeroIllustration`.)

- [ ] **Step 2: `components/recipes/RecipeCard.tsx`**

```tsx
import Link from "next/link";
import type { Recipe, Tag } from "@prisma/client";

export default function RecipeCard({ recipe }: { recipe: Recipe & { tags: Tag[] } }) {
  return (
    <Link href={`/recipes/${recipe.id}`} className="block rounded-2xl border-l-8 border-canyon bg-card p-4">
      <p className="font-bold">{recipe.title}</p>
      <p className="text-sm text-ink/60">{recipe.tags.map((t) => t.name).join(" · ")}</p>
    </Link>
  );
}
```

- [ ] **Step 3: `components/recipes/RecipeFilters.tsx`** — a client component that reads/writes URL params for `q`, tag ids, flags, and rating thresholds (grouped UI). Submit via `router.push` with a querystring.

```tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Tag } from "@prisma/client";
import { TAG_GROUP_LABELS } from "@/lib/recipes/tags";

export default function RecipeFilters({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const selectedTags = new Set(params.getAll("tag"));

  function toggleTag(id: string) {
    const next = new URLSearchParams(params.toString());
    const current = next.getAll("tag");
    next.delete("tag");
    const updated = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    updated.forEach((x) => next.append("tag", x));
    router.push(`/recipes?${next.toString()}`);
  }
  function setQuery(q: string) {
    const next = new URLSearchParams(params.toString());
    q ? next.set("q", q) : next.delete("q");
    router.push(`/recipes?${next.toString()}`);
  }

  const groups = Array.from(new Set(tags.map((t) => t.group)));
  return (
    <div className="flex flex-col gap-3">
      <input
        aria-label="Search recipes"
        defaultValue={params.get("q") ?? ""}
        onKeyDown={(e) => { if (e.key === "Enter") setQuery((e.target as HTMLInputElement).value); }}
        placeholder="Search recipes"
        className="w-full rounded-full border-2 border-buttercream px-4 py-2"
      />
      {groups.map((g) => (
        <div key={g}>
          <p className="text-xs font-bold uppercase text-ink/60">{TAG_GROUP_LABELS[g]}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {tags.filter((t) => t.group === g).map((t) => (
              <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                className={`rounded-full px-3 py-1 text-sm ${selectedTags.has(t.id) ? "bg-canyon text-white" : "border-2 border-buttercream"}`}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `app/(app)/recipes/page.tsx`**

```tsx
import Link from "next/link";
import { listRecipes, listTags } from "@/lib/recipes/queries";
import type { RecipeFilters as Filters } from "@/lib/recipes/filters";
import RecipeCard from "@/components/recipes/RecipeCard";
import RecipeFilters from "@/components/recipes/RecipeFilters";
import EmptyState from "@/components/ui/EmptyState";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const asArray = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
  const filters: Filters = {
    query: typeof sp.q === "string" ? sp.q : undefined,
    tagIds: asArray(sp.tag),
    flags: asArray(sp.flag),
    minTaste: sp.minTaste ? Number(sp.minTaste) : undefined,
    minCost: sp.minCost ? Number(sp.minCost) : undefined,
  };
  const [recipes, tags] = await Promise.all([listRecipes(filters), listTags()]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-canyon">My recipes</h1>
        <Link href="/recipes/new" className="rounded-full bg-canyon px-4 py-2 font-bold text-white">Add recipe</Link>
      </div>
      <div className="mt-4 grid gap-6 md:grid-cols-[220px_1fr]">
        <RecipeFilters tags={tags} />
        {recipes.length === 0 ? (
          <EmptyState title="No recipes yet" hint="Add your first recipe to get started." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recipes.map((r) => <RecipeCard key={r.id} recipe={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write e2e `e2e/recipes-list.spec.ts`**

```ts
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

  await page.goto(`/recipes?q=${encodeURIComponent(unique)}`);
  await expect(page.getByText(unique)).toBeVisible();
});
```

- [ ] **Step 6: Run e2e — confirm pass**

Run: `npm run e2e -- recipes-list.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add recipe list with search and filters"
```

---

## Task 9: Recipe detail (full-screen) with scaling

**Files:**
- Create: `components/recipes/ScaleControl.tsx`, `app/(app)/recipes/[id]/page.tsx`
- Create: `e2e/recipes-detail.spec.ts`

**Interfaces:**
- Consumes: `getRecipe` (Task 6), `scaleQuantity`/`scaleServings`/`formatQuantity` (Task 3).
- Produces: full-screen detail — title, scaled ingredient list, full-width instructions, notes, tags; a `ScaleControl` (1x/2x/3x) that recomputes displayed quantities and servings client-side and shows a badge when not 1x.

- [ ] **Step 1: `components/recipes/ScaleControl.tsx`** (client — receives base ingredients + servings, renders the scaled list + control)

```tsx
"use client";
import { useState } from "react";
import { scaleQuantity, scaleServings, formatQuantity } from "@/lib/recipes/scale";

type Ing = { quantity: number | null; unit: string | null; name: string };

export default function ScaleControl({ servings, ingredients }: { servings: number; ingredients: Ing[] }) {
  const [mult, setMult] = useState(1);
  return (
    <div>
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((m) => (
          <button key={m} type="button" onClick={() => setMult(m)}
            className={`rounded-full px-3 py-1 ${mult === m ? "bg-canyon text-white" : "border-2 border-buttercream"}`}>
            {m}x
          </button>
        ))}
        {mult !== 1 && (
          <span className="rounded-full bg-olive px-3 py-1 text-sm font-bold text-white">{mult}x scaled</span>
        )}
        <span className="ml-auto text-sm text-ink/60">Serves {scaleServings(servings, mult)}</span>
      </div>
      <ul className="mt-3 flex flex-col gap-1">
        {ingredients.map((ing, i) => (
          <li key={i}>
            {formatQuantity(scaleQuantity(ing.quantity, mult))} {ing.unit ?? ""} {ing.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: `app/(app)/recipes/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getRecipe } from "@/lib/recipes/queries";
import ScaleControl from "@/components/recipes/ScaleControl";

export default async function RecipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-canyon">{recipe.title}</h1>
        <div className="flex gap-2">
          <Link href={`/recipes/${recipe.id}/edit`} className="rounded-full border-2 border-buttercream px-3 py-1">Edit</Link>
          <Link href={`/recipes/${recipe.id}/print`} className="rounded-full border-2 border-buttercream px-3 py-1">Print</Link>
        </div>
      </div>

      <section className="mt-4">
        <h2 className="text-xl">Ingredients</h2>
        <ScaleControl servings={recipe.servings} ingredients={recipe.ingredients} />
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Instructions</h2>
        <p className="mt-2 whitespace-pre-wrap leading-8">{recipe.instructions}</p>
      </section>

      {recipe.notes && (
        <section className="mt-6">
          <h2 className="text-xl">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap">{recipe.notes}</p>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write e2e `e2e/recipes-detail.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("scaling doubles quantities and shows the scaled badge", async ({ page }) => {
  const unique = `Scale ${Date.now()}`;
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(unique);
  await page.getByLabel("Servings").fill("4");
  await page.getByLabel("Paste ingredients").fill("2 cups flour");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Mix.");
  await page.getByRole("button", { name: /save recipe/i }).click();

  await expect(page.getByRole("heading", { name: unique })).toBeVisible();
  await expect(page.getByText(/2 cups flour/)).toBeVisible();
  await page.getByRole("button", { name: "2x" }).click();
  await expect(page.getByText(/2x scaled/)).toBeVisible();
  await expect(page.getByText(/4 cups flour/)).toBeVisible();
  await expect(page.getByText(/Serves 8/)).toBeVisible();
});
```

- [ ] **Step 4: Run e2e — confirm pass**

Run: `npm run e2e -- recipes-detail.spec.ts`
Expected: PASS.

- [ ] **Step 5: Re-enable the Task 7 heading assertion** (if it was temporarily changed) and run `npm run e2e -- recipes-create.spec.ts` — Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add full-screen recipe detail with scaling"
```

---

## Task 10: Edit and delete a recipe

**Files:**
- Create: `app/(app)/recipes/[id]/edit/page.tsx`
- Create: `e2e/recipes-edit.spec.ts`

**Interfaces:**
- Consumes: `getRecipe` (Task 6), `updateRecipe`/`deleteRecipe` (Task 6), `RecipeForm` (Task 7). Maps the recipe's flag booleans and tag ids into the form's `initial` prop.

- [ ] **Step 1: `app/(app)/recipes/[id]/edit/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getRecipe, listTags } from "@/lib/recipes/queries";
import { updateRecipe, deleteRecipe } from "@/lib/recipes/actions";
import RecipeForm from "@/components/recipes/RecipeForm";

const FLAG_NAMES = ["easyScaleable","veggieForward","runningRecovery","lowCalorie","davisFavorite","courtneyFavorite","fellowshipFav","freezerFriendly","dislike"] as const;

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [recipe, tags] = await Promise.all([getRecipe(id), listTags()]);
  if (!recipe) notFound();

  const flags: Record<string, boolean> = {};
  for (const f of FLAG_NAMES) flags[f] = (recipe as Record<string, unknown>)[f] as boolean;

  const update = updateRecipe.bind(null, id);
  const remove = deleteRecipe.bind(null, id);

  return (
    <div className="p-2">
      <h1 className="px-6 pt-6 text-3xl text-canyon">Edit recipe</h1>
      <RecipeForm
        action={update}
        tags={tags}
        submitLabel="Save changes"
        initial={{
          title: recipe.title,
          servings: recipe.servings,
          instructions: recipe.instructions,
          notes: recipe.notes,
          ingredients: recipe.ingredients.map((i) => ({ quantity: i.quantity, unit: i.unit, name: i.name })),
          tagIds: recipe.tags.map((t) => t.id),
          flags,
          tasteRating: recipe.tasteRating,
          costRating: recipe.costRating,
        }}
      />
      <form action={remove} className="mx-auto max-w-2xl px-6 pb-10">
        <button type="submit" className="rounded-full border-2 border-canyon px-4 py-2 text-canyon">Delete recipe</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Write e2e `e2e/recipes-edit.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("edit changes the title", async ({ page }) => {
  const unique = `Edit ${Date.now()}`;
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(unique);
  await page.getByLabel("Paste ingredients").fill("1 lb chicken");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Cook.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: unique })).toBeVisible();

  await page.getByRole("link", { name: /edit/i }).click();
  const changed = `${unique} updated`;
  await page.getByLabel("Title").fill(changed);
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(page.getByRole("heading", { name: changed })).toBeVisible();
});
```

- [ ] **Step 3: Run e2e — confirm pass**

Run: `npm run e2e -- recipes-edit.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add recipe edit and delete"
```

---

## Task 11: Print view (half-sheet)

**Files:**
- Create: `app/(app)/recipes/[id]/print/page.tsx`, `app/(app)/recipes/[id]/print/print.css`
- Create: `e2e/recipes-print.spec.ts`

**Interfaces:**
- Consumes: `getRecipe` (Task 6). Renders title, ingredients (base 1x), instructions, and notes (if they fit) with print CSS sized for half a sheet or smaller; no app chrome.

- [ ] **Step 1: `app/(app)/recipes/[id]/print/print.css`**

```css
@media print {
  nav, aside { display: none !important; }
  @page { size: 5.5in 8.5in; margin: 0.4in; }
  body { background: #fff; }
}
.print-card { font-size: 12px; line-height: 1.4; }
```

- [ ] **Step 2: `app/(app)/recipes/[id]/print/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import { getRecipe } from "@/lib/recipes/queries";
import { formatQuantity } from "@/lib/recipes/scale";
import "./print.css";

export default async function PrintRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = await getRecipe(id);
  if (!recipe) notFound();

  return (
    <div className="print-card mx-auto max-w-[5in] p-4">
      <h1 className="text-xl text-canyon">{recipe.title}</h1>
      <p className="text-sm">Serves {recipe.servings}</p>
      <h2 className="mt-2 font-bold">Ingredients</h2>
      <ul>
        {recipe.ingredients.map((i) => (
          <li key={i.id}>{formatQuantity(i.quantity)} {i.unit ?? ""} {i.name}</li>
        ))}
      </ul>
      <h2 className="mt-2 font-bold">Instructions</h2>
      <p className="whitespace-pre-wrap">{recipe.instructions}</p>
      {recipe.notes && (<><h2 className="mt-2 font-bold">Notes</h2><p className="whitespace-pre-wrap">{recipe.notes}</p></>)}
    </div>
  );
}
```

- [ ] **Step 3: Write e2e `e2e/recipes-print.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("print page shows title, ingredients, and instructions", async ({ page }) => {
  const unique = `Print ${Date.now()}`;
  await page.goto("/recipes/new");
  await page.getByLabel("Title").fill(unique);
  await page.getByLabel("Paste ingredients").fill("2 cups flour");
  await page.getByRole("button", { name: /split into rows/i }).click();
  await page.getByLabel("Instructions").fill("Bake it.");
  await page.getByRole("button", { name: /save recipe/i }).click();
  await expect(page.getByRole("heading", { name: unique })).toBeVisible();

  await page.getByRole("link", { name: /print/i }).click();
  await expect(page.getByRole("heading", { name: unique })).toBeVisible();
  await expect(page.getByText(/2 cups flour/)).toBeVisible();
  await expect(page.getByText(/Bake it\./)).toBeVisible();
});
```

- [ ] **Step 4: Run e2e — confirm pass**

Run: `npm run e2e -- recipes-print.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add half-sheet recipe print view"
```

---

## Task 12: Full suite + recipes empty-state illustration slot

**Files:**
- Modify: `components/ui/EmptyState.tsx` (swap emoji for `<img>` with fallback)
- Create: `public/illustrations/.gitkeep` already exists; document `recipes-empty.png`

**Interfaces:**
- Produces: EmptyState renders `public/illustrations/recipes-empty.png` if present, else the placeholder (same pattern as `HeroIllustration`).

- [ ] **Step 1: PROMPT THE USER** to (optionally) upload `public/illustrations/recipes-empty.png` (bold/flat/abstract, ~600×600). Proceed with placeholder if not ready.

- [ ] **Step 2: Update `components/ui/EmptyState.tsx` to use an image with fallback**

```tsx
"use client";
import Image from "next/image";
import { useState } from "react";

export default function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col items-center gap-3 p-12 text-center">
      {failed ? (
        <div aria-hidden className="flex h-32 w-32 items-center justify-center rounded-3xl bg-buttercream text-5xl">🍽️</div>
      ) : (
        <Image src="/illustrations/recipes-empty.png" alt="" width={160} height={160}
          onError={() => setFailed(true)} className="h-32 w-32 object-contain" />
      )}
      <p className="text-xl">{title}</p>
      {hint && <p className="text-ink/70">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Run the FULL suite**

Run: `npm run test` then `npm run e2e`
Expected: all unit tests pass; all e2e specs pass.

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: compiles with no type errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add recipes empty-state illustration slot"
```

---

## Self-Review

**Spec coverage (§4 Recipes):**
- 4.1 data model (title, structured ingredients, instructions, notes, equipment, servings, tags, flags, ratings) → Task 1 ✓
- 4.2 one long scrolling add form with paste-and-split → Task 7 ✓
- 4.3 scaling 1x/2x/3x + badge, instructions not scaled → Task 9 ✓
- 4.4 equipment auto-detection → Task 4 (logic) + Task 6 (applied on save) ✓
- 4.5 tags extensible + grouped → Task 1 (seed) + Task 7 TagPicker (extensible add noted in Step 4) + Task 8 filter ✓
- 4.6 flags incl. Dislike → Task 1 (fields) + Task 7 (toggles) ✓
- 4.7 ratings 1–5, blank allowed → Task 1 (nullable) + Task 7 (StarRating) ✓
- 4.8 search (title + ingredients) + multi-facet filter → Task 5 + Task 8 ✓
- Printing (§7) half-sheet, title/ingredients/instructions/notes → Task 11 ✓
- 4.9 add-to-plan → intentionally deferred to Phase 3 (noted in Global Constraints) ✓
- Illustration #3 (recipes empty state) → Task 12 ✓

**Placeholder scan:** One soft spot — Task 7 Step 4 notes inline "add a new tag" extensibility as an implementer responsibility with a concrete instruction (small "+ add" input POSTing a `createTag` server action). The reviewer must confirm it exists or record it. All other steps contain complete code.

**Type consistency:** `ParsedIngredient {quantity,unit,name}` consistent across ingredients.ts, actions.ts, IngredientRows, ScaleControl. Flag property names (`fellowshipFav`, etc.) match between schema (Task 1), actions `FLAG_NAMES` (Task 6), FlagToggles (Task 7), and edit page (Task 10). `RecipeFilters` shape matches between filters.ts (Task 5), queries.ts (Task 6), and recipes page (Task 8).

**Note for implementer/reviewer:** the "extensible tag add" (spec 4.5) is the one under-specified interaction; implement the `createTag` server action + inline input during Task 7, and the task reviewer should treat its absence as a spec gap, not a Minor.
