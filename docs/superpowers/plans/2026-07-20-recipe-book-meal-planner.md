# Recipe Book — Meal Planner (Phase 3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Plan tab — a Monday–Sunday weekly meal grid with default + custom slots that hold either a recipe (at a chosen scale) or a free-text note, week-to-week navigation with auto-saved history, a filtered recipe picker, a "surprise me" auto-fill, and an "add to plan" action from recipes.

**Architecture:** Extends the Recipes app. A new `PlanSlot` model stores only filled/created slots keyed by `(weekStart, dayIndex, slotKey)` — the default per-day slot *layout* is a code constant, so empty default slots cost no rows. Weeks are identified purely by their Monday date (no Week table); "history" is any week that has slots. Pure logic (week-date math, default-slot layout, surprise-me selection) lives in unit-tested modules under `lib/plan/`. Writes go through Server Actions; the grid is a server component with focused client components for the slide-up pickers and the surprise button. Behavior is verified with Playwright e2e against the Neon dev branch.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Prisma 6 + Neon Postgres, Tailwind v4, Vitest, Playwright.

## Global Constraints

- **Cost:** $0/month — free tiers only; no paid services.
- **Node:** 24 LTS. **Auth:** all plan routes behind the existing shared-password proxy.
- **Palette (exact):** Canyon `#DF6D41`, Buttercream `#F7D89A`, Morning Sky `#8DA6CC`, Olive Grove `#AAA648`, cream `#FDF6E7`, card `#FFFFFF`, ink `#2F2A24` (Tailwind names `canyon/buttercream/sky/olive/cream/card/ink`). **Fonts:** Fredoka headings, Nunito body. Sentence case copy.
- **Week model:** Monday–Sunday. `dayIndex` 0=Mon … 6=Sun. **Fri/Sat/Sun (indices 4,5,6) = "weekend"; Mon–Thu (0–3) = "work"** — used only to bias which tagged recipes the picker suggests.
- **Default slots:** Mon–Thu → `breakfast`, `lunch-courtney`, `lunch-davis`, `dinner`. Fri–Sun → `breakfast`, `lunch`, `dinner`.
- **A slot holds EITHER a recipe (with a 1x/2x/3x scale) OR a free-text note — never both.**
- **Custom slots** (spec 5.3): any day, user-typed label, behaves like a default slot.
- **Surprise me** (spec 5.4): fills empty slots from recipes matching active filters; **always excludes `dislike`-flagged recipes.**
- **Every week auto-saves** (no save button); navigation is ‹ prev / next › by week.
- **Reuse, do not duplicate:** consume the Recipes phase's `listRecipes`/`RecipeFilters`/`buildRecipeWhere`, `getRecipe`, tag/flag modules. The scale helpers (`scaleQuantity` etc.) already exist.
- **Out of scope (Phase 4):** the grocery list itself. Phase 3 only stores the slot's chosen `scale` so Phase 4 can compute quantities later.

---

## File Structure

- `prisma/schema.prisma` — add `PlanSlot` model
- `lib/plan/week.ts` + `.test.ts` — Monday math, week keys, range formatting
- `lib/plan/slots.ts` + `.test.ts` — default slot layout, `isWeekend`, slot labels
- `lib/plan/surprise.ts` + `.test.ts` — pure random selection for empty slots
- `lib/plan/queries.ts` — `getWeekPlan(weekStart)`, reuse recipe queries
- `lib/plan/actions.ts` — `setSlotRecipe`, `setSlotNote`, `clearSlot`, `addCustomSlot`, `removeCustomSlot`, `surpriseFill`
- `components/plan/PlanGrid.tsx` — the 7-column grid (server-rendered data, client interactions)
- `components/plan/WeekNav.tsx` — ‹ prev/next › + range label (client)
- `components/plan/SlotCell.tsx` — one slot: filled (recipe/note) or empty (client)
- `components/plan/RecipePickerSheet.tsx` — slide-up filtered recipe picker (client)
- `components/plan/NoteEditor.tsx` — inline free-text note (client)
- `components/plan/AddSlotButton.tsx` — custom slot creator (client)
- `components/plan/SurpriseButton.tsx` — surprise-me trigger (client)
- `components/recipes/AddToPlanButton.tsx` — from a recipe: choose week/day/slot (client) — closes spec 4.9
- `app/(app)/plan/page.tsx` — grid page (reads `?week=` param)
- `e2e/plan-*.spec.ts`

