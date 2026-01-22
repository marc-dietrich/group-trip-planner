import { describe, expect, it } from "vitest";
import { buildIdentityHeaders } from "./identity";
import type { Identity } from "../types";

describe("buildIdentityHeaders", () => {
  it("adds actor id without auth for actor identity", () => {
    const identity: Identity = {
      kind: "actor",
      actorId: "actor-123",
      displayName: "Traveler",
    };

    const headers = buildIdentityHeaders(identity);

    expect(headers.get("X-Actor-Id")).toBe("actor-123");
    expect(headers.has("Authorization")).toBe(false);
  });

  it("adds bearer token when identity is a user", () => {
    const identity: Identity = {
      kind: "user",
      actorId: "actor-456",
      userId: "user-999",
      displayName: "Traveler",
      accessToken: "token-abc",
    };

    const headers = buildIdentityHeaders(identity, { "X-Custom": "yes" });

    expect(headers.get("X-Actor-Id")).toBe("actor-456");
    expect(headers.get("Authorization")).toBe("Bearer token-abc");
    expect(headers.get("X-Custom")).toBe("yes");
  });
});
