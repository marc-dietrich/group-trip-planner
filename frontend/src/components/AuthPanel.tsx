import type { FormEvent } from "react";

type AuthPanelProps = {
  open: boolean;
  supabaseEnabled: boolean;
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
  supabaseEnabled,
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
    <section className="card minimal">
      <div className="card-header subtle">
        <p className="eyebrow">Anmelden</p>
        <button type="button" className="ghost small" onClick={onToggle}>
          {open ? "Schließen" : "Log in / Sign up"}
        </button>
      </div>

      {open && (
        <form className="stack sm" onSubmit={onSubmit}>
          <label className="field compact">
            <span>E-Mail</span>
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="du@example.com"
            />
          </label>
          <label className="field compact">
            <span>Passwort</span>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="********"
            />
          </label>

          <div className="button-row">
            <button
              type="submit"
              className="primary"
              disabled={authLoading || !supabaseEnabled}
            >
              {authMode === "signin" ? "Login" : "Registrieren"}
            </button>
            <button
              type="button"
              className="ghost small"
              onClick={() =>
                onSwitchMode(authMode === "signin" ? "signup" : "signin")
              }
            >
              {authMode === "signin"
                ? "Neu? Registrieren"
                : "Schon Account? Login"}
            </button>
          </div>

          {!supabaseEnabled && (
            <div className="pill">Supabase nicht konfiguriert</div>
          )}
          {authError && <div className="pill danger">{authError}</div>}
          {authNotice && <div className="pill success">{authNotice}</div>}
        </form>
      )}
    </section>
  );
}
