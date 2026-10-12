import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 120000,
  expect: { timeout: 30000 },
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:5173",
    ...devices["Desktop Chrome"],
    channel: process.env.BROWSER_CHANNEL,
    viewport: { width: 1440, height: 1000 },
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
        timeout: 120000,
      },
});
