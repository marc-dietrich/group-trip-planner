import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GroupMembership, Identity } from "../types";
import { AvailabilityFlow } from "../components/AvailabilityFlow";
import { input, muted, pillDanger } from "../ui";
import { useGroupStats } from "../hooks/useGroupStats";

const heroImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA0WLJ-ohPsV1HZBi0hwQj3NaFDlfppm3lhFQ6XMofVH-52QBfRo2pDKozFyMYLvVpP8xfhkNcXwxSnvE9hSXtgWnGCSTJU2iPLMjAItxzvwsyNrW53qoRAyQi5xW9_i2LrpnOpp3yGdabdiTncukOEuj1Fc0SC3HiHMMt-s3g_E7raVQ1tMBHw0Ex8WCYCb-OQfvw-al3vZR0iL2gX2wRs0zMAQuLGlzsiZLMlNleDHhaZMpIqHf-g8AfVCF1PvQwSEaB49vgXG7M",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAXpU5TtPqijFW4TWB5u6Pyk-v_-ReKBKk3q0Mbi9mhWdEr4XGkueeaLcD7u0rgAqdYLzoySGSce1mbOWD86b1Pa-qwv_6SAcfuQW793slCXu79Exngij3zE8rryIolHPUSwyvWkkAXVlDMxYbxoDMF132cGSqn569txGSdHWJGm7kTtIXolg7-1yXERyaC1n2cqVBbba-ObZsrzq7FIMhfAD2B2UvWNd45lGf80c-CFj309a1KymFY0Q1Ffn8ti_OdXPjiszN3LYA",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD3i28Elw_Feunq2K3GfAGi-SNBmuJFRw46SjkuVJxn1SV_e3ecsDrL6YnmIyQSWf2cfzld5CMTox5AfIpWuR8hGDT9qQrICDXbRE1Ir2yWi66Armm-FolWtypSAiZOj5wyfOjUxf3IEeraftLM3paFFSFyTTPRcVORQJQa4zK_LKbLbwhLhqRAPW3PYy9Hgr1gTXdlAmR7j-9ulu_PlKypxJshdKhhDyplp6ZEJIwty-RC_AqZNlufncHY5p_uBrpdL9xaDhBivH4",
];

const pendingSurface = "bg-rose-50 border border-rose-100";
const pendingText = "text-rose-700";
const HISTORY_DAYS = 7;
const FALLBACK_TEST_HOURS = 1;

type GroupCardProps = {
  group: GroupMembership;
  identity: Identity;
  image: string;
};

function GroupCard({ group, identity, image }: GroupCardProps) {
  const navigate = useNavigate();
  const { data: stats, loading } = useGroupStats(group.groupId, identity);

  const submitted = stats.usersWithAvailability ?? 0;
  const total = stats.totalUsers ?? 0;
  const progressRatio = Number.isFinite(stats.progress) ? stats.progress : 0;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(progressRatio * 100)),
  );
  const progressWidth = `${progressPercent}%`;
  const label = loading ? "Lädt…" : `${submitted} von ${total}`;

  return (
    <li
      key={group.groupId}
      className="flex gap-4 group cursor-pointer"
      onClick={() => navigate(`/groups/${group.groupId}`)}
    >
      <div className="relative flex-shrink-0 mt-0.5">
        <div className="size-20 rounded-[24px] overflow-hidden border-2 border-white shadow-soft">
          <img
            src={image}
            alt={group.name}
            className="w-full h-full object-cover"
          />
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
  groupsLoading: boolean;
  groupsError: string | null;
  deletingId: string | null;
  identity: Identity;
  onCreate: () => void;
  onDelete: (groupId: string) => void;
  onCopyInvite: (group: GroupMembership) => void;
  onOpenMenu?: () => void;
};

