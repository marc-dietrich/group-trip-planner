import { apiPath } from "../lib/api";
import { buildIdentityHeaders } from "../lib/identity";
import type { Identity } from "../types";

type SupporterStatusResponse = {
  actorId: string;
  hasCrown: boolean;
  supporterUntil?: string | null;
};

export async function fetchSupporterStatus(
  identity: Identity,
): Promise<SupporterStatusResponse> {
  const headers = buildIdentityHeaders(identity, {
    "Content-Type": "application/json",
  });

  const response = await fetch(
    apiPath(`/api/actors/${encodeURIComponent(identity.actorId)}/supporter`),
    {
      method: "GET",
      headers,
    },
  );

  if (!response.ok) {
    throw new Error(`Supporter status failed: ${response.status}`);
  }

  return (await response.json()) as SupporterStatusResponse;
}
