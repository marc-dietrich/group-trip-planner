import type { FormEvent } from "react";

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
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="card-header subtle">
          <div>
            <p className="eyebrow">Wer plant mit?</p>
            <h3>Wie sollen wir dich nennen?</h3>
          </div>
        </div>

        <form className="stack sm" onSubmit={handleSubmit}>
          <label className="field compact">
            <span>Dein Name</span>
            <input
              autoFocus
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="z. B. Alex"
            />
          </label>

          <div className="button-row">
            <button type="submit" className="primary" disabled={disabled}>
              Speichern
            </button>
          </div>
          <p className="muted">
            Wir speichern deinen Namen nur lokal und nutzen ihn, um dich in
            Gruppen anzuzeigen.
          </p>
        </form>
      </div>
    </div>
  );
}
