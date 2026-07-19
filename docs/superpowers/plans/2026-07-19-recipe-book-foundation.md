# Recipe Book — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a deployed, authenticated, navigable Next.js app shell with the Recipe Book design system, ready for the Recipes/Plan/Grocery features to be built on top.

**Architecture:** A Next.js (App Router) app deployed on Vercel. Data lives in a Neon Postgres database accessed through Prisma. The whole app sits behind a single shared household password enforced by middleware and a signed cookie. The UI is a three-tab responsive shell (bottom tab bar on phone, sidebar on desktop) styled with Tailwind design tokens for the Canyon/Buttercream/Morning Sky/Olive Grove palette and Fredoka + Nunito fonts.

**Tech Stack:** Next.js 15 (App Router, TypeScript, React 19), Tailwind CSS, Prisma ORM, Neon Postgres, Vitest (unit tests), Playwright (end-to-end tests), Vercel (hosting), Node.js 24 LTS.

## Global Constraints

- **Cost:** $0/month recurring — only free hosting/database tiers. No paid AI or scraping services.
- **Node:** 24 LTS.
- **Auth:** exactly one shared household password for the whole app; no individual accounts, no third-party auth provider.
- **Palette (exact hex):** Canyon `#DF6D41`, Buttercream `#F7D89A`, Morning Sky `#8DA6CC`, Olive Grove `#AAA648`, cream background `#FDF6E7`, card white `#FFFFFF`, body text `#2F2A24`.
- **Fonts:** Fredoka (headers), Nunito (body), both via `next/font/google`.
- **Navigation:** three tabs only — Recipes, Plan, Grocery. Bottom tab bar on phone; sidebar/top nav on desktop.
- **Imagery:** illustration only in dead space / decorative headers / standalone screens — never behind filters, the meal grid, or instruction text.
- **Copy style:** sentence case everywhere; friendly, plain language.
- **Secrets:** never commit `.env`; all secrets via environment variables.

---

## File Structure

- `package.json`, `tsconfig.json`, `next.config.ts` — project config
- `.env.example` / `.env.local` — env var template and local secrets (`.env.local` gitignored)
- `app/layout.tsx` — root layout: fonts, global styles, app shell
- `app/globals.css` — Tailwind entry + CSS design tokens
- `app/(app)/recipes/page.tsx`, `app/(app)/plan/page.tsx`, `app/(app)/grocery/page.tsx` — the three tab pages (placeholder content in this phase)
- `app/login/page.tsx` — welcome / login screen (hero illustration slot)
- `app/api/login/route.ts` — password check, sets session cookie
- `app/api/logout/route.ts` — clears session cookie
- `middleware.ts` — route protection
- `lib/auth.ts` — session token sign/verify helpers
- `lib/db.ts` — Prisma client singleton
- `prisma/schema.prisma` — minimal schema (proves DB round-trip; extended in later phases)
- `components/nav/AppShell.tsx`, `components/nav/BottomTabs.tsx`, `components/nav/Sidebar.tsx` — navigation
- `components/ui/HeroIllustration.tsx` — welcome illustration slot with fallback
- `public/illustrations/` — uploaded art assets go here
- `lib/auth.test.ts`, `lib/ingredients.test.ts` (later) — Vitest unit tests
- `e2e/auth.spec.ts`, `e2e/navigation.spec.ts` — Playwright tests
- `vitest.config.ts`, `playwright.config.ts` — test config

---

## Task 1: Scaffold the Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `app/layout.tsx`, `app/page.tsx`, `.gitignore`

**Interfaces:**
- Produces: a running Next.js dev server at `http://localhost:3000`.

- [ ] **Step 1: Scaffold with create-next-app**

Run from the repo root (the project already contains `docs/`; scaffold in place):
```bash
npx --yes create-next-app@latest . \
  --typescript --tailwind --eslint --app --src-dir=false \
  --import-alias "@/*" --use-npm --no-turbopack --yes
```
If prompted about a non-empty directory, choose to continue (the existing `docs/` and `.git/` must be preserved).

- [ ] **Step 2: Verify the dev server runs**

Run:
```bash
npm run dev
```
Expected: server starts, `http://localhost:3000` returns the default Next.js page. Stop the server (Ctrl-C) after confirming.

