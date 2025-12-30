import type { FormEvent } from "react";
import {
  buttonPrimary,
  buttonRow,
  cardHeaderSubtle,
  eyebrow,
  field,
  input,
  modalCard,
  modalOverlay,
  muted,
  stackSm,
} from "../ui";

type ActorNameModalProps = {
  open: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (name: string) => void;
};

export function ActorNameModal({
  open,
  value,
  onChange,
  onSubmit,
}: ActorNameModalProps) {
  if (!open) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(value);
  };

  const trimmed = value.trim();
  const disabled = trimmed.length < 2;

  return (
    <div className={modalOverlay} role="dialog" aria-modal="true">
      <div className={modalCard}>
        <div className={cardHeaderSubtle}>
          <div>
            <p className={eyebrow}>Wer plant mit?</p>
            <h3 className="text-lg font-semibold text-slate-900">
              Wie sollen wir dich nennen?
            </h3>
          </div>
        </div>

        <form className={stackSm} onSubmit={handleSubmit}>
          <label className={field}>
            <span className="text-sm text-slate-700">Dein Name</span>
            <input
              className={input}
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="z. B. Alex"
            />
          </label>

          <div className={buttonRow}>
            <button type="submit" className={buttonPrimary} disabled={disabled}>
              Speichern
            </button>
          </div>
          <p className={muted}>
            Wir speichern deinen Namen nur lokal und nutzen ihn, um dich in
            Gruppen anzuzeigen.
          </p>
        </form>
      </div>
    </div>
  );
}
