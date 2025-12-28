import { GroupMembership } from "../types";

type GroupsPanelProps = {
  groups: GroupMembership[];
  groupsLoading: boolean;
  groupsError: string | null;
  deletingId: string | null;
  onDelete: (groupId: string) => void;
};

export function GroupsPanel({
  groups,
  groupsLoading,
  groupsError,
  deletingId,
  onDelete,
}: GroupsPanelProps) {
  return (
    <div className="groups-block">
      {groupsLoading ? (
        <p className="muted">Gruppen werden geladen...</p>
      ) : groupsError ? (
        <div className="pill danger">{groupsError}</div>
      ) : groups.length === 0 ? (
        <p className="muted">Noch keine Gruppe.</p>
      ) : (
        <ul className="group-list">
          {groups.map((g) => (
            <li key={g.groupId}>
              <span>{g.name}</span>
              <div className="group-actions">
                <button
                  type="button"
                  className="ghost tiny danger"
                  onClick={() => onDelete(g.groupId)}
                  disabled={deletingId === g.groupId}
                >
                  {deletingId === g.groupId ? "…" : "Löschen"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
