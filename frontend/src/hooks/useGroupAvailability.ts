import { useEffect } from "react";
import { Identity } from "../types";
import { useGroupStore } from "../state/groupStore";

const POLL_INTERVAL_MS = 8_000;

export function useGroupAvailability(groupId: string | null, identity: Identity) {
  const summaryCache = useGroupStore((state) =>
    groupId ? state.summaries[groupId] : undefined
  );
  const fetchGroupSummary = useGroupStore((state) => state.fetchGroupSummary);

  useEffect(() => {
    if (!groupId) return;
    const hasCache = Boolean(summaryCache?.data?.length);
    void fetchGroupSummary(groupId, identity, { background: hasCache });
  }, [fetchGroupSummary, groupId, identity, summaryCache?.data?.length]);

  useEffect(() => {
    if (!groupId) return;
    // Poll in the background to pick up changes from other users.
    const timer = window.setInterval(() => {
      void fetchGroupSummary(groupId, identity, {
        force: true,
        background: true,
      });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [fetchGroupSummary, groupId, identity]);

  return {
    data: summaryCache?.data ?? [],
    loading: summaryCache?.loading ?? false,
    error: summaryCache?.error ?? null,
    refetch: () => (groupId ? fetchGroupSummary(groupId, identity, { force: true }) : Promise.resolve()),
  };
}
