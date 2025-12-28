import { HealthCheck } from "../types";

type StatusCardProps = {
  health: HealthCheck | null;
  loading: boolean;
};

export function StatusCard({ health, loading }: StatusCardProps) {
  return (
    <section className="card muted-card">
      <div className="card-header">
        <div>
          <p className="eyebrow">Backend</p>
          <h3>API Health</h3>
        </div>
      </div>
      {loading ? (
        <p className="muted">Verbinde mit Backend...</p>
      ) : (
        <div
          className={health?.status === "ok" ? "pill success" : "pill danger"}
        >
          {health?.status}: {health?.message}
        </div>
      )}
    </section>
  );
}
