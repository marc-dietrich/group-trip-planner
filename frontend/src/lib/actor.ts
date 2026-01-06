import React from "react";
import { apiPath } from "./api";
import type { Identity } from "../types";

export type LocalActor = {
  actorId: string;
  displayName: string;
};

export const DEFAULT_ACTOR_NAME = "Gast";
const PLACEHOLDER_NAMES = [DEFAULT_ACTOR_NAME, "Traveler"];

const STORAGE_KEY = "gtp.localActor";

function loadActor(): LocalActor | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as LocalActor;
    if (parsed.actorId && parsed.displayName) {
      return parsed;
    }
  } catch (err) {
    console.warn("Failed to parse local actor", err);
  }

  return null;
}

function persistActor(actor: LocalActor) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(actor));
}

async function upsertActorRemote(actor: LocalActor) {
  try {
    await fetch(apiPath("/api/actors"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: actor.actorId, displayName: actor.displayName }),
    });
  } catch (error) {
    console.warn("Failed to sync actor with backend", error);
  }
}

export async function ensureActorRemote(identityOrActor: Identity | LocalActor) {
  const actorId = "actorId" in identityOrActor ? identityOrActor.actorId : identityOrActor.actorId;
  const displayName =
    "displayName" in identityOrActor && identityOrActor.displayName
      ? identityOrActor.displayName
      : DEFAULT_ACTOR_NAME;

  if (!actorId) return;

  try {
    await fetch(apiPath("/api/actors"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId, displayName }),
    });
  } catch (error) {
    console.warn("Failed to ensure actor with backend", error);
  }
}

export function isPlaceholderActorName(name: string | null | undefined): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  return trimmed.length === 0 || PLACEHOLDER_NAMES.includes(trimmed);
}

export function createActor(displayName: string): LocalActor {
  const safeName = displayName.trim() || DEFAULT_ACTOR_NAME;
  const actor = {
    actorId: crypto.randomUUID(),
    displayName: safeName,
  } satisfies LocalActor;
  persistActor(actor);
  void upsertActorRemote(actor);
  return actor;
}

export function getOrCreateActor(displayName: string = DEFAULT_ACTOR_NAME): LocalActor {
  const existing = loadActor();
  if (existing) return existing;
  return createActor(displayName);
}

export function updateActorDisplayName(actor: LocalActor, displayName: string): LocalActor {
  const updatedName = displayName.trim();
  const updated: LocalActor = { ...actor, displayName: updatedName || actor.displayName };
  persistActor(updated);
  void upsertActorRemote(updated);
  return updated;
}

export function useLocalActor(defaultName: string = DEFAULT_ACTOR_NAME): [LocalActor, (name: string) => void] {
  const initial = getOrCreateActor(defaultName);
  const [actor, setActor] = React.useState<LocalActor>(initial);

  const setDisplayName = React.useCallback(
    (name: string) => {
      const updated = updateActorDisplayName(actor, name);
      setActor(updated);
    },
    [actor],
  );

  React.useEffect(() => {
    persistActor(actor);
    void upsertActorRemote(actor);
  }, [actor]);

  return [actor, setDisplayName];
}
