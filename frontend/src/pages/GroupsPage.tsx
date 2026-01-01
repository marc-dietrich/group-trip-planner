import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GroupMembership, Identity } from "../types";
import {
  buttonGhostTiny,
  buttonPrimary,
  cardMinimal,
  eyebrow,
  muted,
  pill,
  pillDanger,
  pillNeutral,
  pillSuccess,
  stack,
} from "../ui";

const cardBase =
  "rounded-xl border border-slate-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg";

type GroupsPageProps = {
  groups: GroupMembership[];
  groupsLoading: boolean;
  groupsError: string | null;
  deletingId: string | null;
  identity: Identity;
  onCreate: () => void;
  onDelete: (groupId: string) => void;
  onCopyInvite: (group: GroupMembership) => void;
  onRequireLogin: () => void;
};

export function GroupsPage({
  groups,
  groupsLoading,
  groupsError,
  deletingId,
  identity,
  onCreate,
  onDelete,
  onCopyInvite,
  onRequireLogin,
}: GroupsPageProps) {
  const navigate = useNavigate();

  const listBody = useMemo(() => {
    if (groupsLoading) return <p className={muted}>Gruppen werden geladen…</p>;
    if (groupsError)
      return <div className={pillDanger}>{groupsError}</div>;
    if (!groups.length)
      return (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          Noch keine Gruppen. Lege die erste an.
        </div>
      );

    return (
      <ul className="flex flex-col gap-2">
        {groups.map((group) => {
          const memberCountLabel = "1 (du)";
          const availabilityHint =
            identity.kind === "user"
              ? "Öffne die Gruppe, um Verfügbarkeiten zu sehen"
              : "Einloggen, um Verfügbarkeiten zu sehen";

          return (
            <li key={group.groupId}>
              <button
                type="button"
                className={`${cardBase} w-full text-left`}
                onClick={() => navigate(`/groups/${group.groupId}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-slate-600">{memberCountLabel}+</p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {group.name}
                    </h3>
                    <p className="text-sm text-slate-600">{availabilityHint}</p>
                  </div>
                  <span className={pillNeutral}>{group.role}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <button
                    type="button"
                    className={buttonGhostTiny}
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyInvite(group);
                    }}
                  >
                    Einladung kopieren
                  </button>
                  <button
                    type="button"
                    className={`${buttonGhostTiny} text-rose-700`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(group.groupId);
                    }}
                    disabled={deletingId === group.groupId}
                  >
                    {deletingId === group.groupId ? "…" : "Löschen"}
                  </button>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    );
  }, [groups, groupsError, groupsLoading, deletingId, identity.kind, navigate, onCopyInvite, onDelete]);

  return (
    <div className={stack}>
      <section className={cardMinimal}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={eyebrow}>Gruppen</p>
            <h2 className="text-xl font-semibold text-slate-900">
              Deine Trips
            </h2>
          </div>
          <button
            type="button"
            className={buttonPrimary}
            onClick={() => {
              if (identity.kind === "user") onCreate();
              else onRequireLogin();
            }}
          >
            Neue Gruppe
          </button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          {identity.kind === "user" ? (
            <div className={pillSuccess}>Eingeloggt</div>
          ) : (
            <div className={pill}>Bitte einloggen, um Gruppen zu sehen</div>
          )}
        </div>
      </section>

      <section className={cardMinimal}>{listBody}</section>
    </div>
  );
}
