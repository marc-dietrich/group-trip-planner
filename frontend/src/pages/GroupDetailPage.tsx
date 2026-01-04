import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { GroupMembership, Identity } from "../types";
import { apiPath } from "../lib/api";
import { AvailabilityFlow } from "../components/AvailabilityFlow";
import {
  buttonGhost,
  buttonGhostDanger,
  buttonPrimary,
  cardMinimal,
  eyebrow,
  modalCard,
  modalOverlay,
  muted,
  pill,
  pillDanger,
  pillNeutral,
  stack,
} from "../ui";
import { useGroupAvailability } from "../hooks/useGroupAvailability";
import { useGroupMemberAvailabilities } from "../hooks/useGroupMemberAvailabilities";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const fullFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type GroupDetailPageProps = {
  identity: Identity;
  groups: GroupMembership[];
};
export function GroupDetailPage({ identity, groups }: GroupDetailPageProps) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState<string>("Gruppe");
  const [groupError, setGroupError] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState<
    Record<string, boolean>
  >({});
  const [memberDeleteError, setMemberDeleteError] = useState<string | null>(
    null
  );
  const [activeEntry, setActiveEntry] = useState<{
    entry: { id: string; startDate: string; endDate: string };
    memberName: string;
    isSelf: boolean;
  } | null>(null);

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useGroupAvailability(
    groupId ?? null,
    identity.kind === "user" ? identity.accessToken : null
  );

  const {
    data: memberAvailabilities,
    loading: membersLoading,
    error: membersError,
    refetch: refetchMembers,
  } = useGroupMemberAvailabilities(
    groupId ?? null,
    identity.kind === "user" ? identity.accessToken : null
  );

  useEffect(() => {
    const fallback = groups.find((g) => g.groupId === groupId);
    if (fallback?.name) {
      setGroupName(fallback.name);
      setGroupError(null);
    }

    if (!groupId) return;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(apiPath(`/api/groups/${groupId}`));
        if (!res.ok) throw new Error(`Fehler: ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setGroupName(data.name || fallback?.name || "Gruppe");
          setGroupError(null);
        }
      } catch (err) {
        if (cancelled) return;
        setGroupError(
          err instanceof Error
            ? err.message
            : "Gruppe konnte nicht geladen werden"
        );
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [groupId, groups]);

  const singleGroupList = useMemo(() => {
    if (!groupId) return [] as GroupMembership[];
    const match = groups.find((g) => g.groupId === groupId);
    return match ? [match] : [];
  }, [groupId, groups]);

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

  const formatMemberName = (value: string) => {
    const trimmed = (value || "").trim();
    if (!trimmed) return "Unbekanntes Mitglied";
    const emailLike = /^[^@]+@[^@]+\.[^@]+$/;
    if (emailLike.test(trimmed)) {
      const [namePart] = trimmed.split("@");
      return namePart || trimmed;
    }
    return trimmed;
  };

  const toggleMember = (memberId: string) => {
    setExpandedMembers((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  };

  const openEntry = (
    entry: { id: string; startDate: string; endDate: string },
    memberName: string,
    isSelf: boolean
  ) => {
    setActiveEntry({ entry, memberName, isSelf });
  };

  const closeEntry = () => setActiveEntry(null);

  const dayDiffInclusive = (startIso: string, endIso: string): number => {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const diff = end.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleDeleteAvailability = async (availabilityId: string) => {
    if (identity.kind !== "user") return;
    setMemberDeleteError(null);
    try {
      const res = await fetch(
        apiPath(`/api/availabilities/${availabilityId}`),
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${identity.accessToken}` },
        }
      );
      if (!res.ok) throw new Error(`Fehler: ${res.status}`);
      await refetchSummary();
      await refetchMembers();
      setActiveEntry(null);
      toast.success("Verfügbarkeit gelöscht");
    } catch (err) {
      setMemberDeleteError(
        err instanceof Error ? err.message : "Löschen fehlgeschlagen"
      );
    }
  };

  return (
    <div className={stack}>
      <section className={cardMinimal}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className={eyebrow}>Gruppe</p>
            <h2 className="text-xl font-semibold text-slate-900">
              {groupName}
            </h2>
            {groupError && <div className={pillDanger}>{groupError}</div>}
          </div>
          <button
            type="button"
            className={buttonGhost}
            onClick={() => navigate(-1)}
          >
            Zurück
          </button>
        </div>
      </section>

      <section className={cardMinimal}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={eyebrow}>Gruppen-Übersicht</p>
            <h3 className="text-lg font-semibold text-slate-900">
              Wann die Gruppe kann
            </h3>
          </div>
        </div>
        <p className={`${muted} mt-2`}>
          Zeigt überlappende Zeiträume und wie viele Mitglieder verfügbar sind.
          Nicht markierte Tage gelten als nicht verfügbar.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {summaryLoading && <p className={muted}>Lade Übersicht...</p>}
          {summaryError && <div className={pillDanger}>{summaryError}</div>}
          {!summaryLoading && !summaryError && summary.length === 0 && (
            <p className={muted}>Keine Überschneidungen vorhanden.</p>
          )}

          {bestInterval && (
            <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-900">
                  {dateFormatter.format(new Date(bestInterval.from))} –{" "}
                  {dateFormatter.format(new Date(bestInterval.to))}
                </span>
                <span className={pillNeutral}>Meiste Zusagen</span>
                <span className={pillNeutral}>
                  {bestInterval.availableCount} von {bestInterval.totalMembers}{" "}
                  Mitgliedern verfügbar
                </span>
              </div>
            </div>
          )}

          {otherIntervals.length > 0 && (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-left"
                onClick={() => setSummaryExpanded((open) => !open)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900">
                    Weitere Zeiträume
                  </span>
                  <span className={pillNeutral}>
                    {otherIntervals.length} Einträge
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-600">
                  {summaryExpanded ? "Schließen" : "Anzeigen"}
                </span>
              </button>

              {summaryExpanded && (
                <ul className="mt-2 flex flex-col gap-2">
                  {otherIntervals.map((item, idx) => (
                    <li
                      key={`${item.from}-${item.to}-${idx}`}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          {dateFormatter.format(new Date(item.from))} –{" "}
                          {dateFormatter.format(new Date(item.to))}
                        </span>
                        <span className={pillNeutral}>
                          {item.availableCount} von {item.totalMembers}{" "}
                          Mitgliedern verfügbar
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      <section className={cardMinimal}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={eyebrow}>Mitglieder</p>
            <h3 className="text-lg font-semibold text-slate-900">
              Verfügbarkeiten
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {identity.kind !== "user" && (
              <div className={pill}>Login nötig</div>
            )}
            <AvailabilityFlow
              groups={singleGroupList}
              identity={identity}
              fixedGroupId={groupId ?? null}
              hideSavedList
              embedded
              renderTrigger={({ open, disabled }) => (
                <button
                  type="button"
                  className={buttonPrimary}
                  onClick={open}
                  disabled={disabled}
                >
                  + Verfügbarkeit
                </button>
              )}
              onChange={() => {
                void refetchSummary();
                void refetchMembers();
              }}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {membersLoading && <p className={muted}>Lade Mitglieder...</p>}
          {membersError && <div className={pillDanger}>{membersError}</div>}
          {memberDeleteError && (
            <div className={pillDanger}>{memberDeleteError}</div>
          )}
          {!membersLoading &&
            !membersError &&
            memberAvailabilities.length === 0 && (
              <p className={muted}>Noch keine Mitglieder gefunden.</p>
            )}

          {Array.isArray(memberAvailabilities) &&
            memberAvailabilities.map((member) => (
              <div
                key={member.memberId}
                className="rounded-lg border border-slate-200 bg-slate-50 p-3"
              >
                <button
                  type="button"
                  className="flex w-full flex-col gap-2 text-left sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => toggleMember(member.memberId)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={pillNeutral}>
                      {formatMemberName(member.displayName)}
                    </span>
                    <span className={pill}>{member.role}</span>
                    <span className={pillNeutral}>
                      {member.availabilities.length} Zeitraum
                      {member.availabilities.length === 1 ? "" : "e"}
                    </span>
                    {identity.kind === "user" &&
                    member.userId === identity.userId ? (
                      <span className={pillNeutral}>Du</span>
                    ) : null}
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    {expandedMembers[member.memberId]
                      ? "Schließen"
                      : "Anzeigen"}
                  </span>
                </button>

                {expandedMembers[member.memberId] && (
                  <div className="mt-3 flex flex-col gap-2">
                    {member.availabilities.length === 0 && (
                      <p className={muted}>Keine Zeiträume hinterlegt.</p>
                    )}
                    {member.availabilities.length > 0 && (
                      <ul className="flex flex-col gap-2">
                        {member.availabilities.map((entry) => (
                          <li
                            key={entry.id}
                            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300 hover:shadow-sm transition"
                            role="button"
                            tabIndex={0}
                            onClick={() =>
                              openEntry(
                                entry,
                                formatMemberName(member.displayName),
                                identity.kind === "user" &&
                                  member.userId === identity.userId
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                openEntry(
                                  entry,
                                  formatMemberName(member.displayName),
                                  identity.kind === "user" &&
                                    member.userId === identity.userId
                                );
                              }
                            }}
                          >
                            <div className="flex w-full flex-wrap items-center gap-2 sm:flex-nowrap">
                              <span className={pillNeutral}>Verfügbar</span>
                              <span className="font-semibold text-slate-900">
                                {dateFormatter.format(
                                  new Date(entry.startDate)
                                )}{" "}
                                –{" "}
                                {dateFormatter.format(new Date(entry.endDate))}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      </section>

      {activeEntry && (
        <div
          className={modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Verfügbarkeit"
        >
          <div className={`${modalCard} max-w-md`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className={eyebrow}>Verfügbarkeit</p>
                <h4 className="text-lg font-semibold text-slate-900">
                  {fullFormatter.format(new Date(activeEntry.entry.startDate))}{" "}
                  – {fullFormatter.format(new Date(activeEntry.entry.endDate))}
                </h4>
                <p className={muted}>
                  {dayDiffInclusive(
                    activeEntry.entry.startDate,
                    activeEntry.entry.endDate
                  )}{" "}
                  Tage eingeplant
                </p>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-700">
                  {activeEntry.memberName}
                </div>
              </div>
            </div>

            <hr className="my-3 border-slate-200" />

            <div className="flex justify-end gap-2">
              {activeEntry.isSelf && identity.kind === "user" && (
                <button
                  type="button"
                  className={buttonGhostDanger}
                  onClick={() => handleDeleteAvailability(activeEntry.entry.id)}
                >
                  Löschen
                </button>
              )}
              <button
                type="button"
                className={buttonPrimary}
                onClick={closeEntry}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
