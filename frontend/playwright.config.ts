import { defineConfig } from "@playwright/test";

const externalBaseURL = (process.env.E2E_BASE_URL || "").trim();
const baseOrigin = process.env.BASE_URL || "http://localhost:3000";
const basePath =
  process.env.CUSTOM_DOMAIN === "true" ? "/" : "/group-trip-planner/";
const resolvedBaseURL =
  externalBaseURL || new URL(basePath, baseOrigin).toString();
const dialogSandboxUrl = new URL(
  "__dialog-sandbox",
  resolvedBaseURL,
).toString();
const useLocalWebServer = !externalBaseURL;

export default defineConfig({
  testDir: "./tests/e2e",
  use: {
    baseURL: resolvedBaseURL,
  },
  webServer: useLocalWebServer
    ? {
        command: "npm run dev -- --host 0.0.0.0 --port 3000",
        url: dialogSandboxUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
