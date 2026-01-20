import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AvailabilityFlow } from "../../components/AvailabilityFlow";
import { Topbar } from "../../components/Topbar";
import { GroupMembership, HealthCheck, Identity } from "../../types";
import { muted } from "../../ui";

const fallBackMemberCount = 13;
const heroImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA0WLJ-ohPsV1HZBi0hwQj3NaFDlfppm3lhFQ6XMofVH-52QBfRo2pDKozFyMYLvVpP8xfhkNcXwxSnvE9hSXtgWnGCSTJU2iPLMjAItxzvwsyNrW53qoRAyQi5xW9_i2LrpnOpp3yGdabdiTncukOEuj1Fc0SC3HiHMMt-s3g_E7raVQ1tMBHw0Ex8WCYCb-OQfvw-al3vZR0iL2gX2wRs0zMAQuLGlzsiZLMlNleDHhaZMpIqHf-g8AfVCF1PvQwSEaB49vgXG7M",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAXpU5TtPqijFW4TWB5u6Pyk-v_-ReKBKk3q0Mbi9mhWdEr4XGkueeaLcD7u0rgAqdYLzoySGSce1mbOWD86b1Pa-qwv_6SAcfuQW793slCXu79Exngij3zE8rryIolHPUSwyvWkkAXVlDMxYbxoDMF132cGSqn569txGSdHWJGm7kTtIXolg7-1yXERyaC1n2cqVBbba-ObZsrzq7FIMhfAD2B2UvWNd45lGf80c-CFj309a1KymFY0Q1Ffn8ti_OdXPjiszN3LYA",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD3i28Elw_Feunq2K3GfAGi-SNBmuJFRw46SjkuVJxn1SV_e3ecsDrL6YnmIyQSWf2cfzld5CMTox5AfIpWuR8hGDT9qQrICDXbRE1Ir2yWi66Armm-FolWtypSAiZOj5wyfOjUxf3IEeraftLM3paFFSFyTTPRcVORQJQa4zK_LKbLbwhLhqRAPW3PYy9Hgr1gTXdlAmR7j-9ulu_PlKypxJshdKhhDyplp6ZEJIwty-RC_AqZNlufncHY5p_uBrpdL9xaDhBivH4",
];

type DesktopGroupsPageProps = {
  groups: GroupMembership[];
  groupsLoading: boolean;
  groupsError: string | null;
  identity: Identity;
  health: HealthCheck | null;
  onCreate: () => void;
};

export function DesktopGroupsPage({
  groups,
  groupsLoading,
  groupsError,
  identity,
  health,
  onCreate,
}: DesktopGroupsPageProps) {
  const navigate = useNavigate();

  const groupRows = useMemo(() => {
    if (groupsLoading) return <p className={muted}>Gruppen werden geladen…</p>;
    if (groupsError)
      return (
        <p className="text-sm font-semibold text-rose-600">{groupsError}</p>
      );
    if (!groups.length)
      return (
        <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50 p-6 text-sm text-sage-700">
          Noch keine Gruppen. Lege die erste an, um Verfügbarkeiten zu teilen.
        </div>
      );

    return (
      <ul className="divide-y divide-sage-100">
        {groups.map((group, idx) => {
          const ratioBase = 0.35 + ((idx * 2) % 5) * 0.08;
          const filled = Math.max(
            3,
            Math.min(
              fallBackMemberCount,
              Math.round(fallBackMemberCount * ratioBase)
            )
          );
          const progressWidth = `${Math.min(
            100,
            Math.round((filled / fallBackMemberCount) * 100)
          )}%`;
          const image = heroImages[idx % heroImages.length];

          return (
            <li
              key={group.groupId}
              className="flex items-center gap-5 py-5 transition hover:bg-sage-50"
            >
              <div className="relative flex-shrink-0">
                <div className="size-16 overflow-hidden rounded-2xl border border-white shadow-soft">
                  <img
                    src={image}
                    alt={group.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-sage-900">
                    {group.name}
                  </h3>
                  <button
                    type="button"
                    className="text-sm font-semibold text-brand-primary hover:text-sage-900"
                    onClick={() => navigate(`/groups/${group.groupId}`)}
                  >
                    Öffnen
                  </button>
                </div>
                <p className="text-sm text-sage-600">
                  Nächste Reise: Ziel offen
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-full rounded-full bg-sage-100">
                    <div
                      className="h-2 rounded-full bg-brand-primary"
                      style={{ width: progressWidth }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-sage-700">
                    {filled} von {fallBackMemberCount}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }, [groups, groupsError, groupsLoading, navigate]);

  return (
    <div className="space-y-8">
      <Topbar
        title="Gruppen-Dashboard"
        subtitle="Verfügbarkeit synchronisieren"
        health={health}
        buildLabel={identity.kind === "user" ? "Account" : "Gast"}
        buildTitle={identity.displayName}
      />

      <section className="grid grid-cols-3 gap-6">
        <div className="col-span-2 rounded-3xl border border-sage-100 bg-white/90 p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sage-400">
                Aktive Gruppen
              </p>
              <h2 className="text-xl font-semibold text-sage-900">
                Übersicht & Fortschritt
              </h2>
            </div>
            <button
              type="button"
              className="rounded-xl border border-sage-200 bg-white px-4 py-2 text-sm font-semibold text-brand-primary shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary/60"
              onClick={onCreate}
            >
              + Gruppe erstellen
            </button>
          </div>
          {groupRows}
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-sage-100 bg-gradient-to-b from-white via-cream to-sage-50 p-6 shadow-soft">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sage-500">
              Schnellzugriff
            </p>
            <p className="text-sm text-sage-700">
              Erfasse Verfügbarkeiten oder starte den Flow direkt aus dem
              Dashboard.
            </p>
          </div>
          <AvailabilityFlow
            groups={groups}
            identity={identity}
            embedded
            hideSavedList
            showGroupPickerOnOpen
            renderTrigger={({ open }) => (
              <button
                type="button"
                className="w-full rounded-2xl bg-sage-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sage-800"
                onClick={open}
              >
                Neue Verfügbarkeit erfassen
              </button>
            )}
          />
          <div className="rounded-2xl border border-dashed border-sage-200 bg-white/70 p-4 text-sm text-sage-700">
            Tipp: Desktop behält die Navigation offen. Mobile nutzt das
            Einspalten-Layout.
          </div>
        </div>
      </section>
    </div>
  );
}
