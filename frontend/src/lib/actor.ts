import React from "react";

export type LocalActor = {
  actorId: string;
  displayName: string;
};

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

export function createActor(displayName: string): LocalActor {
  const safeName = displayName.trim() || "Traveler";
  const actor = {
    actorId: crypto.randomUUID(),
    displayName: safeName,
  } satisfies LocalActor;
  persistActor(actor);
  return actor;
}

export function getOrCreateActor(displayName: string = "Traveler"): LocalActor {
  const existing = loadActor();
  if (existing) return existing;
  return createActor(displayName);
}

export function updateActorDisplayName(actor: LocalActor, displayName: string): LocalActor {
  const updated: LocalActor = { ...actor, displayName: displayName.trim() || actor.displayName };
  persistActor(updated);
  return updated;
}

export function useLocalActor(defaultName: string = "Traveler"): [LocalActor, (name: string) => void] {
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
  }, [actor]);

  return [actor, setDisplayName];
}
