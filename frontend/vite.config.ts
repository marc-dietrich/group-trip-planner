import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

const isGhPages = process.env.GITHUB_PAGES === "true";

const normalizeBase = (prefix: string) => {
  if (!prefix) return "/";
  const withLeading = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
};

const base =
  process.env.CUSTOM_DOMAIN === "true"
    ? "/"
    : normalizeBase(process.env.VITE_BASE_PATH || "/group-trip-planner/");

const resolveCommit = () => {
  if (process.env.VITE_BUILD_COMMIT) return process.env.VITE_BUILD_COMMIT;
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "";
  }
};

const commit = resolveCommit();
const shortCommit = commit ? commit.slice(0, 7) : "";

if (!process.env.VITE_BUILD_COMMIT && commit) {
  process.env.VITE_BUILD_COMMIT = commit;
}
if (!process.env.VITE_BUILD_LABEL && shortCommit) {
  process.env.VITE_BUILD_LABEL = shortCommit;
}

// https://vitejs.dev/config/
export default defineConfig({
  envDir: "..",
  base,
  plugins: [react()],
  server: {
    port: Number(process.env.VITE_DEV_PORT || 3000),
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:8000",
        changeOrigin: true,
      },
      "/mail": {
        target:
          process.env.VITE_CONTACT_PROXY_TARGET || "http://localhost:3002",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./vitest.setup.ts",
    globals: true,
    include: ["src/**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude: ["node_modules", "dist", "tests/e2e/**", ".git"],
  },
});
