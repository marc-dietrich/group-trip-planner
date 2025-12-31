import { GroupMembership } from "../types";
import { GroupsPanel } from "./GroupsPanel";
import {
  buttonGhostSmall,
  buttonRow,
  cardHeaderSubtle,
  cardMinimal,
  eyebrow,
} from "../ui";

type GroupsCardProps = {
  groups: GroupMembership[];
  groupsLoading: boolean;
  groupsError: string | null;
  deletingId: string | null;
  onDelete: (groupId: string) => void;
  onCreateClick: () => void;
  onCopyInvite: (group: GroupMembership) => void;
};

export function GroupsCard({
  groups,
  groupsLoading,
  groupsError,
  deletingId,
  onDelete,
  onCreateClick,
  onCopyInvite,
}: GroupsCardProps) {
  return (
    <section className={cardMinimal}>
      <div className={cardHeaderSubtle}>
        <div>
          <p className={eyebrow}>Deine Gruppen</p>
          <h3 className="text-lg font-semibold text-slate-900">Übersicht</h3>
        </div>
        <div className={buttonRow}>
          <button
            type="button"
            className={buttonGhostSmall}
            onClick={onCreateClick}
          >
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
        onCopyInvite={onCopyInvite}
      />
    </section>
  );
}
