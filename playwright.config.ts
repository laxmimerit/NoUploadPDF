import { defineConfig, devices } from "@playwright/test";

const previewURL = process.env.PLAYWRIGHT_BASE_URL;
const localURL = "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: previewURL || localURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{
    name: "chromium",
    use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } },
  }],
  // Build first. Never reuse a dev server or start a local server for preview tests.
  webServer: previewURL ? undefined : {
    command: "npm run start -- --hostname 127.0.0.1 --port 3100",
    url: localURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
