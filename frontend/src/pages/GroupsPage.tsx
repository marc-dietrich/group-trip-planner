import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GroupMembership, Identity } from "../types";
import { AvailabilityFlow } from "../components/AvailabilityFlow";
import { muted, pillDanger } from "../ui";
import { useGroupStats } from "../hooks/useGroupStats";

const heroImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA0WLJ-ohPsV1HZBi0hwQj3NaFDlfppm3lhFQ6XMofVH-52QBfRo2pDKozFyMYLvVpP8xfhkNcXwxSnvE9hSXtgWnGCSTJU2iPLMjAItxzvwsyNrW53qoRAyQi5xW9_i2LrpnOpp3yGdabdiTncukOEuj1Fc0SC3HiHMMt-s3g_E7raVQ1tMBHw0Ex8WCYCb-OQfvw-al3vZR0iL2gX2wRs0zMAQuLGlzsiZLMlNleDHhaZMpIqHf-g8AfVCF1PvQwSEaB49vgXG7M",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAXpU5TtPqijFW4TWB5u6Pyk-v_-ReKBKk3q0Mbi9mhWdEr4XGkueeaLcD7u0rgAqdYLzoySGSce1mbOWD86b1Pa-qwv_6SAcfuQW793slCXu79Exngij3zE8rryIolHPUSwyvWkkAXVlDMxYbxoDMF132cGSqn569txGSdHWJGm7kTtIXolg7-1yXERyaC1n2cqVBbba-ObZsrzq7FIMhfAD2B2UvWNd45lGf80c-CFj309a1KymFY0Q1Ffn8ti_OdXPjiszN3LYA",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD3i28Elw_Feunq2K3GfAGi-SNBmuJFRw46SjkuVJxn1SV_e3ecsDrL6YnmIyQSWf2cfzld5CMTox5AfIpWuR8hGDT9qQrICDXbRE1Ir2yWi66Armm-FolWtypSAiZOj5wyfOjUxf3IEeraftLM3paFFSFyTTPRcVORQJQa4zK_LKbLbwhLhqRAPW3PYy9Hgr1gTXdlAmR7j-9ulu_PlKypxJshdKhhDyplp6ZEJIwty-RC_AqZNlufncHY5p_uBrpdL9xaDhBivH4",
];

const pendingSurface = "bg-rose-50 border border-rose-100";
const pendingText = "text-rose-700";
const pendingBadge =
  "inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-rose-700 border border-rose-200";

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
  const listBody = useMemo(() => {
    if (groupsLoading) return <p className={muted}>Gruppen werden geladen…</p>;
    if (groupsError) return <div className={pillDanger}>{groupsError}</div>;
    if (!groups.length)
      return (
        <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50 p-5 text-sm text-sage-700">
          Noch keine Gruppen. Lege die erste an, um Verfügbarkeiten zu teilen.
        </div>
      );

    return (
      <ul className="flex flex-col gap-6">
        {groups.map((group, idx) => (
          <GroupCard
            key={group.groupId}
            group={group}
            identity={identity}
            image={heroImages[idx % heroImages.length]}
          />
        ))}
      </ul>
    );
  }, [groups, groupsError, groupsLoading, identity]);

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
        <div className="flex items-center justify-end w-12">
          <button
            className={`${pendingSurface} ${pendingText} rounded-full p-2 shadow-soft transition-colors`}
            type="button"
            aria-label="Filter (noch nicht aktiv)"
          >
            <span className="material-symbols-outlined !text-[20px]">tune</span>
          </button>
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
          <button
            className={`w-full py-6 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-colors ${pendingText} ${pendingSurface}`}
            type="button"
            aria-label="Historie Platzhalter"
          >
            Historie (noch nicht aktiv)
            <span className="material-symbols-outlined !text-[18px] text-rose-600">
              history
            </span>
          </button>
        </section>
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
