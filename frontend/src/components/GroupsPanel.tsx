import { GroupMembership } from "../types";
import { buttonGhostDanger, buttonGhostTiny, muted, pillDanger } from "../ui";

type GroupsPanelProps = {
  groups: GroupMembership[];
  groupsLoading: boolean;
  groupsError: string | null;
  deletingId: string | null;
  onDelete: (groupId: string) => void;
  onCopyInvite: (group: GroupMembership) => void;
};

export function GroupsPanel({
  groups,
  groupsLoading,
  groupsError,
  deletingId,
  onDelete,
  onCopyInvite,
}: GroupsPanelProps) {
  return (
    <div className="mt-2">
      {groupsLoading ? (
        <p className={muted}>Gruppen werden geladen...</p>
      ) : groupsError ? (
        <div className={pillDanger}>{groupsError}</div>
      ) : groups.length === 0 ? (
        <p className={muted}>Noch keine Gruppe.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((g) => (
            <li
              key={g.groupId}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <span className="font-medium text-slate-900">{g.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={buttonGhostTiny}
                  onClick={() => onCopyInvite(g)}
                >
                  Link kopieren
                </button>
                <button
                  type="button"
                  className={`${buttonGhostTiny} ${buttonGhostDanger}`}
                  onClick={() => onDelete(g.groupId)}
                  disabled={deletingId === g.groupId}
                >
                  {deletingId === g.groupId ? "..." : "Löschen"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