---

## Task 1: PlanSlot data model

**Files:** Modify `prisma/schema.prisma`.

**Interfaces:**
- Produces model `PlanSlot`: `id`, `weekStart DateTime @db.Date`, `dayIndex Int` (0–6), `slotKey String`, `label String`, `sortOrder Int`, `note String?`, `scale Int @default(1)`, `recipe Recipe? @relation(...)`, `recipeId String?`, `createdAt`, `updatedAt`; unique `[weekStart, dayIndex, slotKey]`; index `[weekStart]`. A row exists only for a filled default slot or any custom slot.

- [ ] **Step 1: Add the model**

```prisma
model PlanSlot {
  id        String   @id @default(cuid())
  weekStart DateTime @db.Date
  dayIndex  Int
  slotKey   String
  label     String
  sortOrder Int      @default(0)
  note      String?
  scale     Int      @default(1)
  recipe    Recipe?  @relation(fields: [recipeId], references: [id], onDelete: SetNull)
  recipeId  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([weekStart, dayIndex, slotKey])
  @@index([weekStart])
}
```
Add the back-relation to `Recipe`: inside `model Recipe { … }` add `planSlots PlanSlot[]`.

- [ ] **Step 2: Migrate**

Run: `npx prisma migrate dev --name plan_slots`
Expected: migration applied to the dev branch; client regenerated.

- [ ] **Step 3: Health still serves**

Create `e2e/plan-schema.spec.ts`:
```ts
import { expect, test } from "@playwright/test";
test("health ok after plan schema change", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
});
```
Run: `npm run e2e -- plan-schema.spec.ts` → PASS.

- [ ] **Step 4: Commit** — `git commit -am "feat: add PlanSlot model"` (after `git add -A`).

---

## Task 2: Week date utilities

**Files:** Create `lib/plan/week.ts`, `lib/plan/week.test.ts`.

**Interfaces:**
- `mondayOf(date: Date): Date` — the Monday (00:00, UTC-normalized) of that date's week.
- `weekKey(monday: Date): string` — `"YYYY-MM-DD"`.
- `parseWeekKey(key: string): Date` — inverse (returns that Monday at UTC midnight); invalid → `mondayOf(today)`.
- `addWeeks(monday: Date, n: number): Date`.
- `formatWeekRange(monday: Date): string` — e.g. `"Jul 21 – 27"` (same month) / `"Jul 28 – Aug 3"`.

- [ ] **Step 1: Failing tests `lib/plan/week.test.ts`**

```ts
import { expect, test } from "vitest";
import { addWeeks, formatWeekRange, mondayOf, parseWeekKey, weekKey } from "./week";

test("mondayOf returns Monday for a mid-week date", () => {
  // 2026-07-22 is a Wednesday → Monday 2026-07-20
  expect(weekKey(mondayOf(new Date("2026-07-22T12:00:00Z")))).toBe("2026-07-20");
});

test("mondayOf on a Sunday returns that week's Monday", () => {
  // 2026-07-26 is Sunday → Monday 2026-07-20
  expect(weekKey(mondayOf(new Date("2026-07-26T00:00:00Z")))).toBe("2026-07-20");
});

test("weekKey/parseWeekKey round-trip", () => {
  const m = parseWeekKey("2026-07-20");
  expect(weekKey(m)).toBe("2026-07-20");
});

test("parseWeekKey invalid falls back to this week's Monday", () => {
  const m = parseWeekKey("not-a-date");
  // result is a Monday
  expect(m.getUTCDay()).toBe(1);
});

test("addWeeks moves by 7-day multiples", () => {
  expect(weekKey(addWeeks(parseWeekKey("2026-07-20"), 1))).toBe("2026-07-27");
  expect(weekKey(addWeeks(parseWeekKey("2026-07-20"), -1))).toBe("2026-07-13");
});

test("formatWeekRange same month", () => {
  expect(formatWeekRange(parseWeekKey("2026-07-20"))).toBe("Jul 20 – 26");
});

test("formatWeekRange spanning months", () => {
  expect(formatWeekRange(parseWeekKey("2026-07-27"))).toBe("Jul 27 – Aug 2");
});
```

