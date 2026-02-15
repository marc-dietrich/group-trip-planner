import { apiPath } from "../lib/api";
import { buildIdentityHeaders } from "../lib/identity";
import { ensureActorRemote } from "../lib/actor";
import { GroupMembership, Identity } from "../types";

const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504]);
const MAX_RETRIES = 10;

// Warmup state: ensures tunnel/backend is reachable before main requests
let warmupPromise: Promise<void> | null = null;

async function ensureBackendWarm(): Promise<void> {
  if (warmupPromise) return warmupPromise;

  warmupPromise = (async () => {
    const maxAttempts = 5;
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(apiPath("/api/health"), {
          method: "GET",
          cache: "no-store",
        });
        if (res.ok) return;
      } catch {
        // Network error - tunnel probably cold
      }
      // Exponential backoff: 200ms, 400ms, 800ms, 1600ms, 3200ms
      await new Promise((r) => setTimeout(r, 200 * Math.pow(2, i)));
    }
    // Continue anyway after warmup attempts - main fetch has its own retries
  })();

  return warmupPromise;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  maxRetries = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const res = await fetch(input, init);
      if (!RETRYABLE_STATUS_CODES.has(res.status) || attempt === maxRetries) {
        return res;
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
    }
    const backoffMs = Math.min(5000, 300 * 2 ** attempt);
    await delay(backoffMs);
  }

  // Unreachable fallback for type safety.
  throw new Error("Request failed after retries");
}

export async function fetchGroups(identity: Identity): Promise<GroupMembership[]> {
  // Ensure tunnel/backend is warm before main request
  await ensureBackendWarm();

  if (identity.kind === "actor") {
    await ensureActorRemote(identity);
  }

  const res = await fetchWithRetry(apiPath("/api/groups"), {
    headers: buildIdentityHeaders(identity),
  });

  if (!res.ok) {
    throw new Error(`Fehler: ${res.status}`);
  }

  const data = (await res.json()) as GroupMembership[];
  return Array.isArray(data) ? data : [];
}

export async function fetchGroupById(
  groupId: string,
  identity: Identity
): Promise<GroupMembership | null> {
  if (identity.kind === "actor") {
    await ensureActorRemote(identity);
  }

  const res = await fetch(apiPath(`/api/groups/${groupId}`), {
    headers: buildIdentityHeaders(identity),
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Fehler: ${res.status}`);
  }

  const data = (await res.json()) as GroupMembership;
  return data ?? null;
}
