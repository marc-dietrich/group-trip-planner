import type { FormEvent } from "react";
import { GroupCreateResult } from "../types";

type GroupCreateModalProps = {
  open: boolean;
  groupName: string;
  creating: boolean;
  error: string | null;
  result: GroupCreateResult | null;
  onGroupNameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
};

export function GroupCreateModal({
  open,
  groupName,
  creating,
  error,
  result,
  onGroupNameChange,
  onSubmit,
  onClose,
}: GroupCreateModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="card-header subtle">
          <div>
            <p className="eyebrow">Neue Gruppe</p>
            <h3>Gruppe erstellen</h3>
          </div>
          <button type="button" className="ghost small" onClick={onClose}>
            Schließen
          </button>
        </div>

        <form className="stack sm" onSubmit={onSubmit}>
          <label className="field compact">
            <span>Gruppenname</span>
            <input
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
              required
              placeholder="Team Wochenende"
            />
          </label>

          <div className="button-row">
            <button type="submit" className="primary" disabled={creating}>
              {creating ? "Erstelle..." : "Anlegen"}
            </button>
            <button type="button" className="ghost small" onClick={onClose}>
              Abbrechen
            </button>
          </div>

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
      </div>
    </div>
  );
}