- [ ] **Step 2: Run → FAIL** (`npm run test -- week`).

- [ ] **Step 3: Implement `lib/plan/week.ts`**

```ts
function atUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function mondayOf(date: Date): Date {
  const d = atUtcMidnight(date);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

export function weekKey(monday: Date): string {
  return atUtcMidnight(monday).toISOString().slice(0, 10);
}

export function parseWeekKey(key: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return mondayOf(new Date());
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return mondayOf(d);
}

export function addWeeks(monday: Date, n: number): Date {
  const d = atUtcMidnight(monday);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return d;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function formatWeekRange(monday: Date): string {
  const start = atUtcMidnight(monday);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const sM = MONTHS[start.getUTCMonth()];
  const eM = MONTHS[end.getUTCMonth()];
  const sD = start.getUTCDate();
  const eD = end.getUTCDate();
  return sM === eM ? `${sM} ${sD} – ${eD}` : `${sM} ${sD} – ${eM} ${eD}`;
}
```

- [ ] **Step 4: Run → PASS** (`npm run test -- week`).
- [ ] **Step 5: Commit** — `feat: add week date utilities`.

---

## Task 3: Default slot layout

**Files:** Create `lib/plan/slots.ts`, `lib/plan/slots.test.ts`.

**Interfaces:**
- `type SlotDef = { slotKey: string; label: string; sortOrder: number }`
- `isWeekend(dayIndex: number): boolean` — true for 4,5,6.
- `defaultSlotsForDay(dayIndex: number): SlotDef[]` — Mon–Thu vs Fri–Sun sets.
- `DAY_LABELS: string[]` — `["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]`.

- [ ] **Step 1: Failing tests `lib/plan/slots.test.ts`**

```ts
import { expect, test } from "vitest";
import { defaultSlotsForDay, isWeekend } from "./slots";

test("weekend detection", () => {
  expect([0,1,2,3].map(isWeekend)).toEqual([false,false,false,false]);
  expect([4,5,6].map(isWeekend)).toEqual([true,true,true]);
});

test("work day has 4 slots incl. two lunches", () => {
  const keys = defaultSlotsForDay(0).map((s) => s.slotKey);
  expect(keys).toEqual(["breakfast","lunch-courtney","lunch-davis","dinner"]);
});

test("weekend day has 3 slots", () => {
  const keys = defaultSlotsForDay(5).map((s) => s.slotKey);
  expect(keys).toEqual(["breakfast","lunch","dinner"]);
});
```

- [ ] **Step 2: Run → FAIL**.

- [ ] **Step 3: Implement `lib/plan/slots.ts`**

```ts
export type SlotDef = { slotKey: string; label: string; sortOrder: number };

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function isWeekend(dayIndex: number): boolean {
  return dayIndex >= 4;
}

const WORK: SlotDef[] = [
  { slotKey: "breakfast", label: "Breakfast", sortOrder: 0 },
  { slotKey: "lunch-courtney", label: "Lunch (Courtney)", sortOrder: 1 },
  { slotKey: "lunch-davis", label: "Lunch (Davis)", sortOrder: 2 },
  { slotKey: "dinner", label: "Dinner", sortOrder: 3 },
];

const WEEKEND: SlotDef[] = [
  { slotKey: "breakfast", label: "Breakfast", sortOrder: 0 },
  { slotKey: "lunch", label: "Lunch", sortOrder: 1 },
  { slotKey: "dinner", label: "Dinner", sortOrder: 2 },
];

export function defaultSlotsForDay(dayIndex: number): SlotDef[] {
  return isWeekend(dayIndex) ? WEEKEND : WORK;
}
```

- [ ] **Step 4: Run → PASS**.
- [ ] **Step 5: Commit** — `feat: add default meal-slot layout`.

---

## Task 4: Surprise-me selection (pure)

**Files:** Create `lib/plan/surprise.ts`, `lib/plan/surprise.test.ts`.

**Interfaces:**
- `pickRandom<T>(pool: T[], count: number, rng?: () => number): T[]` — returns up to `count` distinct items chosen via `rng` (default `Math.random`); if `count >= pool.length` returns a shuffled copy of the whole pool; never repeats.

- [ ] **Step 1: Failing tests `lib/plan/surprise.test.ts`**

