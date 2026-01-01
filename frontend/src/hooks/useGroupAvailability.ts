import { useCallback, useEffect, useRef, useState } from "react";

export type GroupAvailabilityInterval = {
  from: string;
  to: string;
  availableCount: number;
  totalMembers: number;
};

export function useGroupAvailability(groupId: string | null, accessToken?: string | null) {
  const [data, setData] = useState<GroupAvailabilityInterval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!groupId) {
      setData([]);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/availability-summary`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Fehler: ${res.status}`);
      const body = (await res.json()) as GroupAvailabilityInterval[];
      setData(body);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [groupId, accessToken]);

  useEffect(() => {
    void fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
