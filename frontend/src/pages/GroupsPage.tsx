import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GroupAvailabilityInterval, GroupMembership, Identity } from "../types";
import { AvailabilityFlow } from "../components/AvailabilityFlow";
import { input, muted, pillDanger } from "../ui";
import { useGroupStats } from "../hooks/useGroupStats";
import { GroupsFetchStatus } from "../hooks/useGroups";
import { useGroupStore } from "../state/groupStore";
import { groupImageUrl } from "../services/imageService";
import genericSurface from "../../assets/generic.webp";

const monthLabels = [
  "Jan",
  "Feb",
  "Mär",
  "Apr",
  "Mai",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Okt",
  "Nov",
  "Dez",
];

const HISTORY_DAYS = 7;
const FALLBACK_TEST_HOURS = 1;

type GroupCardProps = {
  group: GroupMembership;
  identity: Identity;
};

function getGroupInitials(name: string) {
  const cleaned = (name || "").trim();
  if (!cleaned) return "GR";
  const parts = cleaned
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return parts.toUpperCase() || cleaned.slice(0, 2).toUpperCase();
}

type GroupSlot = {
  group: GroupMembership;
  interval: GroupAvailabilityInterval | null;
  perfect: boolean;
  startMs: number;
  placeholder?: boolean;
};

function isTransientNetworkError(error: string | null): boolean {
  if (!error) return false;
  return /failed to fetch|networkerror|load failed/i.test(error);
}

function pickBestInterval(intervals: GroupAvailabilityInterval[]) {
  return intervals.reduce((best, current) => {
    if (!best) return current;
    if (current.availableCount > best.availableCount) return current;
    if (current.availableCount === best.availableCount) {
      const currentStart = new Date(current.from).getTime();
      const bestStart = new Date(best.from).getTime();
      return currentStart < bestStart ? current : best;
    }
    return best;
  }, intervals[0]);
}

