import type { Session } from "@supabase/supabase-js";
import { ClaimResponse } from "../types";
import {
  cardHeader,
  muted,
  mutedCard,
  pill,
  pillDanger,
  pillSuccess,
} from "../ui";

type ClaimStatusProps = {
  session: Session | null;
  claiming: boolean;
  claimError: string | null;
  claimResult: ClaimResponse | null;
};

export function ClaimStatus({
  session,
  claiming,
  claimError,
  claimResult,
}: ClaimStatusProps) {
  if (!session) return null;

  return (
    <section className={mutedCard}>
      <div className={cardHeader}>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-600">
            Verknüpfung
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            Actor & Supabase
          </h3>
        </div>
      </div>
      <p className={muted}>
        Dein lokaler Actor wird mit dem Supabase-Konto verbunden, damit
        bestehende Gruppen übernommen werden.
      </p>
      {claiming ? (
        <div className={pill}>Claim läuft...</div>
      ) : claimError ? (
        <div className={pillDanger}>{claimError}</div>
      ) : claimResult ? (
        <div className={pillSuccess}>Actor verknüpft</div>
      ) : null}
    </section>
  );
}
