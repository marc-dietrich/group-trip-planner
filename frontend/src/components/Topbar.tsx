import { HealthCheck } from "../types";
import { eyebrow as eyebrowCls } from "../ui";

type TopbarProps = {
  title: string;
  subtitle: string;
  health: HealthCheck | null;
  buildLabel?: string;
  buildTitle?: string;
};

export function Topbar({
  title,
  subtitle,
  health,
  buildLabel,
  buildTitle,
}: TopbarProps) {
  const isOk = health?.status === "ok";
  const label = buildLabel?.trim();
  const titleText = buildTitle?.trim() || label;

  return (
    <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className={eyebrowCls}>{subtitle}</p>
        <h1 className="text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          title={isOk ? "Backend connected" : "Backend nicht erreichbar"}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isOk ? "bg-emerald-500" : "bg-amber-500"
            }`}
          ></span>
          <span className="font-medium">{isOk ? "Online" : "Offline"}</span>
        </div>
        {label ? (
          <span
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
            title={titleText}
          >
            Build {label}
          </span>
        ) : null}
      </div>
    </header>
  );
}