```ts
import { expect, test } from "vitest";
import { pickRandom } from "./surprise";

test("returns the requested count of distinct items", () => {
  const out = pickRandom([1, 2, 3, 4, 5], 3, seq([0, 0, 0]));
  expect(out).toHaveLength(3);
  expect(new Set(out).size).toBe(3);
});

test("count >= pool returns all items (no repeats)", () => {
  const out = pickRandom([1, 2, 3], 10);
  expect(new Set(out)).toEqual(new Set([1, 2, 3]));
  expect(out).toHaveLength(3);
});

test("empty pool returns empty", () => {
  expect(pickRandom([], 3)).toEqual([]);
});

// deterministic rng that yields the given fractions in order, then 0
function seq(values: number[]): () => number {
  let i = 0;
  return () => values[i++] ?? 0;
}
```

- [ ] **Step 2: Run → FAIL**.

- [ ] **Step 3: Implement `lib/plan/surprise.ts`**

```ts
export function pickRandom<T>(pool: T[], count: number, rng: () => number = Math.random): T[] {
  const items = [...pool];
  // Fisher–Yates using rng
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, Math.max(0, count));
}
```

- [ ] **Step 4: Run → PASS**.
- [ ] **Step 5: Commit** — `feat: add surprise-me selection helper`.

---

## Task 5: Plan queries + slot server actions

**Files:** Create `lib/plan/queries.ts`, `lib/plan/actions.ts`, `lib/plan/actions.test.ts`.

**Interfaces:**
- `getWeekPlan(weekStartKey: string)` → `{ weekStart: Date; slots: PlanSlot[] }` (all PlanSlot rows for that Monday, ordered by dayIndex then sortOrder).
- Server actions (all `"use server"`, revalidate `/plan`):
  - `setSlotRecipe(weekKey: string, dayIndex: number, slotKey: string, label: string, sortOrder: number, recipeId: string, scale: number)` — upsert row with recipe (clears note).
  - `setSlotNote(weekKey, dayIndex, slotKey, label, sortOrder, note: string)` — upsert row with note (clears recipe).
  - `clearSlot(weekKey, dayIndex, slotKey)` — delete the row.
  - `addCustomSlot(weekKey, dayIndex, label: string)` — create an empty custom slot (slotKey derived: `custom-<timestamp>`; sortOrder after defaults).
  - `removeCustomSlot(weekKey, dayIndex, slotKey)` — delete.
  - `surpriseFill(weekKey, emptyCoords: {dayIndex,slotKey,label,sortOrder}[], filters: RecipeFilters)` — query eligible recipes (`buildRecipeWhere(filters)` AND `dislike:false`), `pickRandom` to fill the given empty coords with `scale:1`.
- Pure helper (unit-tested): `slotUpsertData(...)` shaping — OR test `customSlotKey()` uniqueness. Keep the DB-touching actions verified via e2e.

- [ ] **Step 1: Failing unit test for the pure key helper `lib/plan/actions.test.ts`**

```ts
import { expect, test } from "vitest";
import { customSlotKey } from "./actions";

test("customSlotKey is prefixed and unique-ish", () => {
  const a = customSlotKey();
  const b = customSlotKey();
  expect(a.startsWith("custom-")).toBe(true);
  expect(a).not.toBe(b);
});
```
(If `customSlotKey` uses a timestamp, ensure uniqueness by appending a random suffix.)

- [ ] **Step 2: Run → FAIL** (`npm run test -- plan/actions`).

- [ ] **Step 3: Implement `lib/plan/actions.ts`** (actions + `customSlotKey`)