export function GroupsPage({
  groups,
  groupsLoading,
  groupsError,
  deletingId: _deletingId,
  identity,
  onCreate,
  onDelete: _onDelete,
  onCopyInvite: _onCopyInvite,
  onOpenMenu,
}: GroupsPageProps) {
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

  const totalCount = groups.length;
  const filteredCount = filteredGroups.length;

  const listBody = useMemo(() => {
    if (groupsLoading) return <p className={muted}>Gruppen werden geladen…</p>;
    if (groupsError) return <div className={pillDanger}>{groupsError}</div>;
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
        {activeGroups.map((group, idx) => (
          <GroupCard
            key={group.groupId}
            group={group}
            identity={identity}
            image={heroImages[idx % heroImages.length]}
          />
        ))}
      </ul>
    );
  }, [
    activeGroups,
    filterQuery,
    groupsError,
    groupsLoading,
    historyGroups.length,
    identity,
    isFiltered,
  ]);

  return (
    <div className="relative min-h-[80vh] pb-24">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-1 py-4 flex items-center justify-between border-b border-sage-50">
        <div className="flex items-center w-12">
          <button
            type="button"
            aria-label="Menü"
            onClick={() => onOpenMenu?.()}
            className="flex items-center justify-center p-2 -ml-1 text-sage-900 hover:text-brand-primary transition-colors"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
        <button
          type="button"
          className="whitespace-nowrap rounded-full border border-sage-100 bg-white/90 px-4 py-2 text-brand-primary shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-primary/60 hover:shadow-card font-semibold text-sm tracking-tight"
          onClick={onCreate}
        >
          + Gruppe erstellen
        </button>
        <div
          className="relative flex items-center justify-end w-12"
          ref={filterWrapperRef}
        >
          <button
            className={`rounded-full p-2 shadow-soft transition-colors border ${
              isFiltered
                ? "border-brand-primary/60 bg-brand-soft text-brand-primary"
                : "border-sage-100 bg-white text-sage-900 hover:border-brand-primary/60"
            }`}
            type="button"
            aria-label="Gruppen filtern"
            aria-pressed={isFiltered}
            onClick={() => setFilterOpen((prev) => !prev)}
          >
            <span className="material-symbols-outlined !text-[20px]">tune</span>
          </button>
          {filterOpen ? (
            <div className="absolute right-0 top-12 z-30 w-72 rounded-2xl border border-sage-200 bg-white p-4 shadow-card">
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-sage-500">
                <span>Gruppen filtern</span>
                <span className="text-sage-400">{filteredCount}/{totalCount}</span>
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
                  {isFiltered
                    ? "Filter aktiv"
                    : "Zeigt alle Gruppen"}
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
        <section className="px-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-sage-900 leading-tight">
            Nächste Reise:
            <span
              className={`${pendingSurface} ${pendingText} ml-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold`}
            >
              10. Okt. · Platzhalter
            </span>
          </h1>
        </section>

        <section className="px-1">
          <div className="bg-brand-soft/50 border border-sage-100 rounded-[32px] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2.5 rounded-2xl shadow-soft text-brand-primary">
                  <span className="material-symbols-outlined !text-[20px]">
                    calendar_today
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-sage-400 uppercase tracking-[0.1em]">
                    Aktuellster Slot
                  </span>
                  <span className="text-sm font-semibold text-sage-800">
                    12. Aug — 19. Aug
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-brand-primary bg-white px-2.5 py-1 rounded-full border border-sage-100 uppercase">
                In Kürze
              </span>
            </div>
            <div className="space-y-3 pt-3 border-t border-sage-100/60">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-sage-500 font-medium">
                  24. Sep — 30. Sep
                </span>
                <span className="text-brand-primary/70 font-semibold uppercase tracking-tighter">
                  Bestätigt
                </span>
              </div>
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-sage-500 font-medium">
                  05. Nov — 10. Nov
                </span>
                <span className="text-sage-400 font-medium italic">
                  Ausstehend
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-8 px-1">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-sage-400 uppercase tracking-[0.2em]">
              Aktive Gruppen
            </h3>
            <div className="h-px flex-1 ml-4 bg-sage-100"></div>
          </div>
          {listBody}
          {!showHistory && (
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

        {showHistory && (
          <section className="space-y-6 px-1 pb-2">
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              role="button"
              tabIndex={0}
              aria-label="Historien-Filter deaktivieren"
              onClick={() => setShowHistory(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setShowHistory(false);
              }}
            >
              <div className="h-px flex-1 bg-sage-100"></div>
              <div className="px-3 py-1 rounded-full bg-sage-900 text-white text-[11px] font-bold uppercase tracking-[0.16em] border border-sage-800">
                Ältere Gruppen · {historyLabel}
              </div>
              <div className="h-px flex-1 bg-sage-100"></div>
            </div>
            {historyGroups.length ? (
              <ul className="flex flex-col gap-6">
                {historyGroups.map((group, idx) => (
                  <GroupCard
                    key={group.groupId}
                    group={group}
                    identity={identity}
                    image={
                      heroImages[
                        (idx + activeGroups.length) % heroImages.length
                      ]
                    }
                  />
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-100 bg-amber-50/70 p-4 text-sm text-amber-900">
                Keine Gruppen im gewählten Zeitraum.
              </div>
            )}
          </section>
        )}
      </main>

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
    </div>
  );
}
