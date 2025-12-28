import { Identity } from "../types";

type IdentityCardProps = {
  identity: Identity;
  localDisplayName: string;
  onDisplayNameChange: (name: string) => void;
  onLogout: () => void;
  onAuthClick: () => void;
  authLoading: boolean;
  supabaseEnabled: boolean;
};

export function IdentityCard({
  identity,
  localDisplayName,
  onDisplayNameChange,
  onLogout,
  onAuthClick,
  authLoading,
  supabaseEnabled,
}: IdentityCardProps) {
  const isLoggedIn = identity.kind === "user";

  return (
    <section className="card minimal">
      <div className="identity-row">
        <div className="identity-text">
          <p className="eyebrow">Status</p>
          <div className="identity-line">
            {isLoggedIn ? (
              <span>Angemeldet als {identity.displayName}</span>
            ) : (
              <span>Lokaler Nutzer (nicht eingeloggt)</span>
            )}
          </div>
        </div>
        <div className="identity-actions">
          {isLoggedIn ? (
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
              onClick={onAuthClick}
              disabled={!supabaseEnabled}
            >
              Log in / Sign up
            </button>
          )}
        </div>
      </div>

      <div className="stack sm">
        <label className="field compact">
          <span>Anzeigename</span>
          <input
            value={localDisplayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="z. B. Alex"
          />
        </label>
      </div>
    </section>
  );
}
