import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

// Browser tests for the Content-Security-Policy and accessibility, against the production
// build served the way the container serves it. The API points at a closed port, so every
// page renders its signed-out or failed state; no backend is needed.
if (!existsSync(".next/standalone/server.js")) {
  throw new Error("No production build — run `bun run test:e2e`, which builds first.");
}

const PORT = 3990;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { ...devices["Desktop Chrome"], baseURL: `http://127.0.0.1:${PORT}` },
  webServer: {
    // As the Dockerfile does: the standalone server plus the built static files.
    command: "cp -R .next/static .next/standalone/.next/ && node .next/standalone/server.js",
    url: `http://127.0.0.1:${PORT}/healthz`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: { PORT: String(PORT), HOSTNAME: "127.0.0.1", PUBLIC_API_URL: "http://127.0.0.1:9" },
  },
});
