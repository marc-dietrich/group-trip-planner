import { apiPath } from "../lib/api";
import { buildIdentityHeaders } from "../lib/identity";
import { ensureActorRemote } from "../lib/actor";
import { GroupMembership, Identity } from "../types";

export async function fetchGroups(identity: Identity): Promise<GroupMembership[]> {
  if (identity.kind === "actor") {
    await ensureActorRemote(identity);
  }

  const res = await fetch(apiPath("/api/groups"), {
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
