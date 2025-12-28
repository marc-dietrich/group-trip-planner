import type { Session } from "@supabase/supabase-js";
import { ClaimResponse } from "../types";

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
    <section className="card muted-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Verknüpfung</p>
          <h3>Actor & Supabase</h3>
        </div>
      </div>
      <p className="muted">
        Dein lokaler Actor wird mit dem Supabase-Konto verbunden, damit
        bestehende Gruppen übernommen werden.
      </p>
      {claiming ? (
        <div className="pill">Claim läuft...</div>
      ) : claimError ? (
        <div className="pill danger">{claimError}</div>
      ) : claimResult ? (
        <div className="pill success">Actor verknüpft</div>
      ) : null}
    </section>
  );
}
