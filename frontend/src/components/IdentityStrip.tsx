import { Identity } from "../types";

type IdentityStripProps = {
  identity: Identity;
  authLoading: boolean;
  supabaseEnabled: boolean;
  onLogin: () => void;
  onLogout: () => void;
};

export function IdentityStrip({
  identity,
  authLoading,
  supabaseEnabled,
  onLogin,
  onLogout,
}: IdentityStripProps) {
  return (
    <section className="identity-hero">
      <div className="identity-icon">👥</div>
      <div className="identity-main">
        <p className="eyebrow">Status</p>
        <div className="identity-line">
          {identity.kind === "user"
            ? `Angemeldet als ${identity.displayName}`
            : "Lokaler Nutzer (nicht eingeloggt)"}
        </div>
        <div className="identity-subline">
          <span className="hi-badge">Hi {identity.displayName}</span>
          {identity.kind === "user" ? (
            <button
              type="button"
              className="ghost small"
              onClick={onLogout}
              disabled={authLoading}
            >
              Logout
            </button>
          ) : (
            <button
              type="button"
              className="ghost small"
              onClick={onLogin}
              disabled={!supabaseEnabled}
            >
              Log in / Sign up
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