```ts
"use server";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { parseWeekKey } from "./week";
import { pickRandom } from "./surprise";
import { buildRecipeWhere, type RecipeFilters } from "@/lib/recipes/filters";

export function customSlotKey(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function upsertSlot(
  weekKey: string, dayIndex: number, slotKey: string,
  label: string, sortOrder: number,
  data: { recipeId?: string | null; note?: string | null; scale?: number },
) {
  const weekStart = parseWeekKey(weekKey);
  await prisma.planSlot.upsert({
    where: { weekStart_dayIndex_slotKey: { weekStart, dayIndex, slotKey } },
    update: { label, sortOrder, ...data },
    create: { weekStart, dayIndex, slotKey, label, sortOrder, ...data },
  });
  revalidatePath("/plan");
}

export async function setSlotRecipe(weekKey: string, dayIndex: number, slotKey: string, label: string, sortOrder: number, recipeId: string, scale: number) {
  await upsertSlot(weekKey, dayIndex, slotKey, label, sortOrder, { recipeId, note: null, scale });
}

export async function setSlotNote(weekKey: string, dayIndex: number, slotKey: string, label: string, sortOrder: number, note: string) {
  await upsertSlot(weekKey, dayIndex, slotKey, label, sortOrder, { note, recipeId: null, scale: 1 });
}

export async function clearSlot(weekKey: string, dayIndex: number, slotKey: string) {
  const weekStart = parseWeekKey(weekKey);
  await prisma.planSlot.deleteMany({ where: { weekStart, dayIndex, slotKey } });
  revalidatePath("/plan");
}

export async function addCustomSlot(weekKey: string, dayIndex: number, label: string) {
  const trimmed = label.trim();
  if (!trimmed) return;
  await upsertSlot(weekKey, dayIndex, customSlotKey(), trimmed, 100, {});
}

export async function removeCustomSlot(weekKey: string, dayIndex: number, slotKey: string) {
  await clearSlot(weekKey, dayIndex, slotKey);
}

export async function surpriseFill(
  weekKey: string,
  emptyCoords: { dayIndex: number; slotKey: string; label: string; sortOrder: number }[],
  filters: RecipeFilters,
) {
  const where = { AND: [buildRecipeWhere(filters), { dislike: false }] };
  const eligible = await prisma.recipe.findMany({ where, select: { id: true } });
  const picks = pickRandom(eligible, emptyCoords.length);
  const weekStart = parseWeekKey(weekKey);
  await prisma.$transaction(
    picks.map((r, i) => {
      const c = emptyCoords[i];
      return prisma.planSlot.upsert({
        where: { weekStart_dayIndex_slotKey: { weekStart, dayIndex: c.dayIndex, slotKey: c.slotKey } },
        update: { label: c.label, sortOrder: c.sortOrder, recipeId: r.id, note: null, scale: 1 },
        create: { weekStart, dayIndex: c.dayIndex, slotKey: c.slotKey, label: c.label, sortOrder: c.sortOrder, recipeId: r.id, scale: 1 },
      });
    }),
  );
  revalidatePath("/plan");
}
```

- [ ] **Step 4: Run → PASS** (`npm run test -- plan/actions`).

- [ ] **Step 5: Implement `lib/plan/queries.ts`**

```ts
import prisma from "@/lib/db";
import { parseWeekKey } from "./week";

export async function getWeekPlan(weekStartKey: string) {
  const weekStart = parseWeekKey(weekStartKey);
  const slots = await prisma.planSlot.findMany({
    where: { weekStart },
    include: { recipe: { select: { id: true, title: true } } },
    orderBy: [{ dayIndex: "asc" }, { sortOrder: "asc" }],
  });
  return { weekStart, slots };
}
```

- [ ] **Step 6: Commit** — `feat: add plan queries and slot actions`.

---

## Task 6: Plan grid page + week navigation

**Files:** Create `components/plan/WeekNav.tsx`, `components/plan/PlanGrid.tsx`, `components/plan/SlotCell.tsx` (empty/filled read-only first), modify `app/(app)/plan/page.tsx`. Create `e2e/plan-grid.spec.ts`.

