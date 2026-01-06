import { useEffect } from "react";
import { Identity } from "../types";
import { useGroupStore } from "../state/groupStore";

const GROUP_POLL_INTERVAL_MS = 12_000;

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

  return {
    groups,
    groupsLoading,
    groupsError,
    refetch: () => fetchGroups(identity, { force: true }),
  };
}
