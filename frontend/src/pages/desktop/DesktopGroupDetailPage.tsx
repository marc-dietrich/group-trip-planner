import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { AvailabilityFlow } from "../../components/AvailabilityFlow";
import { Topbar } from "../../components/Topbar";
import { buildIdentityHeaders } from "../../lib/identity";
import { apiPath } from "../../lib/api";
import { useGroupAvailability } from "../../hooks/useGroupAvailability";
import { useGroupMemberAvailabilities } from "../../hooks/useGroupMemberAvailabilities";
import { GroupMembership, HealthCheck, Identity } from "../../types";
import { muted } from "../../ui";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type DesktopGroupDetailPageProps = {
  identity: Identity;
  groups: GroupMembership[];
  health: HealthCheck | null;
};

export function DesktopGroupDetailPage({
  identity,
  groups,
  health,
}: DesktopGroupDetailPageProps) {
  const { groupId } = useParams();
  const [groupName, setGroupName] = useState<string>("Gruppe");
  const { data: summary, refetch: refetchSummary } = useGroupAvailability(
    groupId ?? null,
    identity
  );
  const { data: memberAvailabilities, refetch: refetchMembers } =
    useGroupMemberAvailabilities(groupId ?? null, identity);

  useEffect(() => {
    const fallback = groups.find((g) => g.groupId === groupId);
    if (fallback?.name) setGroupName(fallback.name);

    if (!groupId) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(apiPath(`/api/groups/${groupId}`), {
          headers: buildIdentityHeaders(identity),
        });
        if (!res.ok) throw new Error(`Fehler: ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setGroupName(data.name || fallback?.name || "Gruppe");
        }
      } catch (err) {
        if (cancelled) return;
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [groupId, groups, identity]);

  const bestSummaryIndex = useMemo(() => {
    if (summary.length === 0) return -1;
    let bestIndex = 0;
    for (let i = 1; i < summary.length; i += 1) {
      const candidate = summary[i];
      const currentBest = summary[bestIndex];
      if (candidate.availableCount > currentBest.availableCount) {
        bestIndex = i;
        continue;
      }
      if (candidate.availableCount === currentBest.availableCount) {
        const candidateStart = new Date(candidate.from).getTime();
        const bestStart = new Date(currentBest.from).getTime();
        if (candidateStart < bestStart) {
          bestIndex = i;
        }
      }
    }
    return bestIndex;
  }, [summary]);

  const bestInterval = bestSummaryIndex >= 0 ? summary[bestSummaryIndex] : null;
  const otherIntervals = useMemo(
    () =>
      bestSummaryIndex >= 0
        ? summary.filter((_, idx) => idx !== bestSummaryIndex)
        : [],
    [bestSummaryIndex, summary]
  );

  const memberCount = memberAvailabilities.length || 1;
  const compactMembers = memberAvailabilities.slice(0, 6);
  const remainingMembers = Math.max(0, memberCount - compactMembers.length);
  const highlightInterval = bestInterval || summary[0] || null;
  const highlightFill = highlightInterval
    ? Math.round(
        (highlightInterval.availableCount /
          Math.max(1, highlightInterval.totalMembers)) *
          100
      )
    : 0;

  const formatMemberName = (value: string) => {
    const trimmed = (value || "").trim();
    if (!trimmed) return "Unbekannt";
    const emailLike = /^[^@]+@[^@]+\.[^@]+$/;
    if (emailLike.test(trimmed)) {
      const [namePart] = trimmed.split("@");
      return namePart || trimmed;
    }
    return trimmed;
  };

  return (
    <div className="space-y-8">
      <Topbar
        title={groupName}
        subtitle="Gruppendetails"
        health={health}
        buildLabel={`${memberCount} Personen`}
        buildTitle=""
      />

      <div className="grid grid-cols-[2fr,1fr] gap-6">
        <section className="space-y-6 rounded-3xl border border-sage-100 bg-white/95 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-sage-400">
                Top Zeitraum
              </p>
              <h2 className="text-xl font-semibold text-sage-900">
                {highlightInterval
                  ? `${dateFormatter.format(
                      new Date(highlightInterval.from)
                    )} – ${dateFormatter.format(
                      new Date(highlightInterval.to)
                    )}`
                  : "Noch kein Zeitraum"}
              </h2>
              <p className="text-sm text-sage-600">
                {highlightInterval
                  ? `${highlightInterval.availableCount} von ${highlightInterval.totalMembers} Personen verfügbar`
                  : "Warte auf Verfügbarkeiten"}
              </p>
            </div>
            <div className="min-w-[160px] rounded-2xl border border-sage-100 bg-sage-50 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sage-500">
                Abdeckung
              </p>
              <p className="text-2xl font-bold text-sage-900">{highlightFill}%</p>
            </div>
          </div>

          <div className="space-y-3">
            {highlightInterval ? (
              <div className="rounded-2xl border border-sage-100 bg-sage-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-sage-900">
                    {dateFormatter.format(new Date(highlightInterval.from))} – {" "}
                    {dateFormatter.format(new Date(highlightInterval.to))}
                  </p>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Beste Übereinstimmung
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-brand-primary"
                    style={{ width: `${highlightFill}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className={muted}>Noch keine Überschneidungen vorhanden.</p>
            )}

            {otherIntervals.map((item, idx) => (
              <div
                key={`${item.from}-${item.to}-${idx}`}
                className="rounded-2xl border border-sage-100 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sage-900">
                    {dateFormatter.format(new Date(item.from))} – {" "}
                    {dateFormatter.format(new Date(item.to))}
                  </p>
                  <span className="text-xs font-semibold text-sage-500">
                    {item.availableCount}/{item.totalMembers} verfügbar
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4 rounded-3xl border border-sage-100 bg-white/95 p-5 shadow-soft">
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sage-500">
              Mitglieder
            </p>
            <div className="flex flex-wrap gap-3">
              {compactMembers.map((member) => (
                <div
                  key={member.memberId}
                  className="flex items-center gap-3 rounded-xl border border-sage-100 bg-sage-50 px-3 py-2"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-sm font-bold text-sage-800">
                    {formatMemberName(member.displayName).slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-sage-900">
                      {formatMemberName(member.displayName)}
                    </p>
                    <p className="text-xs text-sage-500">{member.role}</p>
                  </div>
                </div>
              ))}
              {remainingMembers > 0 && (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-sage-200 bg-sage-50 px-3 py-2 text-sm text-sage-600">
                  +{remainingMembers} weitere
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-sage-100 bg-sage-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sage-500">
              Verfügbarkeit erfassen
            </p>
            <AvailabilityFlow
              groups={groups}
              identity={identity}
              embedded
              hideSavedList
              fixedGroupId={groupId || null}
              renderTrigger={({ open }) => (
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl bg-sage-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-sage-800"
                  onClick={open}
                >
                  Slots hinzufügen
                </button>
              )}
              onChange={() => {
                void refetchSummary();
                void refetchMembers();
              }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
