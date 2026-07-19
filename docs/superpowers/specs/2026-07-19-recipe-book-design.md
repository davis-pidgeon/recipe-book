# Recipe Book — Design Spec

**Date:** 2026-07-19
**Status:** Approved design, ready for implementation planning
**Users:** Courtney (primary), Davis (views meal plan; can see everything)

---

## 1. Overview

A personal, single-household recipe book web app. It stores Courtney's recipes,
lets her tag/filter/search them, scale them for the week, build a weekly meal
plan, and generate a per-week grocery list. Accessible from iPhone and computer
with a single shared login. Built to run at **$0/month** on free hosting tiers,
with no paid AI or web-scraping dependencies.

### Goals
- One searchable home for all recipes (handwritten, Pinterest, ChatGPT/Claude chats).
- Fast weekly meal planning that matches the household's real Mon–Thu / Fri–Sun rhythm.
- Auto-generated grocery list from the week's plan.
- Clean, simple, happy visual design — nothing extra on screen.

### Non-goals (explicitly out of scope)
- Automated recipe import via scraping or AI parsing (paste-and-split instead).
- AI-generated meal plans (random "surprise me" fill instead).
- Smart ingredient/unit merging in the grocery list (simple alphabetical concatenation instead).
- Auto-adding items to a Kroger cart (open Kroger in a new tab instead).
- Multi-user accounts / per-user permissions (one shared login).
- Printing the grocery list.

---

## 2. Architecture

- **Front end / hosting:** Next.js app deployed on Vercel (free tier).
- **Data:** A hosted database on a free tier (e.g. a Vercel Marketplace Postgres
  such as Neon) for real-time-ish sync across Courtney's phone, Davis's phone, and
  the computer. Final DB choice to be confirmed during implementation planning;
  requirement is a free tier sufficient for a single household's data.
- **Auth:** One shared household password gating the whole app. No individual accounts.
- **Cost target:** $0/month recurring.

### Design System
- **Palette:**
  - Canyon `#DF6D41` — primary accent, buttons, active states
  - Buttercream `#F7D89A` — soft fills, breakfast slots, secondary highlights
  - Morning Sky `#8DA6CC` — dinner slots, secondary accent
  - Olive Grove `#AAA648` — veggie/healthy tags, accents
  - Warm cream / white (`#FDF6E7` / `#FFFFFF`) — backgrounds and cards
  - Dark warm neutral (`#2f2a24`) — body text
- **Fonts:** Fredoka (headers/display), Nunito (body). Both via Google Fonts.
- **Imagery:** Photos/illustration used only in select spots (e.g. a header accent
  or empty state), never as a background behind dense text, filters, or the meal grid.
- **Card language:** Rounded cards with a color-coded left border indicating type;
  scannable at a glance without added clutter.

---

## 3. Navigation

Three primary tabs; the entire app lives in these:

1. **Recipes** — library, search, filter, browse, add.
2. **Plan** — weekly meal grid.
3. **Grocery** — per-week grocery list.

- **Phone:** bottom tab bar (thumb-friendly, app-like).
- **Laptop:** same three as a top or side nav.
- Opening a recipe goes **full-screen**; a back action returns to the list.
- Targeted **slide-up panels** handle quick actions (recipe picker in the Plan,
  "Add to plan" from a recipe) so the user rarely switches tabs.

---

## 4. Recipes Tab

### 4.1 Recipe data model
- **Title** (text)
- **Serving size** (number) — base for scaling
- **Ingredients** — ordered list of structured entries: `quantity`, `unit`, `name`.
  Displayed as a scannable list; also the source for grocery-list lines and scaling.
- **Instructions** — free text, displayed full-screen. Amounts are written directly
  into each step by the user (not auto-synced from the ingredient list). No parsing.
- **Notes** — free text for variations/adjustments.
- **Equipment** — list of terms, auto-detected from instructions (see 4.4), editable.
- **Tags** — see 4.5.
- **Flags** — see 4.6.
- **Ratings** — see 4.7.

### 4.2 Adding a recipe (single long scrolling form)
All fields on one scrolling page (no multi-step wizard):
- **Title** and **serving size** — typed.
- **Ingredients:** a paste box. On "split," the app breaks pasted text into one
  row per line and makes a **best-guess split** into quantity / unit / name using
  simple pattern rules (e.g. "2 cups flour" → `2` | `cups` | `flour`). The user
  corrects any mis-splits (odd cases like "a pinch of salt" may need a manual fix).
  This is a deliberate tradeoff for a $0, AI-free build.
- **Instructions:** large text area, pasted/typed as-is and stored verbatim.
- **Equipment:** auto-detected chips shown for confirm/remove; user can add missed ones.
- **Tags / flags / ratings:** grouped pickers, toggles, and star inputs. Ratings may
  be left blank and added later after cooking.

Recipe sources (handwritten, Pinterest, ChatGPT, Claude chats) all funnel through
this same paste-and-tidy flow.

### 4.3 Scaling
- Preset multipliers **1x / 2x / 3x**.
- Selecting a multiplier recalculates all ingredient quantities and the displayed
  serving count (e.g. "Serves 4" at 2x → "Serves 8").
- A clear visual flag (color badge, e.g. "2x scaled") appears whenever the view is
  not at 1x, so scaled amounts are never mistaken for the base recipe.
- **Instructions are not scaled** — they remain at base size; the user reads the
  scaled ingredient list for real amounts.
- Scaled quantities feed the grocery list when the recipe is added to a plan at that scale.

