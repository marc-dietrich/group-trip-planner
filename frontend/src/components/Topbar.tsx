import { HealthCheck } from "../types";

type TopbarProps = {
  title: string;
  subtitle: string;
  health: HealthCheck | null;
};

export function Topbar({ title, subtitle, health }: TopbarProps) {
  const isOk = health?.status === "ok";

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{subtitle}</p>
        <h1>{title}</h1>
      </div>
      <div
        className="status-indicator"
        title={isOk ? "Backend connected" : "Backend nicht erreichbar"}
      >
        <span className={`dot ${isOk ? "ok" : "warn"}`}></span>
      </div>
    </header>
  );
}
