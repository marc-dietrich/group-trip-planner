import type { FormEvent } from "react";

type AuthModalProps = {
  open: boolean;
  supabaseEnabled: boolean;
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
  supabaseEnabled,
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
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="card-header subtle">
          <div>
            <p className="eyebrow">Anmelden</p>
            <h3>Login / Sign up</h3>
          </div>
          <button type="button" className="ghost small" onClick={onClose}>
            Schließen
          </button>
        </div>

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
      </div>
    </div>
  );
}
