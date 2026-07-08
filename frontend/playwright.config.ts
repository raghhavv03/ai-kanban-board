import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Build the static export, then serve it via the FastAPI backend so the
    // auth API (/api/*) is available to e2e tests.
    command:
      'npm run build && STATIC_DIR="$PWD/out" ALLOW_TEST_RESET=1 PATH="$HOME/.local/bin:$PATH" uv run --directory ../backend uvicorn app.main:app --port 3001',
    url: "http://localhost:3001/api/health",
    reuseExistingServer: false,
    timeout: 120000,
  },
});
