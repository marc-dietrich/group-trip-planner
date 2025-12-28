import type { FormEvent } from "react";
import { GroupCreateResult } from "../types";

type GroupCreateCardProps = {
  groupName: string;
  creating: boolean;
  error: string | null;
  result: GroupCreateResult | null;
  onGroupNameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function GroupCreateCard({
  groupName,
  creating,
  error,
  result,
  onGroupNameChange,
  onSubmit,
}: GroupCreateCardProps) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Neue Gruppe</p>
          <h3>POST /groups</h3>
        </div>
      </div>

      <form className="stack sm" onSubmit={onSubmit}>
        <label className="field">
          <span>Gruppenname</span>
          <input
            value={groupName}
            onChange={(e) => onGroupNameChange(e.target.value)}
            required
            placeholder="Team Wochenende"
          />
        </label>

        <button type="submit" disabled={creating}>
          {creating ? "Wird erstellt..." : "Gruppe anlegen"}
        </button>

        {error && <div className="pill danger">{error}</div>}
        {result && (
          <div className="result">
            <div className="pill success">Gruppe erstellt</div>
            <div className="meta-row">
              <span className="muted">Group ID</span>
              <code className="mono">{result.groupId}</code>
            </div>
            <div className="meta-row">
              <span className="muted">Invite Link</span>
              <a href={result.inviteLink} target="_blank" rel="noreferrer">
                {result.inviteLink}
              </a>
            </div>
            <div className="meta-row">
              <span className="muted">Rolle</span>
              <span>{result.role}</span>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
