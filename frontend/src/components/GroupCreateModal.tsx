import type { FormEvent } from "react";
import { GroupCreateResult } from "../types";
import {
  buttonGhostSmall,
  buttonPrimary,
  buttonRow,
  cardHeaderSubtle,
  eyebrow,
  field,
  input,
  metaRow,
  modalCard,
  modalOverlay,
  mono,
  muted,
  pillDanger,
  pillSuccess,
  resultBox,
  stackSm,
} from "../ui";

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
    <div className={modalOverlay} role="dialog" aria-modal="true">
      <div className={modalCard}>
        <div className={cardHeaderSubtle}>
          <div>
            <p className={eyebrow}>Neue Gruppe</p>
            <h3 className="text-lg font-semibold text-slate-900">
              Gruppe erstellen
            </h3>
          </div>
          <button type="button" className={buttonGhostSmall} onClick={onClose}>
            Schließen
          </button>
        </div>

        <p className={muted}>
          Gib deiner Gruppe einen klaren Namen, damit alle wissen, worum es
          geht.
        </p>

        <form className={stackSm} onSubmit={onSubmit}>
          <label className={field}>
            <span className="text-sm text-slate-700">Gruppenname</span>
            <input
              className={input}
              value={groupName}
              onChange={(e) => onGroupNameChange(e.target.value)}
              required
              placeholder="Team Wochenende"
            />
          </label>

          <div className={buttonRow}>
            <button type="submit" className={buttonPrimary} disabled={creating}>
              {creating ? "Erstelle..." : "Anlegen"}
            </button>
            <button
              type="button"
              className={buttonGhostSmall}
              onClick={onClose}
            >
              Abbrechen
            </button>
          </div>

          {error && <div className={pillDanger}>{error}</div>}
          {result && (
            <div className={resultBox}>
              <div className={pillSuccess}>Gruppe erstellt</div>
              <div className={metaRow}>
                <span className={muted}>Group ID</span>
                <code className={mono}>{result.groupId}</code>
              </div>
              <div className={metaRow}>
                <span className={muted}>Invite Link</span>
                <a
                  className="text-blue-600 underline"
                  href={result.inviteLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  {result.inviteLink}
                </a>
              </div>
              <div className={metaRow}>
                <span className={muted}>Rolle</span>
                <span>{result.role}</span>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
