import { create } from "zustand";
import {
  AvailabilityEntry,
  GroupAvailabilityInterval,
  GroupMembership,
  Identity,
  MemberAvailability,
} from "../types";
import {
  createAvailability,
  deleteAvailability,
  fetchAvailabilitySummary,
  fetchMemberAvailabilities,
  fetchSelfAvailabilities,
} from "../services/availabilityService";
import { fetchGroups as fetchGroupsApi } from "../services/groupService";

const STALE_MS = 15_000;

type CacheEntry<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  lastFetched: number;
};

const emptyCache = <T>(data: T): CacheEntry<T> => ({
  data,
  loading: false,
  error: null,
  lastFetched: 0,
});

function cloneMemberData(data: MemberAvailability[]): MemberAvailability[] {
  return data.map((member) => ({
    ...member,
    availabilities: [...member.availabilities],
  }));
}

type FetchOptions = { force?: boolean; background?: boolean };

type GroupStore = {
  groups: GroupMembership[];
  groupsLoading: boolean;
  groupsError: string | null;
  lastGroupsFetch: number;
  summaries: Record<string, CacheEntry<GroupAvailabilityInterval[]>>;
  memberAvailabilities: Record<string, CacheEntry<MemberAvailability[]>>;
  selfAvailabilities: Record<string, CacheEntry<AvailabilityEntry[]>>;
  fetchGroups: (identity: Identity, opts?: FetchOptions) => Promise<void>;
  fetchGroupSummary: (
    groupId: string,
    identity: Identity,
    opts?: FetchOptions
  ) => Promise<void>;
  fetchMemberAvailabilities: (
    groupId: string,
    identity: Identity,
    opts?: FetchOptions
  ) => Promise<void>;
  fetchSelfAvailabilities: (
    groupId: string,
    identity: Identity,
    opts?: FetchOptions
  ) => Promise<void>;
  optimisticAddAvailability: (params: {
    groupId: string;
    startDate: string;
    endDate: string;
    identity: Identity;
  }) => Promise<AvailabilityEntry>;
  optimisticDeleteAvailability: (params: {
    availabilityId: string;
    groupId: string;
    identity: Identity;
  }) => Promise<void>;
  upsertGroup: (group: GroupMembership) => void;
  removeGroup: (groupId: string) => void;
  resetForIdentity: () => void;
};

function shouldSkipCache<T>(entry: CacheEntry<T> | undefined, force?: boolean) {
  if (force) return false;
  if (!entry) return false;
  const isFresh = Date.now() - entry.lastFetched < STALE_MS;
  return isFresh && !entry.error;
}

function applyMemberAdd(
  cache: CacheEntry<MemberAvailability[]> | undefined,
  identity: Identity,
  entry: AvailabilityEntry
): CacheEntry<MemberAvailability[]> {
  const base = cache ? { ...cache, data: cloneMemberData(cache.data) } : emptyCache<MemberAvailability[]>([]);
  const actorId = identity.actorId;
  const userId = identity.kind === "user" ? identity.userId : null;
  const displayName = identity.displayName || "Du";
  const memberId = `${actorId}:${userId ?? "anon"}`;

  const idx = base.data.findIndex((m) => m.actorId === actorId);
  if (idx >= 0) {
    const member = base.data[idx];
    base.data[idx] = {
      ...member,
      displayName: member.displayName || displayName,
      availabilities: [...member.availabilities, entry].sort((a, b) =>
        a.startDate.localeCompare(b.startDate)
      ),
    };
  } else {
    base.data.push({
      memberId,
      actorId,
      userId,
      displayName,
      role: "member",
      availabilities: [entry],
    });
  }

  return { ...base, error: null, loading: false };
}

function applyMemberDelete(
  cache: CacheEntry<MemberAvailability[]> | undefined,
  availabilityId: string
): CacheEntry<MemberAvailability[]> {
  const base = cache ? { ...cache, data: cloneMemberData(cache.data) } : emptyCache<MemberAvailability[]>([]);
  base.data = base.data.map((member) => ({
    ...member,
    availabilities: member.availabilities.filter((a) => a.id !== availabilityId),
  }));
  return { ...base, error: null, loading: false };
}

function applySelfAdd(
  cache: CacheEntry<AvailabilityEntry[]> | undefined,
  entry: AvailabilityEntry
): CacheEntry<AvailabilityEntry[]> {
  const base = cache ? { ...cache, data: [...cache.data] } : emptyCache<AvailabilityEntry[]>([]);
  const next = [...base.data, entry].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return { ...base, data: next, error: null, loading: false };
}

function applySelfDelete(
  cache: CacheEntry<AvailabilityEntry[]> | undefined,
  availabilityId: string
): CacheEntry<AvailabilityEntry[]> {
  const base = cache ? { ...cache, data: [...cache.data] } : emptyCache<AvailabilityEntry[]>([]);
  return {
    ...base,
    data: base.data.filter((item) => item.id !== availabilityId),
    error: null,
    loading: false,
  };
}

