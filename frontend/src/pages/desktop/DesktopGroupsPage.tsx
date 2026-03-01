import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AvailabilityFlow } from "../../components/AvailabilityFlow";
import { Topbar } from "../../components/Topbar";
import { GroupMembership, HealthCheck, Identity } from "../../types";
import { useGroupStats } from "../../hooks/useGroupStats";
import { GroupsFetchStatus } from "../../hooks/useGroups";
import { groupImageUrl } from "../../services/imageService";
import genericSurface from "../../../assets/generic.webp";

type DesktopGroupRowProps = {
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

function DesktopGroupRow({ group, identity }: DesktopGroupRowProps) {
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
  const label = loading ? "Lädt…" : `${submitted} von ${total}`;
  const imageSrc = imageFailed ? genericSurface : groupImageUrl(group.groupId);

  return (
    <li
      key={group.groupId}
      className="flex items-center gap-5 py-5 transition hover:bg-sage-50"
    >
      <div className="relative flex-shrink-0">
        <div className="relative size-16 overflow-hidden rounded-2xl border border-white shadow-soft bg-sage-100">
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
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-sage-50/90 to-sage-200/70" />
          {!imageLoaded || imageFailed ? (
            <div className="relative z-10 flex h-full w-full items-center justify-center">
              <span className="text-sm font-extrabold tracking-wide text-sage-800">
                {initials}
              </span>
            </div>
          ) : null}
          <div className="absolute bottom-1 left-1 z-10 rounded-full bg-white/85 p-0.5 text-sage-500 shadow-sm">
            <span className="material-symbols-outlined !text-[10px]">
              groups
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-sage-900">{group.name}</h3>
          <button
            type="button"
            className="text-sm font-semibold text-brand-primary hover:text-sage-900"
            onClick={() => navigate(`/groups/${group.groupId}`)}
          >
            Öffnen
          </button>
        </div>
        <p className="text-sm text-sage-600">Nächste Reise: Ziel offen</p>
        <div className="flex items-center gap-3">
          <div className="h-2 w-full rounded-full bg-sage-100">
            <div
              className="h-2 rounded-full bg-sage-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-sage-700">{label}</span>
        </div>
      </div>
    </li>
  );
}

type DesktopGroupsPageProps = {
  groups: GroupMembership[];
  groupsStatus: GroupsFetchStatus;
  groupsError: string | null;
  identity: Identity;
  health: HealthCheck | null;
  onCreate: () => void;
};

export function DesktopGroupsPage({
  groups,
  groupsStatus,
  groupsError,
  identity,
  health,
  onCreate,
}: DesktopGroupsPageProps) {
  const isInitialLoading = groupsStatus === "loading";
  const isErrorState = groupsStatus === "error";

  const groupRows = useMemo(() => {
    if (isInitialLoading)
      return (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-5 py-5">
              <div className="size-16 rounded-2xl bg-sage-200 animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-40 rounded-full bg-sage-200 animate-pulse" />
                <div className="h-2 w-full rounded-full bg-sage-200 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      );
    if (isErrorState && groupsError)
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
        {groups.map((group) => (
          <DesktopGroupRow
            key={group.groupId}
            group={group}
            identity={identity}
          />
        ))}
      </ul>
    );
  }, [groups, groupsError, identity, isErrorState, isInitialLoading]);

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
