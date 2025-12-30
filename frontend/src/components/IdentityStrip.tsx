import { Identity } from "../types";
import {
  buttonGhostSmall,
  eyebrow,
  identityIcon,
  identityLine,
  identityShell,
} from "../ui";

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
    <section className={identityShell}>
      <div className={identityIcon}>👥</div>
      <div className="flex flex-1 flex-col gap-2">
        <p className={eyebrow}>Status</p>
        <div className={identityLine}>
          {identity.kind === "user"
            ? `Angemeldet als ${identity.displayName}`
            : "Lokaler Nutzer (nicht eingeloggt)"}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 font-semibold text-indigo-800">
            Hi {identity.displayName}
          </span>
          {identity.kind === "user" ? (
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
