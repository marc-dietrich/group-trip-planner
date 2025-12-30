import { Identity } from "../types";
import {
  buttonGhostSmall,
  cardMinimal,
  eyebrow,
  field,
  identityLine,
  input,
  stackSm,
} from "../ui";

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
    <section className={cardMinimal}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className={eyebrow}>Status</p>
          <div className={identityLine}>
            {isLoggedIn ? (
              <span>Angemeldet als {identity.displayName}</span>
            ) : (
              <span>Lokaler Nutzer (nicht eingeloggt)</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {isLoggedIn ? (
            <button
              type="button"
              className={buttonGhostSmall}
              onClick={onLogout}
              disabled={authLoading}
            >
              Logout
            </button>
          ) : (
            <button
              type="button"
              className={buttonGhostSmall}
              onClick={onAuthClick}
              disabled={!supabaseEnabled}
            >
              Log in / Sign up
            </button>
          )}
        </div>
      </div>

      <div className={stackSm}>
        <label className={field}>
          <span className="text-sm text-slate-700">Anzeigename</span>
          <input
            className={input}
            value={localDisplayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="z. B. Alex"
          />
        </label>
      </div>
    </section>
  );
}
