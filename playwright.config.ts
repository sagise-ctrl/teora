import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html"]] : [["list"]],

  use: {
    baseURL: "http://localhost:18543",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  timeout: 30_000,

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Always start our own server with VITE_E2E=true to disable MSW.
  // Playwright reuses an existing server if one's already running on the port.
  webServer: {
    command: "node ./node_modules/vite/bin/vite.js --host 0.0.0.0",
    url: "http://localhost:18543",
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      VITE_MOCK: "true",
      VITE_E2E: "true",
      VITE_API_URL: "",
    },
    cwd: "./artifacts/academic-workspace",
  },
});