function GroupCard({ group, identity }: GroupCardProps) {
  const navigate = useNavigate();
  const { data: stats, loading } = useGroupStats(group.groupId, identity);
  const initials = getGroupInitials(group.name);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const submitted = stats.usersWithAvailability ?? 0;
  const total = stats.totalUsers ?? 0;
  const progressRatio = Number.isFinite(stats.progress) ? stats.progress : 0;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(progressRatio * 100)),
  );
  const progressWidth = `${progressPercent}%`;
  const label = loading ? "Lädt…" : `${submitted} von ${total}`;
  const imageSrc = imageFailed ? genericSurface : groupImageUrl(group.groupId);

  return (
    <li
      key={group.groupId}
      className="flex gap-4 group cursor-pointer"
      onClick={() => navigate(`/groups/${group.groupId}`)}
    >
      <div className="relative flex-shrink-0 mt-0.5">
        <div className="relative size-20 rounded-[24px] overflow-hidden border-2 border-white shadow-soft bg-sage-100">
          <img
            src={imageSrc}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              if (!imageFailed) setImageFailed(true);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-sage-900/15" />
          {!imageLoaded || imageFailed ? (
            <div className="relative z-10 flex h-full w-full items-center justify-center">
              <span className="text-lg font-extrabold tracking-[0.04em] text-sage-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)]">
                {initials}
              </span>
            </div>
          ) : null}
        </div>
        <div className="absolute -top-1 -right-1 bg-brand-primary text-white size-6 rounded-full flex items-center justify-center ring-4 ring-white">
          <span className="material-symbols-outlined text-[14px]">check</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex justify-between items-start mb-1">
          <h4 className="font-semibold text-lg text-sage-900 tracking-tight">
            {group.name}
          </h4>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex flex-col gap-1">
              <div className="flex justify-end">
                <span className="text-[11px] font-semibold whitespace-nowrap text-sage-700">
                  {label}
                </span>
              </div>
              <div className="h-2 w-full bg-sage-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sage-500 rounded-full transition-all"
                  style={{ width: progressWidth }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

type GroupsPageProps = {
  groups: GroupMembership[];
  groupsStatus: GroupsFetchStatus;
  groupsError: string | null;
  deletingId: string | null;
  identity: Identity;
  onCreate: () => void;
  onDelete: (groupId: string) => void;
  onCopyInvite: (group: GroupMembership) => void;
  onOpenMenu?: () => void;
};

function GroupsLoadingSkeleton() {
  return (
    <>
      <section className="relative left-1/2 w-screen -translate-x-1/2">
        <div className="bg-sage-50/60 px-3 py-8 sm:px-4 sm:py-10">
          <div className="h-3 w-24 rounded-full bg-sage-200 animate-pulse" />
          <div className="mt-3 h-8 w-52 rounded-full bg-sage-200 animate-pulse" />
          <div className="mt-6 grid grid-cols-12 gap-1.5">
            {Array.from({ length: 12 }).map((_, idx) => (
              <div
                key={idx}
                className="h-6 rounded-md bg-sage-200 animate-pulse"
              />
            ))}
          </div>
          <div className="mt-7 h-2 w-full rounded-full bg-sage-200 animate-pulse" />
        </div>
      </section>

      <section className="space-y-8 px-1" aria-busy="true" aria-live="polite">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-sage-400 uppercase tracking-[0.2em]">
            Aktive Gruppen
          </h3>
          <div className="h-px flex-1 ml-4 bg-sage-100"></div>
        </div>
        <ul className="flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <li key={idx} className="flex gap-4">
              <div className="size-20 rounded-[24px] bg-sage-200 animate-pulse" />
              <div className="flex-1 pt-1 space-y-3">
                <div className="h-5 w-40 rounded-full bg-sage-200 animate-pulse" />
                <div className="h-2 w-full rounded-full bg-sage-200 animate-pulse" />
                <div className="h-2 w-2/3 rounded-full bg-sage-200 animate-pulse" />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

export function GroupsPage({
  groups,
  groupsStatus,
  groupsError,
  deletingId: _deletingId,
  identity,
  onCreate,
  onDelete: _onDelete,
  onCopyInvite: _onCopyInvite,
  onOpenMenu,
}: GroupsPageProps) {
  const summaries = useGroupStore((state) => state.summaries);
  const fetchGroupSummary = useGroupStore((state) => state.fetchGroupSummary);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const filterWrapperRef = useRef<HTMLDivElement | null>(null);
  const filterInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!filterOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (filterWrapperRef.current?.contains(event.target as Node)) return;
      setFilterOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [filterOpen]);

  useEffect(() => {
    if (filterOpen) filterInputRef.current?.focus();
  }, [filterOpen]);

  const filteredGroups = useMemo(() => {
    const term = filterQuery.trim().toLowerCase();
    if (!term) return groups;

    return groups.filter((group) => group.name.toLowerCase().includes(term));
  }, [filterQuery, groups]);

  const isFiltered = filterQuery.trim().length > 0;

  const { activeGroups, historyGroups, historyLabel } = useMemo(() => {
    const now = Date.now();
    const hasCreatedAt = filteredGroups.some((g) => Boolean(g.createdAt));
    const thresholdMs = hasCreatedAt
      ? HISTORY_DAYS * 24 * 60 * 60 * 1000
      : FALLBACK_TEST_HOURS * 60 * 60 * 1000;
    const label = hasCreatedAt
      ? "Älter als 1 Woche"
      : "Älter als 1 Stunde (Test)";

    const active: GroupMembership[] = [];
    const history: GroupMembership[] = [];

    filteredGroups.forEach((group) => {
      const createdMs = group.createdAt ? Date.parse(group.createdAt) : NaN;
      if (Number.isFinite(createdMs) && now - createdMs > thresholdMs) {
        history.push(group);
      } else {
        active.push(group);
      }
    });

    return {
      activeGroups: active,
      historyGroups: history,
      historyLabel: label,
    };
  }, [filteredGroups]);

  useEffect(() => {
    if (!historyGroups.length && showHistory) {
      setShowHistory(false);
    }
  }, [historyGroups.length, showHistory]);

  useEffect(() => {
    if (!activeGroups.length) return;
    activeGroups.forEach((group) => {
      void fetchGroupSummary(group.groupId, identity, { background: true });
    });
  }, [activeGroups, fetchGroupSummary, identity]);

  const totalCount = groups.length;
  const filteredCount = filteredGroups.length;
  const isInitialLoading = groupsStatus === "loading";
  const isErrorState = groupsStatus === "error";
  const isEmptyState = groupsStatus === "empty" && !isFiltered;

  const groupSlots = useMemo<GroupSlot[]>(() => {
    const now = Date.now();
    return activeGroups
      .map((group) => {
        const summaryEntry = summaries[group.groupId];
        const intervals = (summaryEntry?.data ?? []).filter(
          (interval) => new Date(interval.to).getTime() >= now,
        );
        if (!intervals.length) {
          return {
            group,
            interval: null,
            perfect: false,
            startMs: Number.POSITIVE_INFINITY,
            placeholder: true,
          } satisfies GroupSlot;
        }
        const best = pickBestInterval(intervals);
        return {
          group,
          interval: best,
          perfect:
            best.totalMembers > 0 && best.availableCount >= best.totalMembers,
          startMs: new Date(best.from).getTime(),
        } satisfies GroupSlot;
      })
      .sort((a, b) => a.startMs - b.startMs);
  }, [activeGroups, summaries]);

  const highlightSlot = groupSlots.find((slot) => !slot.placeholder) ?? null;
  const hasBannerSlot = Boolean(highlightSlot?.interval);
  const highlightFill = highlightSlot?.interval
    ? Math.round(
        (highlightSlot.interval.availableCount /
          Math.max(1, highlightSlot.interval.totalMembers)) *
          100,
      )
    : 0;
  const highlightedTripMonths = useMemo(() => {
    if (!highlightSlot?.interval) return new Set<number>();

    const from = new Date(highlightSlot.interval.from);
    const to = new Date(highlightSlot.interval.to);
    const start = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    const months = new Set<number>();

    const cursor = new Date(start);
    while (cursor <= end) {
      months.add(cursor.getMonth());
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return months;
  }, [highlightSlot?.interval]);
  const anySummaryLoading =
    activeGroups.length > 0 &&
    activeGroups.some((group) => summaries[group.groupId]?.loading);

  const listBody = useMemo(() => {
    const transientNetworkIssue = isTransientNetworkError(groupsError);

    if (isInitialLoading)
      return <p className={muted}>Gruppen werden geladen…</p>;
    if (isErrorState && groupsError && !transientNetworkIssue)
      return <div className={pillDanger}>{groupsError}</div>;
    if (isErrorState && groupsError && transientNetworkIssue)
      return <p className={muted}>Verbindung wird hergestellt…</p>;
    if (!activeGroups.length)
      return (
        <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50 p-5 text-sm text-sage-700">
          {isFiltered ? (
            <div className="space-y-2">
              <p>
                Keine aktiven Gruppen für "{filterQuery.trim() || "Filter"}".
              </p>
              {historyGroups.length ? (
                <p className="text-xs text-sage-600">
                  Treffer in der Historie: {historyGroups.length}. Öffne die
                  Historie oder setze den Filter zurück.
                </p>
              ) : null}
              <button
                className="rounded-full border border-sage-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-primary transition hover:border-brand-primary/60"
                type="button"
                onClick={() => setFilterQuery("")}
              >
                Filter zurücksetzen
              </button>
            </div>
          ) : (
            "Noch keine Gruppen. Lege die erste an, um Verfügbarkeiten zu teilen."
          )}
        </div>
      );

    return (
      <ul className="flex flex-col gap-6">
        {activeGroups.map((group) => (
          <GroupCard key={group.groupId} group={group} identity={identity} />
        ))}
      </ul>
    );
  }, [
    activeGroups,
    filterQuery,
    groupsError,
    isErrorState,
    isInitialLoading,
    historyGroups.length,
    identity,
    isFiltered,
  ]);

  return (
    <div className="relative min-h-[80vh] pb-24">
      <header className="sticky top-0 z-10 bg-cream/90 backdrop-blur-md px-1 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Menü"
            onClick={() => onOpenMenu?.()}
            className="flex items-center justify-center p-2 -ml-1 text-sage-900 hover:text-brand-primary transition-colors"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
        {isEmptyState ? (
          <h1 className="text-base font-semibold tracking-tight text-sage-900">
            Gruppen
          </h1>
        ) : (
          <button
            type="button"
            className="whitespace-nowrap px-1 py-1 text-brand-primary font-semibold text-sm tracking-tight transition-colors hover:text-sage-900"
            onClick={onCreate}
          >
            + Gruppe erstellen
          </button>
        )}
        <div
          className="relative flex items-center justify-end"
          ref={filterWrapperRef}
        >
          <button
            className={`p-2 transition-colors ${
              isFiltered
                ? "text-brand-primary"
                : "text-sage-900 hover:text-brand-primary"
            }`}
            type="button"
            aria-label="Gruppen filtern"
            aria-pressed={isFiltered}
            onClick={() => setFilterOpen((prev) => !prev)}
          >
            <span className="material-symbols-outlined !text-[20px]">tune</span>
          </button>
          {filterOpen ? (
            <div className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-sage-200 bg-cream p-4 shadow-card">
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-sage-500">
                <span>Gruppen filtern</span>
                <span className="text-sage-400">
                  {filteredCount}/{totalCount}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={filterInputRef}
                  value={filterQuery}
                  placeholder="Name oder Teilstring"
                  onChange={(e) => setFilterQuery(e.target.value)}
                  className={`${input} text-sm`}
                />
                {filterQuery ? (
                  <button
                    type="button"
                    className="rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-xs font-semibold text-sage-700 transition hover:border-brand-primary/50 hover:text-brand-primary"
                    onClick={() => setFilterQuery("")}
                  >
                    Reset
                  </button>
                ) : null}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-sage-600">
                <span>
                  {isFiltered ? "Filter aktiv" : "Zeigt alle Gruppen"}
                </span>
                {isFiltered ? (
                  <button
                    type="button"
                    className="font-semibold text-brand-primary hover:text-sage-900"
                    onClick={() => setFilterQuery("")}
                  >
                    Filter löschen
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="px-1 sm:px-0 pt-8 space-y-8">
        {isEmptyState ? (
          <section className="px-1 pt-6">
            <div className="min-h-[62vh] flex flex-col items-center justify-center text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-[40px] bg-brand-primary/18" />
                <div className="absolute inset-0 -translate-x-2 -translate-y-2 rounded-[40px] bg-brand-primary/12" />
                <div className="relative size-32 rounded-[40px] bg-brand-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-brand-primary !text-[42px]">
                    groups
                  </span>
                </div>
              </div>

              <h2 className="text-[36px] font-semibold leading-tight tracking-tight text-slate-900 max-w-[340px]">
                Plannungen sollte leichter sein.
              </h2>
              <p className="mt-3 max-w-[300px] text-sm leading-relaxed text-slate-500">
                Erstelle deine erste Gruppe, um zu starten.
              </p>

              <button
                type="button"
                className="mt-8 rounded-full bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-pop transition hover:bg-sage-600"
                onClick={onCreate}
              >
                + Neue Gruppe erstellen
              </button>
            </div>
          </section>
        ) : (
          <>
            {isInitialLoading ? (
              <GroupsLoadingSkeleton />
            ) : (
              <>
                <section className="relative left-1/2 w-screen -translate-x-1/2">
                  {hasBannerSlot && highlightSlot?.interval ? (
                    <div className="bg-sage-50/60 px-3 py-8 sm:px-4 sm:py-10">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sage-500">
                        Nächste Reise
                      </p>
                      <p className="mt-2 text-[30px] leading-tight font-semibold tracking-tight text-slate-900">
                        {highlightSlot.group.name}
                      </p>
                      <div className="mt-5 grid grid-cols-12 gap-1.5">
                        {monthLabels.map((month, index) => {
                          const active = highlightedTripMonths.has(index);
                          return (
                            <div
                              key={month}
                              className={`rounded-md px-0.5 py-1 text-center text-[10px] font-semibold ${
                                active
                                  ? "bg-sage-300 text-sage-900"
                                  : "bg-sage-100 text-sage-500"
                              }`}
                            >
                              {month}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-7 flex items-center justify-between gap-3 text-sm font-semibold text-slate-500">
                        <span>
                          {highlightSlot.interval.availableCount}/
                          {highlightSlot.interval.totalMembers} dabei
                        </span>
                        <span className="text-sage-700">{highlightFill}%</span>
                      </div>
                      <div className="mt-2 h-1 rounded-full bg-sage-200">
                        <div
                          className="h-1 rounded-full bg-sage-500 transition-all"
                          style={{ width: `${highlightFill}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="bg-sage-50/40 px-3 py-10 sm:px-4">
                      {anySummaryLoading ? (
                        <p className="text-sm text-sage-600">
                          Lade Gruppen-Zeiträume ...
                        </p>
                      ) : (
                        <div className="mx-auto flex max-w-[330px] flex-col items-center text-center">
                          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-sage-200 bg-white shadow-soft">
                            <span className="material-symbols-outlined text-[28px] text-sage-500">
                              calendar_month
                            </span>
                          </div>
                          <h3 className="mt-1 whitespace-nowrap text-[28px] font-semibold leading-tight tracking-tight text-slate-800">
                            Wo geht die Reise hin?
                          </h3>
                          <p className="mt-3 max-w-[280px] text-sm leading-relaxed text-slate-500">
                            Sobald ihr euch auf einen Zeitraum einigt, erscheint
                            er hier.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                <section className="space-y-8 px-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-bold text-sage-400 uppercase tracking-[0.2em]">
                      Aktive Gruppen
                    </h3>
                    <div className="h-px flex-1 ml-4 bg-sage-100"></div>
                  </div>
                  {listBody}
                  {!showHistory && historyGroups.length > 0 && (
                    <div className="mt-4">
                      <button
                        className="w-full py-6 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-colors rounded-2xl border bg-sage-100 text-sage-900 border-sage-200 hover:bg-sage-200 hover:border-sage-300 active:scale-[0.99] shadow-soft"
                        type="button"
                        aria-label="Historie anzeigen"
                        onClick={() => setShowHistory(true)}
                      >
                        Historie anzeigen · {historyLabel}
                        <span className="material-symbols-outlined !text-[18px] text-sage-700">
                          history
                        </span>
                      </button>
                    </div>
                  )}
                </section>

                {showHistory && historyGroups.length > 0 ? (
                  <section className="space-y-6 px-1 pb-2">
                    <div
                      className="flex items-center gap-3 cursor-pointer select-none"
                      role="button"
                      tabIndex={0}
                      aria-label="Historien-Filter deaktivieren"
                      onClick={() => setShowHistory(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          setShowHistory(false);
                      }}
                    >
                      <div className="h-px flex-1 bg-sage-100"></div>
                      <div className="px-3 py-1 rounded-full bg-sage-900 text-white text-[11px] font-bold uppercase tracking-[0.16em] border border-sage-800">
                        Ältere Gruppen · {historyLabel}
                      </div>
                      <div className="h-px flex-1 bg-sage-100"></div>
                    </div>
                    <ul className="flex flex-col gap-6">
                      {historyGroups.map((group) => (
                        <GroupCard
                          key={group.groupId}
                          group={group}
                          identity={identity}
                        />
                      ))}
                    </ul>
                  </section>
                ) : null}
              </>
            )}
          </>
        )}
      </main>

      {!isEmptyState ? (
        <div className="fixed bottom-10 left-0 right-0 w-full max-w-[520px] mx-auto px-4 z-20 pointer-events-none">
          <div className="flex justify-end pointer-events-auto">
            <AvailabilityFlow
              groups={groups}
              identity={identity}
              embedded
              hideSavedList
              showGroupPickerOnOpen
              renderTrigger={({ open }) => (
                <button
                  type="button"
                  className="bg-sage-900 text-white flex items-center gap-3 px-7 py-4 rounded-full shadow-xl hover:bg-sage-800 transition-all active:scale-95"
                  onClick={open}
                >
                  <span className="material-symbols-outlined !text-[20px] text-white">
                    add
                  </span>
                  <span className="text-sm font-semibold tracking-tight">
                    Neue Verfügbarkeit
                  </span>
                </button>
              )}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
