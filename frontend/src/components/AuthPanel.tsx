import type { FormEvent } from "react";
import {
  buttonGhostSmall,
  buttonPrimary,
  buttonRow,
  cardHeaderSubtle,
  cardMinimal,
  eyebrow,
  field,
  input,
  pill,
  pillDanger,
  pillSuccess,
  stackSm,
} from "../ui";

type AuthPanelProps = {
  open: boolean;
  authEnabled: boolean;
  authMode: "signin" | "signup";
  email: string;
  password: string;
  authLoading: boolean;
  authError: string | null;
  authNotice: string | null;
  onToggle: () => void;
  onSubmit: (event: FormEvent) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSwitchMode: (mode: "signin" | "signup") => void;
};

export function AuthPanel({
  open,
  authEnabled,
  authMode,
  email,
  password,
  authLoading,
  authError,
  authNotice,
  onToggle,
  onSubmit,
  onEmailChange,
  onPasswordChange,
  onSwitchMode,
}: AuthPanelProps) {
  return (
    <section className={cardMinimal}>
      <div className={cardHeaderSubtle}>
        <p className={eyebrow}>Anmelden</p>
        <button type="button" className={buttonGhostSmall} onClick={onToggle}>
          {open ? "Schließen" : "Anmelden / Registrieren"}
        </button>
      </div>

      {open && (
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
      )}
    </section>
  );
}