**Interfaces:**
- Page reads `?week=YYYY-MM-DD` (default = this week's Monday via `mondayOf(new Date())`), calls `getWeekPlan`, and renders the 7-day grid. For each day it renders `defaultSlotsForDay(dayIndex)` plus any custom slots present in the data; each slot shows its stored recipe/note or an empty state. `WeekNav` links to `?week=` for prev/next using `addWeeks`.

- [ ] **Step 1: `components/plan/WeekNav.tsx`** (client) — prev/next Links + `formatWeekRange` label.

```tsx
"use client";
import Link from "next/link";
import { addWeeks, formatWeekRange, parseWeekKey, weekKey } from "@/lib/plan/week";

export default function WeekNav({ weekStartKey }: { weekStartKey: string }) {
  const monday = parseWeekKey(weekStartKey);
  const prev = weekKey(addWeeks(monday, -1));
  const next = weekKey(addWeeks(monday, 1));
  return (
    <div className="flex items-center gap-4">
      <Link href={`/plan?week=${prev}`} aria-label="Previous week" className="rounded-full border-2 border-buttercream px-3 py-1">‹</Link>
      <span className="font-bold">{formatWeekRange(monday)}</span>
      <Link href={`/plan?week=${next}`} aria-label="Next week" className="rounded-full border-2 border-buttercream px-3 py-1">›</Link>
    </div>
  );
}
```

- [ ] **Step 2: `components/plan/SlotCell.tsx`** (client, read-first) — renders filled (recipe title on sky, or note on white) vs empty (dashed "+"). Full interactivity added in Task 7; here it renders content + fires a callback prop `onOpen()` on click.

```tsx
"use client";
type SlotData = { label: string; note: string | null; recipe: { id: string; title: string } | null };
export default function SlotCell({ slot, onOpen }: { slot: SlotData; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full rounded-lg p-2 text-left text-sm">
      <span className="block text-[10px] uppercase text-ink/50">{slot.label}</span>
      {slot.recipe ? (
        <span className="mt-1 block rounded-md bg-sky px-2 py-1">{slot.recipe.title}</span>
      ) : slot.note ? (
        <span className="mt-1 block rounded-md bg-card px-2 py-1">{slot.note}</span>
      ) : (
        <span className="mt-1 block rounded-md border-2 border-dashed border-buttercream px-2 py-1 text-ink/40">+ add</span>
      )}
    </button>
  );
}
```

- [ ] **Step 3: `components/plan/PlanGrid.tsx`** — merges default layout with stored slots into a per-day column list. (Client component receiving serializable slot data; owns which slot's sheet is open — sheets come in Task 7, so for now `onOpen` is a no-op placeholder that Task 7 wires.)

```tsx
"use client";
import { DAY_LABELS, defaultSlotsForDay } from "@/lib/plan/slots";
import SlotCell from "./SlotCell";

type Slot = { dayIndex: number; slotKey: string; label: string; sortOrder: number; note: string | null; recipe: { id: string; title: string } | null };

export default function PlanGrid({ weekStartKey, slots }: { weekStartKey: string; slots: Slot[] }) {
  const byDay = (d: number) => {
    const stored = slots.filter((s) => s.dayIndex === d);
    const defaults = defaultSlotsForDay(d).map((def) => {
      const hit = stored.find((s) => s.slotKey === def.slotKey);
      return hit ?? { dayIndex: d, ...def, note: null, recipe: null };
    });
    const customs = stored.filter((s) => !defaultSlotsForDay(d).some((def) => def.slotKey === s.slotKey));
    return [...defaults, ...customs].sort((a, b) => a.sortOrder - b.sortOrder);
  };
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
      {DAY_LABELS.map((label, d) => (
        <div key={d}>
          <p className={`text-center text-sm font-bold ${d >= 4 ? "text-canyon" : "text-ink"}`}>{label}</p>
          <div className="mt-2 flex flex-col gap-2">
            {byDay(d).map((s) => (
              <SlotCell key={s.slotKey} slot={s} onOpen={() => {}} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Rewrite `app/(app)/plan/page.tsx`**

```tsx
import { getWeekPlan } from "@/lib/plan/queries";
import { mondayOf, weekKey } from "@/lib/plan/week";
import WeekNav from "@/components/plan/WeekNav";
import PlanGrid from "@/components/plan/PlanGrid";

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const weekStartKey = sp.week ?? weekKey(mondayOf(new Date()));
  const { slots } = await getWeekPlan(weekStartKey);
  const data = slots.map((s) => ({
    dayIndex: s.dayIndex, slotKey: s.slotKey, label: s.label, sortOrder: s.sortOrder,
    note: s.note, recipe: s.recipe ? { id: s.recipe.id, title: s.recipe.title } : null,
  }));
  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl text-canyon">This week</h1>
        <WeekNav weekStartKey={weekStartKey} />
      </div>
      <div className="mt-6 overflow-x-auto">
        <PlanGrid weekStartKey={weekStartKey} slots={data} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: e2e `e2e/plan-grid.spec.ts`** — login; go to `/plan`; assert day headers Mon…Sun visible and next/prev change the range label + URL.

```ts
import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});
test("plan grid shows all seven days and navigates weeks", async ({ page }) => {
  await page.goto("/plan");
  for (const d of ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]) {
    await expect(page.getByText(d, { exact: true }).first()).toBeVisible();
  }
  await page.getByRole("link", { name: "Next week" }).click();
  await expect(page).toHaveURL(/\/plan\?week=\d{4}-\d{2}-\d{2}/);
});
```

- [ ] **Step 6: Run → PASS** (`npm run e2e -- plan-grid.spec.ts`).
- [ ] **Step 7: Commit** — `feat: add weekly plan grid with week navigation`.

---

## Task 7: Slot interactions — recipe picker + note editor

**Files:** Create `components/plan/RecipePickerSheet.tsx`, `components/plan/NoteEditor.tsx`; wire them into `PlanGrid`/`SlotCell` (open a slide-up when a slot is clicked; pick recipe → `setSlotRecipe`, or write note → `setSlotNote`, or clear). Create `e2e/plan-slot.spec.ts`. The picker's recipe list comes from a server-fetched `listRecipes` passed into the grid as a prop; the picker biases the shown filter chips toward weekend vs work tags based on the slot's `dayIndex` (`isWeekend`).

- [ ] **Step 1** Fetch recipes for the picker in `plan/page.tsx` (`listRecipes({})`, map to `{id,title,tags}`) and pass into `PlanGrid`.
- [ ] **Step 2** `NoteEditor.tsx` — small form: text input + save (calls `setSlotNote`) + a "clear" button (calls `clearSlot`).
- [ ] **Step 3** `RecipePickerSheet.tsx` — a slide-up (normal-flow overlay, NOT `position:fixed`) listing recipes with a search box; selecting one calls `setSlotRecipe(...scale=1)`; includes a "just a note instead" toggle rendering `NoteEditor`; a scale selector (1x/2x/3x) sets the stored `scale`.
- [ ] **Step 4** `SlotCell`/`PlanGrid` open the sheet for the clicked slot (track open coord in grid state).
- [ ] **Step 5** e2e `e2e/plan-slot.spec.ts`: create a recipe (via /recipes/new), go to /plan, click a Dinner slot, pick that recipe, assert its title appears in the slot; reload and assert it persists; then open it, clear it, assert it's empty again. Also: open a slot, add a note "Leftovers", assert it shows.
- [ ] **Step 6** `npx tsc --noEmit` + lint clean; run the e2e → PASS.
- [ ] **Step 7** Commit — `feat: add plan slot recipe picker and notes`.

(Implementer: reuse the Recipes phase's tag data for the picker's filter chips; for the weekend/work bias, when `isWeekend(dayIndex)` pre-select the matching "Weekend <meal>" occasion tag as a suggestion, else the "Work <meal>" one — but let the user clear it. Keep the sheet accessible: labelled inputs, Escape/close button.)

---

## Task 8: Custom slots

**Files:** Create `components/plan/AddSlotButton.tsx`; wire into each day column in `PlanGrid`. Create `e2e/plan-custom-slot.spec.ts`.

- [ ] **Step 1** `AddSlotButton.tsx` — a per-day "+ Add a slot" control: prompts for a label (inline input), calls `addCustomSlot(weekKey, dayIndex, label)`.
- [ ] **Step 2** Render it at the bottom of each day column in `PlanGrid`. Custom slots render like any slot (Task 7 interactions apply) and show a small "remove" affordance calling `removeCustomSlot`.
- [ ] **Step 3** e2e: on /plan, add a custom slot "Snack" to Saturday, assert it appears; fill it with a recipe; reload → persists; remove it → gone.
- [ ] **Step 4** tsc + lint clean; e2e → PASS.
- [ ] **Step 5** Commit — `feat: add custom meal-plan slots`.

---

## Task 9: Surprise me

**Files:** Create `components/plan/SurpriseButton.tsx`; add it to the plan header. Create `e2e/plan-surprise.spec.ts`.

**Interfaces:** The button collects the current week's EMPTY slot coordinates (from grid state) and the active picker filters, then calls `surpriseFill(weekKey, emptyCoords, filters)`.

- [ ] **Step 1** `SurpriseButton.tsx` — computes empty default+custom slot coords for the visible week, calls `surpriseFill` in a `useTransition`, then refreshes.
- [ ] **Step 2** Add to the plan page header next to `WeekNav`.
- [ ] **Step 3** e2e `e2e/plan-surprise.spec.ts`: seed ≥2 recipes (one flagged Dislike), open a fresh future week (`?week=` far ahead so it's empty), click Surprise, assert at least one slot now shows a recipe and NONE shows the disliked recipe's title.
- [ ] **Step 4** tsc + lint clean; e2e → PASS.
- [ ] **Step 5** Commit — `feat: add surprise-me auto-fill`.

---

## Task 10: Add to plan from a recipe (spec 4.9)

**Files:** Create `components/recipes/AddToPlanButton.tsx`; add it to the recipe detail page (`app/(app)/recipes/[id]/page.tsx`) and optionally the card. Create `e2e/plan-add-from-recipe.spec.ts`.

**Interfaces:** A button opening a slide-up: choose week (default current, via a small prev/next or a date input keyed to Mondays), day (Mon–Sun), and slot (the default slots for that day + any customs), then `setSlotRecipe(...)`. Returns to the recipe.

- [ ] **Step 1** `AddToPlanButton.tsx` — slide-up with week/day/slot selectors built from `mondayOf`/`addWeeks` + `defaultSlotsForDay`; on confirm calls `setSlotRecipe(weekKey, dayIndex, slotKey, label, sortOrder, recipeId, 1)`.
- [ ] **Step 2** Render on the recipe detail page header (next to Edit/Print).
- [ ] **Step 3** e2e: create a recipe, open it, "Add to plan" → pick this week + Wednesday + Dinner; go to /plan; assert the recipe title shows in Wednesday's Dinner slot.
- [ ] **Step 4** tsc + lint clean; e2e → PASS.
- [ ] **Step 5** Commit — `feat: add "add to plan" from a recipe`.

---

## Task 11: Full suite + plan empty-state polish

**Files:** Modify `app/(app)/plan/page.tsx` (a friendly first-time hint when the whole week is empty); run everything.

- [ ] **Step 1** When a week has zero stored slots, show a small sentence-case hint above the grid ("Nothing planned yet — tap a slot to add a meal, or hit Surprise me."). Do not hide the grid.
- [ ] **Step 2** Run FULL `npm run test` (all unit) and `npm run e2e` (all specs) — capture totals.
- [ ] **Step 3** `npm run build` (production build compiles) + `npx tsc --noEmit` clean.
- [ ] **Step 4** Commit — `feat: polish empty week state; finalize planner`.

---

## Self-Review

**Spec coverage (§5 + §4.9):**
- 5.1 Mon–Sun grid, Fri–Sun weekend bias → Task 3 + Task 6/7 ✓
- 5.2 default slots (work 4 incl. two lunches; weekend 3) → Task 3 ✓
- 5.3 slot holds recipe OR note; custom "+ add a slot" → Tasks 5,7,8 ✓
- 5.4 surprise-me from filters, excludes Dislike → Tasks 4,9 ✓
- 5.5 prev/next week nav, auto-save history → Tasks 5,6 (every write persists a row; no save button) ✓
- 4.9 add to plan from a recipe (week/day/slot) → Task 10 ✓
- Scale stored per slot for Phase 4 grocery → Task 1 (`scale`), set in Tasks 7/10 ✓

**Placeholder scan:** Tasks 7–10 give UI component responsibilities as directed steps (not full code) but each names exact files, the exact actions to call with signatures from Task 5, and a concrete e2e; the pure-logic tasks (2,3,4) carry complete code + tests. The slide-up sheets must use normal-flow overlays (not `position:fixed`) — noted for the implementer.

**Type consistency:** slot coordinate `{weekKey, dayIndex, slotKey, label, sortOrder}` and the action signatures in Task 5 are reused verbatim by Tasks 7–10. `RecipeFilters` reused from the Recipes phase. `parseWeekKey`/`weekKey`/`mondayOf`/`addWeeks` names consistent across week.ts consumers.

**Note for execution:** Phase 3 depends on the Phase 2 branch being merged first (it imports `@/lib/recipes/*` and adds a `Recipe` back-relation). Build Phase 3 on top of `main` after Phase 2 is merged, or branch from `phase-2-recipes`.
