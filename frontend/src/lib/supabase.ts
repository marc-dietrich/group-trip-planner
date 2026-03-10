import { oauthEnv, oauthConfigured } from "../config/publicEnv";

export type AuthSession = {
  userId: string;
  accessToken?: string;
  displayName?: string;
};

export const authEnabled = oauthConfigured;

const TOKEN_STORAGE_KEY = "gtp.auth.jwt";

export function persistJwt(session: AuthSession | null) {
  if (typeof window === "undefined") return;
  if (session?.accessToken) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, session.accessToken);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getStoredJwt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getUserDisplayName(
  user: { email?: string; name?: string } | null,
): string | null {
  if (!user) return null;
  return user.name || user.email || null;
}

export async function getExistingSession(): Promise<AuthSession | null> {
  // OAuth2-Proxy handles session via cookies; frontend does not fetch user info directly.
  return null;
}

export function startOAuthLogin() {
  const target = `${oauthEnv.baseUrl}/oauth/start`;
  window.location.href = target;
}

export function startOAuthLogout() {
  const target = `${oauthEnv.baseUrl}/oauth/sign_out`;
  window.location.href = target;
}
