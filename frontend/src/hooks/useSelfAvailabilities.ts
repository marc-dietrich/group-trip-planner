import { useEffect } from "react";
import { Identity } from "../types";
import { useGroupStore } from "../state/groupStore";

const POLL_INTERVAL_MS = 10_000;

export function useSelfAvailabilities(groupId: string | null, identity: Identity) {
  const cache = useGroupStore((state) =>
    groupId ? state.selfAvailabilities[groupId] : undefined
  );
  const fetchSelf = useGroupStore((state) => state.fetchSelfAvailabilities);

  useEffect(() => {
    if (!groupId) return;
    const hasCache = Boolean(cache?.data?.length);
    void fetchSelf(groupId, identity, { background: hasCache });
  }, [fetchSelf, groupId, identity, cache?.data?.length]);

  useEffect(() => {
    if (!groupId) return;
    // Poll softly to reconcile with updates from other devices.
    const timer = window.setInterval(() => {
      void fetchSelf(groupId, identity, { force: true, background: true });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchSelf, groupId, identity]);

  return {
    data: cache?.data ?? [],
    loading: cache?.loading ?? false,
    error: cache?.error ?? null,
    refetch: () => (groupId ? fetchSelf(groupId, identity, { force: true }) : Promise.resolve()),
  };
}
