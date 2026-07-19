import { defineConfig } from "@playwright/test";

// Load local .env so tests and the dev server share APP_PASSWORD / SESSION_SECRET.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env locally (e.g. CI provides real env vars) — that's fine.
}

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