- [ ] **Step 3: Confirm Node engine and pin it**

Add to `package.json`:
```json
"engines": { "node": ">=24 <25" }
```

- [ ] **Step 4: Ensure .gitignore covers secrets and build output**

Confirm `.gitignore` contains these lines (add any missing):
```
node_modules/
.next/
.env
.env*.local
.DS_Store
/test-results/
/playwright-report/
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app"
```

---

## Task 2: Design tokens, fonts, and base theme

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`
- Create: `tailwind.config.ts` (if not created by scaffold; otherwise modify)

**Interfaces:**
- Produces: CSS variables and Tailwind color utilities `bg-canyon`, `bg-buttercream`, `bg-sky`, `bg-olive`, `bg-cream`, `text-ink`; font classes for Fredoka (`font-display`) and Nunito (`font-body`).

- [ ] **Step 1: Load fonts in the root layout**

In `app/layout.tsx`, configure fonts and expose them as CSS variables:
```tsx
import { Fredoka, Nunito } from "next/font/google";

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600", "700"] });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-body", weight: ["400", "600", "700", "800"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Define color tokens in globals.css**

Replace the top of `app/globals.css` with:
```css
@import "tailwindcss";

:root {
  --canyon: #DF6D41;
  --buttercream: #F7D89A;
  --sky: #8DA6CC;
  --olive: #AAA648;
  --cream: #FDF6E7;
  --card: #FFFFFF;
  --ink: #2F2A24;
}

@theme inline {
  --color-canyon: var(--canyon);
  --color-buttercream: var(--buttercream);
  --color-sky: var(--sky);
  --color-olive: var(--olive);
  --color-cream: var(--cream);
  --color-card: var(--card);
  --color-ink: var(--ink);
  --font-display: var(--font-display);
  --font-body: var(--font-body);
}

body {
  background: var(--cream);
  color: var(--ink);
  font-family: var(--font-body), system-ui, sans-serif;
}

h1, h2, h3 { font-family: var(--font-display), system-ui, sans-serif; }
```

- [ ] **Step 3: Add a temporary token preview to the home page**

Replace `app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-3xl text-canyon">Recipe book</h1>
      <div className="mt-4 flex gap-3">
        <div className="h-16 w-16 rounded-xl bg-canyon" />
        <div className="h-16 w-16 rounded-xl bg-buttercream" />
        <div className="h-16 w-16 rounded-xl bg-sky" />
        <div className="h-16 w-16 rounded-xl bg-olive" />
      </div>
      <p className="mt-4 font-body">Nunito body text renders here.</p>
    </main>
  );
}
```

- [ ] **Step 4: Verify visually**

Run `npm run dev`, open `http://localhost:3000`. Expected: heading in Fredoka orange, four palette swatches, Nunito body text on a cream background. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add design tokens, palette, and fonts"
```

---

## Task 3: Testing setup (Vitest + Playwright)

**Files:**
- Create: `vitest.config.ts`, `playwright.config.ts`, `lib/sample.ts`, `lib/sample.test.ts`, `e2e/smoke.spec.ts`
- Modify: `package.json` (test scripts)

**Interfaces:**
- Produces: `npm run test` (Vitest) and `npm run e2e` (Playwright) commands, both green.

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev vitest @vitejs/plugin-react @playwright/test
npx --yes playwright install --with-deps chromium
```

- [ ] **Step 2: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
});
```

- [ ] **Step 3: Add Playwright config**

Create `playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

- [ ] **Step 4: Add test scripts to package.json**

In `package.json` `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"e2e": "playwright test"
```

- [ ] **Step 5: Write a failing unit test**

Create `lib/sample.test.ts`:
```ts
import { expect, test } from "vitest";
import { add } from "./sample";

test("add sums two numbers", () => {
  expect(add(2, 3)).toBe(5);
});
```

- [ ] **Step 6: Run it and confirm it fails**

Run: `npm run test`
Expected: FAIL — cannot find module `./sample`.

- [ ] **Step 7: Implement the minimal module**

Create `lib/sample.ts`:
```ts
export function add(a: number, b: number): number {
  return a + b;
}
```

- [ ] **Step 8: Run unit test — confirm pass**

Run: `npm run test`
Expected: PASS (1 test).

- [ ] **Step 9: Write a smoke e2e test**

