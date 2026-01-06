import { Identity } from "../types";

export function buildIdentityHeaders(identity: Identity, extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  headers.set("X-Actor-Id", identity.actorId);
  if (identity.kind === "user") {
    headers.set("Authorization", `Bearer ${identity.accessToken}`);
  }
  return headers;
}
