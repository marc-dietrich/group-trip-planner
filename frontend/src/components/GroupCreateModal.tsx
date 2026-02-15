import type { FormEvent } from "react";
import {
  buttonGhostSmall,
  buttonPrimary,
  buttonRow,
  cardHeaderSubtle,
  eyebrow,
  field,
  input,
  modalCard,
  modalOverlay,
  muted,
  pillDanger,
  stackSm,
} from "../ui";

type GroupCreateModalProps = {
  open: boolean;
  groupName: string;
  creating: boolean;
  error: string | null;
  onGroupNameChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  onClose: () => void;
};

export function GroupCreateModal({
  open,
  groupName,
  creating,
  error,
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
              placeholder="Gruppenname"
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
        </form>
      </div>
    </div>
  );
}