Create `e2e/smoke.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("home page shows the app name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /recipe book/i })).toBeVisible();
});
```

- [ ] **Step 10: Run e2e — confirm pass**

Run: `npm run e2e`
Expected: PASS (1 test). (Playwright starts the dev server itself.)

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "test: set up Vitest and Playwright with passing samples"
```

---

## Task 4: Database setup (Prisma + Neon) with a minimal schema

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`, `app/api/health/route.ts`, `e2e/health.spec.ts`
- Modify: `.env.example`, `.env.local`, `package.json`

**Interfaces:**
- Consumes: a `DATABASE_URL` env var pointing at a Neon Postgres database.
- Produces: `lib/db.ts` default export `prisma` (a `PrismaClient` singleton); `GET /api/health` returning `{ ok: true, recipeCount: <number> }`.

- [ ] **Step 1: Provision a free Neon Postgres database**

Use the Vercel Marketplace (Neon) or Neon directly to create a free-tier database. Copy its connection string. **Ask the user to create this and provide the `DATABASE_URL` if credentials are needed** — do not fabricate one.

Add to `.env.example`:
```
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
```
Add the real value to `.env.local` (gitignored).

- [ ] **Step 2: Install Prisma**

```bash
npm install --save-dev prisma
npm install @prisma/client
```

- [ ] **Step 3: Write the minimal schema**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Recipe {
  id        String   @id @default(cuid())
  title     String
  servings  Int      @default(1)
  createdAt DateTime @default(now())
}
```

- [ ] **Step 4: Create and run the first migration**

```bash
npx prisma migrate dev --name init
```
Expected: migration created under `prisma/migrations/`, applied to Neon, Prisma Client generated.

- [ ] **Step 5: Add the Prisma client singleton**

Create `lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
```

- [ ] **Step 6: Add a health-check route**

Create `app/api/health/route.ts`:
```ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const recipeCount = await prisma.recipe.count();
  return NextResponse.json({ ok: true, recipeCount });
}
```

- [ ] **Step 7: Write an e2e test for the health route**

Create `e2e/health.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("health endpoint reports database connectivity", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(typeof body.recipeCount).toBe("number");
});
```

- [ ] **Step 8: Run the test — confirm pass**

Run: `npm run e2e -- health.spec.ts`
Expected: PASS — confirms the app reaches Neon and counts recipes (0).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Prisma, Neon connection, and health check"
```

---

## Task 5: Shared-password authentication

**Files:**
- Create: `lib/auth.ts`, `lib/auth.test.ts`, `app/api/login/route.ts`, `app/api/logout/route.ts`, `middleware.ts`, `e2e/auth.spec.ts`
- Modify: `.env.example`, `.env.local`

**Interfaces:**
- Consumes: env vars `APP_PASSWORD` (the shared household password) and `SESSION_SECRET` (random string for signing).
- Produces:
  - `lib/auth.ts` exports `signSession(secret: string): string`, `verifySession(token: string | undefined, secret: string): boolean`, and constant `SESSION_COOKIE = "rb_session"`.
  - `POST /api/login` accepting `{ password: string }`, setting the session cookie on success (200) or returning 401.
  - `middleware.ts` redirecting unauthenticated requests to `/login`.

- [ ] **Step 1: Add auth env vars**

Add to `.env.example`:
```
APP_PASSWORD="change-me"
SESSION_SECRET="a-long-random-string"
```
Add real values to `.env.local`. **Ask the user which shared password they want**; generate `SESSION_SECRET` with `openssl rand -hex 32`.

- [ ] **Step 2: Write failing tests for the session helpers**

Create `lib/auth.test.ts`:
```ts
import { expect, test } from "vitest";
import { signSession, verifySession } from "./auth";

const secret = "test-secret";

test("a freshly signed session verifies true", () => {
  const token = signSession(secret);
  expect(verifySession(token, secret)).toBe(true);
});

test("a tampered token verifies false", () => {
  const token = signSession(secret) + "x";
  expect(verifySession(token, secret)).toBe(false);
});

test("an undefined token verifies false", () => {
  expect(verifySession(undefined, secret)).toBe(false);
});

test("a token signed with a different secret verifies false", () => {
  const token = signSession(secret);
  expect(verifySession(token, "other-secret")).toBe(false);
});
```

