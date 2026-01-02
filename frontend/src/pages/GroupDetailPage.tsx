import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GroupMembership, Identity } from "../types";
import { apiPath } from "../lib/api";
import { AvailabilityFlow } from "../components/AvailabilityFlow";
import {
  buttonGhost,
  cardMinimal,
  eyebrow,
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

type GroupDetailPageProps = {
  identity: Identity;
  groups: GroupMembership[];
  groupsLoading: boolean;
  groupsError: string | null;
};
export function GroupDetailPage({
  identity,
  groups,
  groupsLoading,
  groupsError,
}: GroupDetailPageProps) {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [groupName, setGroupName] = useState<string>("Gruppe");
  const [groupError, setGroupError] = useState<string | null>(null);

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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={eyebrow}>Mitglieder</p>
            <h3 className="text-lg font-semibold text-slate-900">
              Verfügbarkeiten
            </h3>
          </div>
          {identity.kind !== "user" && <div className={pill}>Login nötig</div>}
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {membersLoading && <p className={muted}>Lade Mitglieder...</p>}
          {membersError && <div className={pillDanger}>{membersError}</div>}
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={pillNeutral}>{member.displayName}</span>
                    <span className={pill}>{member.role}</span>
                  </div>
                  {identity.kind === "user" &&
                  member.userId === identity.userId ? (
                    <span className={pillNeutral}>Du</span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {member.availabilities.length === 0 && (
                    <p className={muted}>Keine Zeiträume hinterlegt.</p>
                  )}
                  {member.availabilities.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {member.availabilities.map((entry) => (
                        <li
                          key={entry.id}
                          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={pillNeutral}>Verfügbar</span>
                            <span className="font-semibold text-slate-900">
                              {dateFormatter.format(new Date(entry.startDate))}{" "}
                              – {dateFormatter.format(new Date(entry.endDate))}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
        </div>
      </section>
      <section className={cardMinimal}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={eyebrow}>Deine Angaben</p>
            <h3 className="text-lg font-semibold text-slate-900">
              Verfügbarkeiten
            </h3>
          </div>
          <span className={pillNeutral}>
            {identity.kind === "user" ? "Eingeloggt" : "Gast"}
          </span>
        </div>
        <p className={`${muted} mt-2`}>
          Nutzt den bestehenden Kalender-Dialog, um Zeiträume hinzuzufügen oder
          zu löschen.
        </p>
        <div className="mt-4">
          <AvailabilityFlow
            groups={singleGroupList}
            groupsLoading={groupsLoading}
            groupsError={groupsError}
            identity={identity}
            fixedGroupId={groupId ?? null}
            hideSavedList
            onChange={() => {
              void refetchSummary();
              void refetchMembers();
            }}
          />
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
          {summary.length > 0 && (
            <ul className="flex flex-col gap-2">
              {summary.map((item, idx) => (
                <li
                  key={`${item.from}-${item.to}-${idx}`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {dateFormatter.format(new Date(item.from))} –{" "}
                      {dateFormatter.format(new Date(item.to))}
                    </span>
                    <span className={pillNeutral}>
                      {item.availableCount} von {item.totalMembers} Mitgliedern
                      verfügbar
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