### 4.4 Equipment auto-detection
- On save/edit, the instruction text is scanned against a built-in list of common
  equipment terms (oven, skillet, saucepan, baking sheet, blender, stand mixer,
  slow cooker, etc.).
- Matches become editable equipment chips. Not exhaustive; user can add/remove.
- Equipment is filterable (see 4.8).

### 4.5 Tags (all extensible — user can add new options inline)
- **Meal Occasion:** Work Breakfast, Work Lunch, Work Dinner, Weekend Breakfast,
  Weekend Lunch, Weekend Dinner.
- **Dietary:** Gluten Free, Dairy Free.
- **Cuisine:** seeded with Italian, Mexican, Chinese, Japanese, Thai, Indian,
  Southern, Mediterranean, French, Middle Eastern, Korean, Vietnamese, Greek; + custom.
- **Meat:** Chicken, Beef, Pork, Turkey, Seafood, Vegetarian; + custom.
- **Grocery Store:** Kroger, Trader Joe's, Specialty; + custom.
- **Equipment:** auto-populated (see 4.4).

### 4.6 Flags (yes/no)
Easy Scaleable, Veggie-Forward, Running Recovery, Low Calorie, Davis Favorite,
Courtney Favorite, Fellowship Favorite, Freezer Friendly, Dislike.
- **Dislike** keeps the recipe in the library and searchable, but excludes it from
  the "Surprise me" auto-fill (see 5.4).

### 4.7 Ratings (1–5 stars)
Taste, Cost. Independently set; may be blank.

### 4.8 Search & multi-facet filtering
- Free-text search on title (and ingredients for meat/ingredient lookups).
- Multi-facet filter combining any tags, flags, and rating thresholds at once
  (e.g. Weekend Dinner + Gluten Free + Taste ≥ 4). Grouped filter UI, not a single box.

### 4.9 Add to plan (from a recipe)
- A small "Add to plan" button opens a slide-up panel: choose **week** (defaults to
  the current week), then **day** and **slot**. Returns to browsing.

---

## 5. Plan Tab

### 5.1 Grid
- **Monday–Sunday**, with **Fri/Sat/Sun treated as "weekend"** and **Mon–Thu as
  "work"** for the purpose of suggesting relevant tagged recipes into slots.

### 5.2 Default slots per day
- **Mon–Thu (Work):** Breakfast, Lunch (Courtney), Lunch (Davis), Dinner.
- **Fri–Sun (Weekend):** Breakfast, Lunch, Dinner.

### 5.3 Slot behavior
- Each slot can hold **either** a recipe (picked via a filtered slide-up picker)
  **or** a free-text note ("Leftovers", "Eating Out", "Bar", "Frozen — <name>").
- **"+ Add a slot"** on any day: user types a custom label (e.g. "Saturday Snack")
  and it behaves like any slot. If it holds a recipe, its ingredients flow into that
  week's grocery list.

### 5.4 Surprise me
- Fills empty slots by randomly selecting from recipes matching the active filters
  (e.g. Cuisine = Asian). Always excludes Dislike-flagged recipes.

### 5.5 Weeks & history
- **‹ prev / next ›** control at the top of the grid, showing the week's date range.
- Flip forward to plan future weeks, back to view history. Every week auto-saves,
  including free-text notes.

---

## 6. Grocery Tab

- **Per-week**, driven by the same week selector as the Plan. Shows the list for the
  currently selected week.
- **Auto-built** from that week's planned recipes, using each recipe's scaled
  quantities as added.
- **Simple concatenation**, sorted **alphabetically**. No smart unit merging
  (duplicate ingredients appear as separate lines by design).
- **Live** — reflects plan changes automatically. **No finalize button.** Checkbox
  state (items already grabbed) and manually added items **persist per week**.
- **Pantry Check section** at the bottom: ingredients matching a built-in
  spices/oils list are auto-sorted here (not removed) so the top list stays clean;
  the user can also manually flag any other ingredient as a pantry item.
- **Freeform section** at the bottom to add staples/snacks not tied to a recipe.
- **"Shop at Kroger"** button opens Kroger / ClickList in a new browser tab. No
  auto-cart in v1 (possible future upgrade via Kroger's API).
- Not printable.

---

## 7. Printing

- **Recipes only** (not the grocery list), sized to **half a sheet or smaller**.
- Contents: title, (scaled) ingredients, instructions, and notes if they fit.
- Tags, flags, ratings, and equipment are omitted from print to fit the space.

---

## 8. Key user stories

1. Paste a recipe from Pinterest / ChatGPT / Claude and tidy it into fields instead of retyping.
2. Type up handwritten recipes into the same format.
3. Open the book from phone or computer with one shared login (Courtney and Davis).
4. Tag recipes across categories, set flags/ratings, to find the right one later.
5. Combine multiple filters at once to narrow options.
6. Read full-screen instructions with amounts baked into each step — no scrolling to check ingredients.
7. Scale a recipe to 2x/3x with one tap and see updated amounts, clearly flagged.
8. Add notes for variations without cluttering the base recipe.
9. Plan a week matching the Mon–Thu / Fri–Sun rhythm.
10. Add one-off custom slots (e.g. Saturday guacamole) that fold into the plan and grocery list.
11. Type a quick note instead of a recipe for a slot, and still see it in the plan.
12. Use "Surprise me" to fill empty slots from filters, never anything disliked.
13. Flip between weeks to plan ahead or review history; every week auto-saves.
14. Get an alphabetical grocery list auto-built from the week, with spices/oils in a pantry-check section.
15. Add own items to the grocery list; open Kroger in a tab to shop.
16. Print a single recipe at half-sheet size.
17. Browse recipes and add one to a chosen week's plan on the spot.