- [ ] **Step 3: Run the tests — confirm they fail**

Run: `npm run test`
Expected: FAIL — cannot find module `./auth`.

- [ ] **Step 4: Implement the session helpers**

Create `lib/auth.ts`:
```ts
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "rb_session";

function hmac(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function signSession(secret: string): string {
  const payload = "authenticated";
  return `${payload}.${hmac(payload, secret)}`;
}

export function verifySession(token: string | undefined, secret: string): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = hmac(payload, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
```

- [ ] **Step 5: Run the tests — confirm they pass**

Run: `npm run test`
Expected: PASS (all auth tests + sample).

- [ ] **Step 6: Implement the login route**

Create `app/api/login/route.ts`:
```ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE, signSession } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = await request.json().catch(() => ({ password: "" }));
  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, signSession(process.env.SESSION_SECRET!), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
```

- [ ] **Step 7: Implement the logout route**

Create `app/api/logout/route.ts`:
```ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
```

- [ ] **Step 8: Add route-protecting middleware**

Create `middleware.ts`:
```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (verifySession(token, process.env.SESSION_SECRET!)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|illustrations).*)"],
};
```

- [ ] **Step 9: Create a minimal login page (styled fully in Task 7)**

Create `app/login/page.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) router.push("/recipes");
    else setError(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm">
        <h1 className="text-3xl text-canyon">Recipe book</h1>
        <input
          type="password"
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded-full border-2 border-buttercream bg-card px-4 py-2"
          placeholder="Enter password"
        />
        <button type="submit" className="mt-3 w-full rounded-full bg-canyon px-4 py-2 text-white">
          Enter
        </button>
        {error && <p className="mt-2 text-sm text-canyon">That password didn’t work. Try again.</p>}
      </form>
    </main>
  );
}
```

- [ ] **Step 10: Write an e2e test for the auth flow**

Create `e2e/auth.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test("unauthenticated visit to a protected page redirects to login", async ({ page }) => {
  await page.goto("/recipes");
  await expect(page).toHaveURL(/\/login/);
});

test("wrong password shows an error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page.getByText(/didn.t work/i)).toBeVisible();
});

test("correct password grants access to recipes", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});
```

- [ ] **Step 11: Run the auth e2e tests — confirm pass**

Run: `npm run e2e -- auth.spec.ts`
Expected: PASS (3 tests). Requires `APP_PASSWORD` set in the environment. (The `/recipes` page is created in Task 6; if running before Task 6, expect the third test to fail on the missing page — run Task 6 first or re-run after.)

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add shared-password auth with signed session cookie"
```

---

## Task 6: App shell and three-tab responsive navigation

**Files:**
- Create: `components/nav/AppShell.tsx`, `components/nav/BottomTabs.tsx`, `components/nav/Sidebar.tsx`, `app/(app)/layout.tsx`, `app/(app)/recipes/page.tsx`, `app/(app)/plan/page.tsx`, `app/(app)/grocery/page.tsx`, `e2e/navigation.spec.ts`

**Interfaces:**
- Consumes: nothing beyond Next.js routing.
- Produces: routes `/recipes`, `/plan`, `/grocery`, each wrapped in `AppShell`, with a sidebar on desktop and a bottom tab bar on phone. Active tab is visually indicated.

- [ ] **Step 1: Define the shared tab list**

Create `components/nav/tabs.ts`:
```ts
export const TABS = [
  { href: "/recipes", label: "Recipes" },
  { href: "/plan", label: "Plan" },
  { href: "/grocery", label: "Grocery" },
] as const;
```

- [ ] **Step 2: Build the bottom tab bar (phone)**

Create `components/nav/BottomTabs.tsx`:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "./tabs";

export default function BottomTabs() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t border-buttercream bg-card md:hidden">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 py-3 text-center text-sm ${active ? "text-canyon font-bold" : "text-ink"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Build the sidebar (desktop)**

Create `components/nav/Sidebar.tsx`:
```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "./tabs";

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-48 shrink-0 border-r border-buttercream bg-card p-4 md:block">
      <h2 className="text-xl text-canyon">Recipe book</h2>
      <nav className="mt-6 flex flex-col gap-2">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3 py-2 ${active ? "bg-buttercream text-ink font-bold" : "text-ink"}`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 4: Compose the app shell**

Create `components/nav/AppShell.tsx`:
```tsx
import Sidebar from "./Sidebar";
import BottomTabs from "./BottomTabs";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <BottomTabs />
    </div>
  );
}
```

- [ ] **Step 5: Add the (app) group layout**

Create `app/(app)/layout.tsx`:
```tsx
import AppShell from "@/components/nav/AppShell";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
```

- [ ] **Step 6: Add the three placeholder tab pages**

Create `app/(app)/recipes/page.tsx`:
```tsx
export default function RecipesPage() {
  return <div className="p-6"><h1 className="text-3xl text-canyon">My recipes</h1></div>;
}
```
Create `app/(app)/plan/page.tsx`:
```tsx
export default function PlanPage() {
  return <div className="p-6"><h1 className="text-3xl text-canyon">This week</h1></div>;
}
```
Create `app/(app)/grocery/page.tsx`:
```tsx
export default function GroceryPage() {
  return <div className="p-6"><h1 className="text-3xl text-canyon">Grocery list</h1></div>;
}
```

- [ ] **Step 7: Redirect the root to recipes**

Replace `app/page.tsx`:
```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/recipes");
}
```

- [ ] **Step 8: Write e2e tests for navigation (authenticated)**

Create `e2e/navigation.spec.ts`:
```ts
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Password").fill(process.env.APP_PASSWORD!);
  await page.getByRole("button", { name: /enter/i }).click();
  await expect(page).toHaveURL(/\/recipes/);
});