export const useGroupStore = create<GroupStore>((set, get) => ({
  groups: [],
  groupsLoading: false,
  groupsError: null,
  lastGroupsFetch: 0,
  summaries: {},
  memberAvailabilities: {},
  selfAvailabilities: {},

  resetForIdentity: () =>
    set({
      groups: [],
      groupsLoading: false,
      groupsError: null,
      lastGroupsFetch: 0,
      summaries: {},
      memberAvailabilities: {},
      selfAvailabilities: {},
    }),

  upsertGroup: (group) =>
    set((state) => {
      const exists = state.groups.some((g) => g.groupId === group.groupId);
      const groups = exists
        ? state.groups.map((g) => (g.groupId === group.groupId ? { ...g, ...group } : g))
        : [...state.groups, group];
      return { groups };
    }),

  removeGroup: (groupId) =>
    set((state) => ({ groups: state.groups.filter((g) => g.groupId !== groupId) })),

  fetchGroups: async (identity, opts = {}) => {
    const { force = false, background = false } = opts;
    if (shouldSkipCache({
      data: [],
      loading: false,
      error: null,
      lastFetched: get().lastGroupsFetch,
    }, force)) {
      return;
    }
    const hasData = get().groups.length > 0;
    const showLoading = !background && !hasData;

    if (showLoading) set({ groupsLoading: true, groupsError: null });

    try {
      const data = await fetchGroupsApi(identity);
      set({
        groups: data,
        groupsLoading: false,
        groupsError: null,
        lastGroupsFetch: Date.now(),
      });
    } catch (err) {
      set({
        groupsError: err instanceof Error ? err.message : "Laden fehlgeschlagen",
      });
    } finally {
      if (showLoading) {
        set({ groupsLoading: false });
      }
    }
  },

  fetchGroupSummary: async (groupId, identity, opts = {}) => {
    if (!groupId) return;
    const { force = false, background = false } = opts;
    const existing = get().summaries[groupId];
    if (shouldSkipCache(existing, force)) return;

    const hasData = Boolean(existing && existing.data.length > 0);
    const showLoading = !background && !hasData;

    if (showLoading) {
      set((state) => ({
        summaries: {
          ...state.summaries,
          [groupId]: existing
            ? { ...existing, loading: true, error: null }
            : emptyCache<GroupAvailabilityInterval[]>([]),
        },
      }));
    }

    try {
      const data = await fetchAvailabilitySummary(groupId, identity);
      set((state) => ({
        summaries: {
          ...state.summaries,
          [groupId]: {
            data,
            loading: showLoading ? false : existing?.loading ?? false,
            error: null,
            lastFetched: Date.now(),
          },
        },
      }));
    } catch (err) {
      set((state) => ({
        summaries: {
          ...state.summaries,
          [groupId]: {
            data: existing?.data ?? [],
              loading: showLoading ? false : existing?.loading ?? false,
            error: err instanceof Error ? err.message : "Laden fehlgeschlagen",
            lastFetched: existing?.lastFetched ?? 0,
          },
        },
      }));
    }
  },

  fetchMemberAvailabilities: async (groupId, identity, opts = {}) => {
    if (!groupId) return;
    const { force = false, background = false } = opts;
    const existing = get().memberAvailabilities[groupId];
    if (shouldSkipCache(existing, force)) return;

    const hasData = Boolean(existing && existing.data.length > 0);
    const showLoading = !background && !hasData;

    if (showLoading) {
      set((state) => ({
        memberAvailabilities: {
          ...state.memberAvailabilities,
          [groupId]: existing
            ? { ...existing, loading: true, error: null }
            : emptyCache<MemberAvailability[]>([]),
        },
      }));
    }

    try {
      const data = await fetchMemberAvailabilities(groupId, identity);
      set((state) => ({
        memberAvailabilities: {
          ...state.memberAvailabilities,
          [groupId]: {
            data,
            loading: showLoading ? false : existing?.loading ?? false,
            error: null,
            lastFetched: Date.now(),
          },
        },
      }));
    } catch (err) {
      set((state) => ({
        memberAvailabilities: {
          ...state.memberAvailabilities,
          [groupId]: {
            data: existing?.data ?? [],
            loading: showLoading ? false : existing?.loading ?? false,
            error: err instanceof Error ? err.message : "Laden fehlgeschlagen",
            lastFetched: existing?.lastFetched ?? 0,
          },
        },
      }));
    }
  },

  fetchSelfAvailabilities: async (groupId, identity, opts = {}) => {
    if (!groupId) return;
    const { force = false, background = false } = opts;
    const existing = get().selfAvailabilities[groupId];
    if (shouldSkipCache(existing, force)) return;

    const hasData = Boolean(existing && existing.data.length > 0);
    const showLoading = !background && !hasData;

    if (showLoading) {
      set((state) => ({
        selfAvailabilities: {
          ...state.selfAvailabilities,
          [groupId]: existing
            ? { ...existing, loading: true, error: null }
            : emptyCache<AvailabilityEntry[]>([]),
        },
      }));
    }

    try {
      const data = await fetchSelfAvailabilities(groupId, identity);
      set((state) => ({
        selfAvailabilities: {
          ...state.selfAvailabilities,
          [groupId]: {
            data,
            loading: showLoading ? false : existing?.loading ?? false,
            error: null,
            lastFetched: Date.now(),
          },
        },
      }));
    } catch (err) {
      set((state) => ({
        selfAvailabilities: {
          ...state.selfAvailabilities,
          [groupId]: {
            data: existing?.data ?? [],
            loading: showLoading ? false : existing?.loading ?? false,
            error: err instanceof Error ? err.message : "Laden fehlgeschlagen",
            lastFetched: existing?.lastFetched ?? 0,
          },
        },
      }));
    }
  },

  optimisticAddAvailability: async ({ groupId, startDate, endDate, identity }) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimistic: AvailabilityEntry = {
      id: tempId,
      groupId,
      startDate,
      endDate,
      actorId: identity.actorId,
      userId: identity.kind === "user" ? identity.userId : null,
      displayName: identity.displayName,
    };

    const prevMembers = get().memberAvailabilities[groupId];
    const prevSelf = get().selfAvailabilities[groupId];

    // Optimistic update: push into caches immediately while the API runs.
    set((state) => ({
      memberAvailabilities: {
        ...state.memberAvailabilities,
        [groupId]: applyMemberAdd(prevMembers, identity, optimistic),
      },
      selfAvailabilities: {
        ...state.selfAvailabilities,
        [groupId]: applySelfAdd(prevSelf, optimistic),
      },
    }));

    try {
      const saved = await createAvailability(groupId, { startDate, endDate }, identity);

      set((state) => {
        const memberCache = state.memberAvailabilities[groupId];
        const selfCache = state.selfAvailabilities[groupId];

        const replaceId = (list: AvailabilityEntry[]) =>
          list.map((item) => (item.id === tempId ? saved : item));

        return {
          memberAvailabilities: {
            ...state.memberAvailabilities,
            [groupId]: memberCache
              ? {
                  ...memberCache,
                  data: memberCache.data.map((member) => ({
                    ...member,
                    availabilities: replaceId(member.availabilities),
                  })),
                }
              : emptyCache<MemberAvailability[]>([]),
          },
          selfAvailabilities: {
            ...state.selfAvailabilities,
            [groupId]: selfCache
              ? { ...selfCache, data: replaceId(selfCache.data) }
              : emptyCache<AvailabilityEntry[]>([]),
          },
        };
      });

      void get().fetchGroupSummary(groupId, identity, { force: true, background: true });
      void get().fetchMemberAvailabilities(groupId, identity, { force: true, background: true });

      return saved;
    } catch (err) {
      // rollback on failure
      set((state) => ({
        memberAvailabilities: {
          ...state.memberAvailabilities,
          [groupId]: prevMembers ?? emptyCache<MemberAvailability[]>([]),
        },
        selfAvailabilities: {
          ...state.selfAvailabilities,
          [groupId]: prevSelf ?? emptyCache<AvailabilityEntry[]>([]),
        },
      }));
      throw err;
    }
  },

  optimisticDeleteAvailability: async ({ availabilityId, groupId, identity }) => {
    const prevMembers = get().memberAvailabilities[groupId];
    const prevSelf = get().selfAvailabilities[groupId];

    // Remove from caches first; rollback below if the API fails.
    set((state) => ({
      memberAvailabilities: {
        ...state.memberAvailabilities,
        [groupId]: applyMemberDelete(prevMembers, availabilityId),
      },
      selfAvailabilities: {
        ...state.selfAvailabilities,
        [groupId]: applySelfDelete(prevSelf, availabilityId),
      },
    }));

    try {
      await deleteAvailability(availabilityId, identity);
      void get().fetchGroupSummary(groupId, identity, { force: true, background: true });
      void get().fetchMemberAvailabilities(groupId, identity, { force: true, background: true });
    } catch (err) {
      set((state) => ({
        memberAvailabilities: {
          ...state.memberAvailabilities,
          [groupId]: prevMembers ?? emptyCache<MemberAvailability[]>([]),
        },
        selfAvailabilities: {
          ...state.selfAvailabilities,
          [groupId]: prevSelf ?? emptyCache<AvailabilityEntry[]>([]),
        },
      }));
      throw err;
    }
  },
}));
