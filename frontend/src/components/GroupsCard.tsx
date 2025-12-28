import { GroupMembership } from "../types";
import { GroupsPanel } from "./GroupsPanel";

type GroupsCardProps = {
  groups: GroupMembership[];
  groupsLoading: boolean;
  groupsError: string | null;
  deletingId: string | null;
  onDelete: (groupId: string) => void;
  onCreateClick: () => void;
};

export function GroupsCard({
  groups,
  groupsLoading,
  groupsError,
  deletingId,
  onDelete,
  onCreateClick,
}: GroupsCardProps) {
  return (
    <section className="card minimal">
      <div className="card-header subtle">
        <div>
          <p className="eyebrow">Deine Gruppen</p>
          <h3>Übersicht</h3>
        </div>
        <div className="button-row">
          <button type="button" className="ghost small" onClick={onCreateClick}>
            Gruppe erstellen
          </button>
        </div>
      </div>
      <GroupsPanel
        groups={groups}
        groupsLoading={groupsLoading}
        groupsError={groupsError}
        deletingId={deletingId}
        onDelete={onDelete}
      />
    </section>
  );
}
