import { defineConfig } from "@playwright/test";

const baseOrigin = process.env.BASE_URL || "http://localhost:3000";
const basePath =
  process.env.CUSTOM_DOMAIN === "true" ? "/" : "/group-trip-planner/";
const resolvedBaseURL = new URL(basePath, baseOrigin).toString();
const dialogSandboxUrl = new URL(
  "__dialog-sandbox",
  resolvedBaseURL,
).toString();

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: resolvedBaseURL,
  },
  webServer: {
    command: "npm run dev -- --host 0.0.0.0 --port 3000",
    url: dialogSandboxUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
