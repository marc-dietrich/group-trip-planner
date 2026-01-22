import { useEffect } from "react";
import { GroupAvailabilityStats, Identity } from "../types";
import { useGroupStore } from "../state/groupStore";

const POLL_INTERVAL_MS = 8_000;
const EMPTY_STATS: GroupAvailabilityStats = {
  totalUsers: 0,
  usersWithAvailability: 0,
  progress: 0,
};

export function useGroupStats(groupId: string | null, identity: Identity) {
  const statsCache = useGroupStore((state) =>
    groupId ? state.stats[groupId] : undefined,
  );
  const fetchGroupStats = useGroupStore((state) => state.fetchGroupStats);

  useEffect(() => {
    if (!groupId) return;
    const hasCache = Boolean(
      statsCache?.data?.totalUsers || statsCache?.data?.usersWithAvailability,
    );
    void fetchGroupStats(groupId, identity, { background: hasCache });
  }, [
    fetchGroupStats,
    groupId,
    identity,
    statsCache?.data?.totalUsers,
    statsCache?.data?.usersWithAvailability,
  ]);

  useEffect(() => {
    if (!groupId) return;
    const timer = window.setInterval(() => {
      void fetchGroupStats(groupId, identity, {
        force: true,
        background: true,
      });
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [fetchGroupStats, groupId, identity]);

  return {
    data: statsCache?.data ?? EMPTY_STATS,
    loading: statsCache?.loading ?? false,
    error: statsCache?.error ?? null,
    refetch: () =>
      groupId
        ? fetchGroupStats(groupId, identity, { force: true })
        : Promise.resolve(),
  };
}
