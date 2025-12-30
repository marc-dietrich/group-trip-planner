import { HealthCheck } from "../types";
import { eyebrow as eyebrowCls } from "../ui";

type TopbarProps = {
  title: string;
  subtitle: string;
  health: HealthCheck | null;
};

export function Topbar({ title, subtitle, health }: TopbarProps) {
  const isOk = health?.status === "ok";

  return (
    <header className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className={eyebrowCls}>{subtitle}</p>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      </div>
      <div
        className="flex items-center gap-2 text-sm text-slate-600"
        title={isOk ? "Backend connected" : "Backend nicht erreichbar"}
      >
        <span
          className={`h-3 w-3 rounded-full ${
            isOk ? "bg-emerald-500" : "bg-amber-500"
          }`}
        ></span>
        <span>{isOk ? "Online" : "Offline"}</span>
      </div>
    </header>
  );
}