test("can navigate between all three tabs", async ({ page }) => {
  await page.getByRole("link", { name: "Plan" }).first().click();
  await expect(page.getByRole("heading", { name: /this week/i })).toBeVisible();
  await page.getByRole("link", { name: "Grocery" }).first().click();
  await expect(page.getByRole("heading", { name: /grocery list/i })).toBeVisible();
  await page.getByRole("link", { name: "Recipes" }).first().click();
  await expect(page.getByRole("heading", { name: /my recipes/i })).toBeVisible();
});
```

- [ ] **Step 9: Run navigation + auth e2e — confirm pass**

Run: `npm run e2e -- navigation.spec.ts auth.spec.ts`
Expected: PASS (all tests, including the previously-deferred third auth test).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add three-tab responsive app shell"
```

---

## Task 7: Welcome screen styling and hero illustration slot

**Files:**
- Create: `components/ui/HeroIllustration.tsx`, `public/illustrations/.gitkeep`
- Modify: `app/login/page.tsx`

**Interfaces:**
- Consumes: an optional image at `public/illustrations/welcome-hero.png`.
- Produces: `HeroIllustration` component that renders the uploaded hero image if present, or a styled placeholder if not.

- [ ] **Step 1: PROMPT THE USER to upload the welcome hero illustration**

