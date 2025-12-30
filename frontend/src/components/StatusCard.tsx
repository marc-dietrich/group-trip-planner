import { HealthCheck } from "../types";
import { cardHeader, muted, mutedCard, pillDanger, pillSuccess } from "../ui";

type StatusCardProps = {
  health: HealthCheck | null;
  loading: boolean;
};

export function StatusCard({ health, loading }: StatusCardProps) {
  return (
    <section className={mutedCard}>
      <div className={cardHeader}>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-600">
            Backend
          </p>
          <h3 className="text-lg font-semibold text-slate-900">API Health</h3>
        </div>
      </div>
      {loading ? (
        <p className={muted}>Verbinde mit Backend...</p>
      ) : (
        <div className={health?.status === "ok" ? pillSuccess : pillDanger}>
          {health?.status}: {health?.message}
        </div>
      )}
    </section>
  );
}
