import { useEffect } from "react";
import { Identity } from "../types";
import { useGroupStore } from "../state/groupStore";

const GROUP_POLL_INTERVAL_MS = 12_000;
const QUICK_RETRY_LIMIT = 6;

function isTransientNetworkError(error: string | null): boolean {
  if (!error) return false;
  return /failed to fetch|networkerror|load failed/i.test(error);
}

export function useGroups(identity: Identity) {
  const groups = useGroupStore((state) => state.groups);
  const groupsLoading = useGroupStore((state) => state.groupsLoading);
  const groupsError = useGroupStore((state) => state.groupsError);
  const fetchGroups = useGroupStore((state) => state.fetchGroups);
  const resetForIdentity = useGroupStore((state) => state.resetForIdentity);

  useEffect(() => {
    resetForIdentity();
    if (!identity?.actorId) return;
    void fetchGroups(identity, { force: true, background: false });
    const timer = window.setInterval(() => {
      void fetchGroups(identity, { force: true, background: true });
    }, GROUP_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchGroups, identity.actorId, identity.kind, resetForIdentity]);

  useEffect(() => {
    if (!identity?.actorId) return;
    if (!isTransientNetworkError(groupsError)) return;

    let cancelled = false;

    const runQuickRetries = async () => {
      for (let attempt = 1; attempt <= QUICK_RETRY_LIMIT; attempt += 1) {
        if (cancelled) return;
        const delayMs = Math.min(4000, 400 * 2 ** (attempt - 1));
        await new Promise((resolve) => window.setTimeout(resolve, delayMs));
        if (cancelled) return;

        await fetchGroups(identity, { force: true, background: true });

        const latestError = useGroupStore.getState().groupsError;
        if (!isTransientNetworkError(latestError)) {
          return;
        }
      }
    };

    void runQuickRetries();

    return () => {
      cancelled = true;
    };
  }, [fetchGroups, groupsError, identity.actorId, identity.kind]);

  return {
    groups,
    groupsLoading,
    groupsError,
    refetch: () => fetchGroups(identity, { force: true }),
  };
}
