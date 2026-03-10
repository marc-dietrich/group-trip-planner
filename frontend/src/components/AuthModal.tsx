import type { FormEvent } from "react";
import {
  buttonGhostSmall,
  buttonPrimary,
  buttonRow,
  cardHeaderSubtle,
  eyebrow,
  field,
  input,
  muted,
  modalCard,
  modalOverlay,
  pill,
  pillDanger,
  pillSuccess,
  stackSm,
} from "../ui";

type AuthModalProps = {
  open: boolean;
  authEnabled: boolean;
  authMode: "signin" | "signup";
  email: string;
  password: string;
  authLoading: boolean;
  authError: string | null;
  authNotice: string | null;
  onSubmit: (event: FormEvent) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSwitchMode: (mode: "signin" | "signup") => void;
  onClose: () => void;
};

export function AuthModal({
  open,
  authEnabled,
  authMode,
  email,
  password,
  authLoading,
  authError,
  authNotice,
  onSubmit,
  onEmailChange,
  onPasswordChange,
  onSwitchMode,
  onClose,
}: AuthModalProps) {
  if (!open) return null;

  return (
    <div className={modalOverlay} role="dialog" aria-modal="true">
      <div className={modalCard}>
        <div className={cardHeaderSubtle}>
          <div>
            <p className={eyebrow}>Anmelden</p>
            <h3 className="text-lg font-semibold text-slate-900">
              Anmelden / Registrieren
            </h3>
          </div>
          <button type="button" className={buttonGhostSmall} onClick={onClose}>
            Schließen
          </button>
        </div>

        <p className={muted}>
          Melde dich an, um Gruppen zu erstellen und deine Verfügbarkeiten zu
          speichern.
        </p>

        <form className={stackSm} onSubmit={onSubmit}>
          <label className={field}>
            <span className="text-sm text-slate-700">E-Mail</span>
            <input
              className={input}
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="du@example.com"
            />
          </label>
          <label className={field}>
            <span className="text-sm text-slate-700">Passwort</span>
            <input
              className={input}
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="********"
            />
          </label>

          <div className={buttonRow}>
            <button
              type="submit"
              className={buttonPrimary}
              disabled={authLoading || !authEnabled}
            >
              {authMode === "signin" ? "Anmelden" : "Registrieren"}
            </button>
            <button
              type="button"
              className={buttonGhostSmall}
              onClick={() =>
                onSwitchMode(authMode === "signin" ? "signup" : "signin")
              }
            >
              {authMode === "signin"
                ? "Neu? Registrieren"
                : "Schon ein Konto? Anmelden"}
            </button>
          </div>

          {!authEnabled && (
            <div className={pill}>OAuth Proxy nicht konfiguriert</div>
          )}
          {authError && <div className={pillDanger}>{authError}</div>}
          {authNotice && <div className={pillSuccess}>{authNotice}</div>}
        </form>
      </div>
    </div>
  );
}
