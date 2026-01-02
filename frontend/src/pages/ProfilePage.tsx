import { HealthCheck, Identity } from "../types";
import {
  buttonGhost,
  buttonPrimary,
  cardMinimal,
  eyebrow,
  muted,
  pillSuccess,
  stack,
  stackSm,
} from "../ui";

type ProfilePageProps = {
  identity: Identity;
  authLoading: boolean;
  supabaseEnabled: boolean;
  health: HealthCheck | null;
  onLogin: () => void;
  onLogout: () => void;
};

export function ProfilePage({
  identity,
  authLoading,
  supabaseEnabled,
  health,
  onLogin,
  onLogout,
}: ProfilePageProps) {
  const isOnline = health?.status === "ok";

  return (
    <div className={stack}>
      {!supabaseEnabled && (
        <section className={cardMinimal}>
          <p className={eyebrow}>Login</p>
          <p className={muted}>
            Supabase ist nicht konfiguriert. Stelle die Umgebungsvariablen
            bereit, um die Anmeldung zu aktivieren.
          </p>
        </section>
      )}

      <section className={cardMinimal}>
        <p className={eyebrow}>Profil</p>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-slate-900">
            {identity.displayName}
          </h2>
          <p className={muted}>
            {identity.kind === "user"
              ? "Angemeldet über Supabase"
              : "Lokaler Modus ohne Login"}
          </p>
          <div className="flex flex-wrap gap-2">
            {identity.kind === "user" ? (
              <button
                type="button"
                className={buttonGhost}
                onClick={onLogout}
                disabled={authLoading}
              >
                Logout
              </button>
            ) : (
              <button
                type="button"
                className={buttonPrimary}
                onClick={onLogin}
                disabled={!supabaseEnabled}
              >
                Login / Signup
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={cardMinimal}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={eyebrow}>Entwicklung</p>
            <h3 className="text-lg font-semibold text-slate-900">Tools</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span>{isOnline ? "Backend OK" : "Backend Fehler"}</span>
          </div>
        </div>
        <div className={stackSm}>
          {supabaseEnabled ? (
            <div className={pillSuccess}>Supabase aktiv</div>
          ) : (
            <p className={muted}>Supabase nicht konfiguriert</p>
          )}
        </div>
      </section>
    </div>
  );
}
