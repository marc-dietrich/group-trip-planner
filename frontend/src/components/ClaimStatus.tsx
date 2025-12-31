import type { Session } from "@supabase/supabase-js";
import { cardHeader, muted, mutedCard, pill } from "../ui";

type ClaimStatusProps = {
  session: Session | null;
};

export function ClaimStatus({ session }: ClaimStatusProps) {
  if (!session) return null;

  return (
    <section className={mutedCard}>
      <div className={cardHeader}>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-600">
            Anmeldung erforderlich
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            Verknüpfung deaktiviert
          </h3>
        </div>
      </div>
      <p className={muted}>
        Die Actor-Verknüpfung ist im MVP deaktiviert. Melde dich an, um Gruppen
        direkt als registrierter Nutzer anzulegen.
      </p>
      <div className={pill}>Eingeloggt</div>
    </section>
  );
}
