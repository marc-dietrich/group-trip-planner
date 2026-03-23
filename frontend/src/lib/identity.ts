import { Identity } from "../types";

export function buildIdentityHeaders(
  identity: Identity,
  extra: HeadersInit = {},
): Headers {
  const headers = new Headers(extra);
  headers.set("X-Actor-Id", identity.actorId);
  if (identity.displayName?.trim()) {
    headers.set("X-Display-Name", identity.displayName.trim());
  }
  if (identity.kind === "user" && identity.accessToken) {
    headers.set("Authorization", `Bearer ${identity.accessToken}`);
  }
  return headers;
}
