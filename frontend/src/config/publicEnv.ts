/// <reference types="vite/client" />

const DEFAULT_OAUTH_BASE_URL = "http://localhost:4180";

const localhostHosts = new Set(["localhost", "127.0.0.1"]);

function normalizeBaseUrl(rawBase: string): string {
  const trimmed = rawBase.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }

  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

function shouldFallbackToWindowOrigin(base: string): boolean {
  if (typeof window === "undefined") {
    return !base;
  }

  if (!base) {
    return true;
  }

  try {
    const candidate = new URL(base, window.location.origin);
    const envHostIsLocal = localhostHosts.has(candidate.hostname);
    const windowHostIsLocal = localhostHosts.has(window.location.hostname);
    const localHostMismatch =
      envHostIsLocal &&
      windowHostIsLocal &&
      candidate.hostname !== window.location.hostname;
    return (envHostIsLocal && !windowHostIsLocal) || localHostMismatch;
  } catch {
    return true;
  }
}

const rawOAuthBase =
  import.meta.env.VITE_OAUTH_BASE_URL ?? DEFAULT_OAUTH_BASE_URL;
const normalizedOAuthBase = normalizeBaseUrl(rawOAuthBase);
const useWindowOrigin = shouldFallbackToWindowOrigin(normalizedOAuthBase);

export const oauthEnv = {
  baseUrl: useWindowOrigin ? "" : normalizedOAuthBase,
};

export const oauthConfigured = useWindowOrigin || Boolean(normalizedOAuthBase);
