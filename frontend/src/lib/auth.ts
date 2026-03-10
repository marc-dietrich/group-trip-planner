import { oauthEnv, oauthConfigured } from "../config/publicEnv";
import { apiPath } from "./api";

export type AuthSession = {
  userId: string;
  accessToken?: string;
  displayName?: string;
};

export const authEnabled = oauthConfigured;

const TOKEN_STORAGE_KEY = "gtp.auth.jwt";

type SessionPayload = {
  userId?: string;
  email?: string | null;
  displayName?: string | null;
  accessToken?: string;
};

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

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
}

function parseStoredToken(token: string): AuthSession | null {
  if (typeof window === "undefined") return null;

  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const payload = JSON.parse(decodeBase64Url(parts[1])) as {
      sub?: unknown;
      email?: unknown;
      user_metadata?: {
        full_name?: unknown;
        name?: unknown;
      };
    };

    const userId = typeof payload.sub === "string" ? payload.sub : null;
    if (!userId) return null;

    const displayName =
      typeof payload.user_metadata?.full_name === "string"
        ? payload.user_metadata.full_name
        : typeof payload.user_metadata?.name === "string"
          ? payload.user_metadata.name
          : typeof payload.email === "string"
            ? payload.email
            : undefined;

    return {
      userId,
      accessToken: token,
      displayName,
    };
  } catch {
    return null;
  }
}

export async function getExistingSession(): Promise<AuthSession | null> {
  const storedToken = getStoredJwt();

  try {
    const response = await fetch(apiPath("/api/auth/session"), {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const payload = (await response.json()) as SessionPayload;
      if (payload.userId && payload.accessToken) {
        const session: AuthSession = {
          userId: payload.userId,
          accessToken: payload.accessToken,
          displayName: payload.displayName || payload.email || undefined,
        };
        persistJwt(session);
        return session;
      }
    }
  } catch {
    // ignore and try stored token fallback
  }

  if (!storedToken) {
    persistJwt(null);
    return null;
  }

  const fallback = parseStoredToken(storedToken);
  if (!fallback) {
    persistJwt(null);
  }
  return fallback;
}

export function startOAuthLogin() {
  const target = `${oauthEnv.baseUrl}/oauth/start`;
  window.location.href = target;
}

export function startOAuthLogout() {
  const target = `${oauthEnv.baseUrl}/oauth/sign_out`;
  window.location.href = target;
}