**Pause and ask the user** to create and upload the v1 hero illustration (bold, graphic, flat-color, abstract shapes — per the spec's illustration section), sized ~1200×1200 or taller, saved to `public/illustrations/welcome-hero.png`. Proceed with a placeholder if they want to add it later.

- [ ] **Step 2: Build the hero illustration component with fallback**

Create `components/ui/HeroIllustration.tsx`:
```tsx
import fs from "node:fs";
import path from "node:path";
import Image from "next/image";

export default function HeroIllustration() {
  const file = path.join(process.cwd(), "public/illustrations/welcome-hero.png");
  const exists = fs.existsSync(file);
  if (!exists) {
    return (
      <div
        aria-hidden
        className="mx-auto mb-6 flex h-48 w-48 items-center justify-center rounded-3xl bg-buttercream text-canyon"
      >
        <span className="text-4xl">🍊</span>
      </div>
    );
  }
  return (
    <Image
      src="/illustrations/welcome-hero.png"
      alt=""
      width={240}
      height={240}
      className="mx-auto mb-6 h-48 w-48 object-contain"
      priority
    />
  );
}
```

- [ ] **Step 3: Add the illustrations folder placeholder**

Create `public/illustrations/.gitkeep` (empty file) so the directory is tracked.

- [ ] **Step 4: Restyle the login page with the hero and cream theme**

Replace the JSX in `app/login/page.tsx`'s `return` with a version that includes the hero (keep the existing `submit`, state, and imports; add `import HeroIllustration from "@/components/ui/HeroIllustration";`):
```tsx
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream p-6">
      <form onSubmit={submit} className="w-full max-w-sm text-center">
        <HeroIllustration />
        <h1 className="text-4xl text-canyon">Recipe book</h1>
        <p className="mt-2 text-ink/70">Welcome back — let’s see what’s cooking.</p>
        <input
          type="password"
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-6 w-full rounded-full border-2 border-buttercream bg-card px-4 py-2 text-center"
          placeholder="Enter password"
        />
        <button type="submit" className="mt-3 w-full rounded-full bg-canyon px-4 py-2 font-bold text-white">
          Enter
        </button>
        {error && <p className="mt-2 text-sm text-canyon">That password didn’t work. Try again.</p>}
      </form>
    </main>
  );
```

- [ ] **Step 5: Verify the login screen visually**

Run `npm run dev`, open `/login`. Expected: hero (image or placeholder) above the "Recipe book" title, password field, orange button, cream background. Stop the server.

- [ ] **Step 6: Re-run the auth e2e to confirm nothing broke**

Run: `npm run e2e -- auth.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: style welcome screen with hero illustration slot"
```

---

## Task 8: Deploy to Vercel

**Files:**
- Create: `README.md` (setup + deploy notes)

**Interfaces:**
- Produces: a live URL serving the app, gated by the shared password.

- [ ] **Step 1: Ensure production build succeeds locally**

Run: `npm run build`
Expected: build completes with no type or lint errors. Fix any that appear.

- [ ] **Step 2: PROMPT THE USER for Vercel deployment**

**Pause and ask the user** to connect the repository to Vercel (or authorize the Vercel CLI). Deployment and env-var entry happen in the user's Vercel account — do not attempt to auth on their behalf.

- [ ] **Step 3: Set production environment variables in Vercel**

In the Vercel project settings, add: `DATABASE_URL`, `APP_PASSWORD`, `SESSION_SECRET` (same names as `.env.local`). Confirm they are set for the Production environment.

- [ ] **Step 4: Deploy**

Trigger a production deployment (push to the default branch with the Vercel Git integration, or `npx vercel --prod`). Wait for it to finish.

- [ ] **Step 5: Smoke-test production**

Visit the production URL. Expected: redirected to `/login`; entering the shared password reaches `/recipes`; all three tabs navigate. Visit `/api/health` (while logged in) and confirm `{ ok: true, recipeCount: 0 }`.

- [ ] **Step 6: Write the README**

Create `README.md` documenting: required env vars, `npm run dev`, `npm run test`, `npm run e2e`, and how to deploy. Keep it short and accurate.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: add README and deployment notes"
```

---

## Self-Review

**Spec coverage (Foundation-relevant sections):**
- Architecture (web app, Vercel, Postgres, $0) → Tasks 1, 4, 8 ✓
- Shared single login → Task 5 ✓
- Design system (palette, fonts, cream theme) → Task 2, 7 ✓
- Three-tab navigation, phone vs desktop → Task 6 ✓
- Welcome screen + hero illustration slot (v1 illustration #1) → Task 7 ✓
- Logo mark (illustration #2) and empty-state illustrations (#3) → deferred to the feature phases where those screens gain real content (Recipes/Plan/Grocery empty states land in Phases 2–4); noted here so they are not lost.
- Recipes / Plan / Grocery feature behavior → intentionally out of scope for Foundation; covered by Phases 2–4.

**Placeholder scan:** No "TBD"/"handle edge cases"/vague steps; every code step includes complete code. The only user-action pauses (Neon credentials, password choice, illustration upload, Vercel connect) are genuine external dependencies, explicitly flagged.

**Type consistency:** `signSession(secret)` / `verifySession(token, secret)` / `SESSION_COOKIE` used consistently across `lib/auth.ts`, `app/api/login/route.ts`, `app/api/logout/route.ts`, `middleware.ts`. `prisma` default export used consistently. `TABS` shape consistent across `BottomTabs`, `Sidebar`.

**Note for later phases:** The `Recipe` model is intentionally minimal here (id/title/servings) to prove DB connectivity; Phase 2 (Recipes) extends it with ingredients, instructions, notes, tags, flags, ratings, and equipment.
