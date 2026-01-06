import { apiPath } from "../lib/api";
import { buildIdentityHeaders } from "../lib/identity";
import { ensureActorRemote } from "../lib/actor";
import {
  AvailabilityEntry,
  GroupAvailabilityInterval,
  Identity,
  MemberAvailability,
} from "../types";

export async function fetchAvailabilitySummary(
  groupId: string,
  identity: Identity
): Promise<GroupAvailabilityInterval[]> {
  if (identity.kind === "actor") {
    await ensureActorRemote(identity);
  }

  const res = await fetch(apiPath(`/api/groups/${groupId}/availability-summary`), {
    headers: buildIdentityHeaders(identity),
  });

  if (!res.ok) {
    throw new Error(`Fehler: ${res.status}`);
  }

  const body = (await res.json()) as GroupAvailabilityInterval[];
  return Array.isArray(body) ? body : [];
}

export async function fetchMemberAvailabilities(
  groupId: string,
  identity: Identity
): Promise<MemberAvailability[]> {
  if (identity.kind === "actor") {
    await ensureActorRemote(identity);
  }

  const res = await fetch(apiPath(`/api/groups/${groupId}/member-availabilities`), {
    headers: buildIdentityHeaders(identity),
  });

  if (!res.ok) {
    throw new Error(`Fehler: ${res.status}`);
  }

  const body = (await res.json()) as unknown;
  return Array.isArray(body) ? (body as MemberAvailability[]) : [];
}

export async function fetchSelfAvailabilities(
  groupId: string,
  identity: Identity
): Promise<AvailabilityEntry[]> {
  if (identity.kind === "actor") {
    await ensureActorRemote(identity);
  }

  const res = await fetch(apiPath(`/api/groups/${groupId}/availabilities`), {
    headers: buildIdentityHeaders(identity),
  });

  if (!res.ok) {
    throw new Error(`Fehler: ${res.status}`);
  }

  const body = (await res.json()) as Array<{
    id: string;
    startDate: string;
    endDate: string;
  }>;

  if (!Array.isArray(body)) return [];

  return body.map((item) => ({
    id: item.id,
    groupId,
    startDate: item.startDate,
    endDate: item.endDate,
    actorId: identity.actorId,
    userId: identity.kind === "user" ? identity.userId : null,
    displayName: identity.displayName,
  }));
}

export async function createAvailability(
  groupId: string,
  payload: { startDate: string; endDate: string },
  identity: Identity
): Promise<AvailabilityEntry> {
  if (identity.kind === "actor") {
    await ensureActorRemote(identity);
  }

  const res = await fetch(apiPath(`/api/groups/${groupId}/availabilities`), {
    method: "POST",
    headers: buildIdentityHeaders(identity, {
      "Content-Type": "application/json",
    }),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Fehler: ${res.status}`);
  }

  const data = (await res.json()) as {
    id: string;
    startDate: string;
    endDate: string;
  };

  return {
    id: data.id,
    groupId,
    startDate: data.startDate,
    endDate: data.endDate,
    actorId: identity.actorId,
    userId: identity.kind === "user" ? identity.userId : null,
    displayName: identity.displayName,
  } satisfies AvailabilityEntry;
}

export async function deleteAvailability(
  availabilityId: string,
  identity: Identity
): Promise<void> {
  if (identity.kind === "actor") {
    await ensureActorRemote(identity);
  }

  const res = await fetch(apiPath(`/api/availabilities/${availabilityId}`), {
    method: "DELETE",
    headers: buildIdentityHeaders(identity),
  });

  if (!res.ok) {
    throw new Error(`Fehler: ${res.status}`);
  }
}
