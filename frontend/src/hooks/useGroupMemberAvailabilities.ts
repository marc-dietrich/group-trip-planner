import { useEffect } from "react";
import { Identity } from "../types";
import { useGroupStore } from "../state/groupStore";

const POLL_INTERVAL_MS = 8_000;

export function useGroupMemberAvailabilities(groupId: string | null, identity: Identity) {
  const memberCache = useGroupStore((state) =>
    groupId ? state.memberAvailabilities[groupId] : undefined
  );
  const fetchMembers = useGroupStore((state) => state.fetchMemberAvailabilities);

  useEffect(() => {
    if (!groupId) return;
    const hasCache = Boolean(memberCache?.data?.length);
    void fetchMembers(groupId, identity, { background: hasCache });
  }, [fetchMembers, groupId, identity, memberCache?.data?.length]);

  useEffect(() => {
    if (!groupId) return;
    // Periodic refresh keeps member lists in sync with other clients.
    const timer = window.setInterval(() => {
      void fetchMembers(groupId, identity, { force: true, background: true });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchMembers, groupId, identity]);

  return {
    data: memberCache?.data ?? [],
    loading: memberCache?.loading ?? false,
    error: memberCache?.error ?? null,
    refetch: () => (groupId ? fetchMembers(groupId, identity, { force: true }) : Promise.resolve()),
  };
}
