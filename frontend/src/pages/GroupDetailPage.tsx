import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AvailabilityEntry, GroupMembership, Identity } from "../types";
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
  const [entries, setEntries] = useState<AvailabilityEntry[]>([]);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [entriesLoading, setEntriesLoading] = useState(false);

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
        const res = await fetch(`/api/groups/${groupId}`);
        if (!res.ok) throw new Error(`Fehler: ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setGroupName(data.name || fallback?.name || "Gruppe");
          setGroupError(null);
        }
      } catch (err) {
        if (cancelled) return;
        setGroupError(err instanceof Error ? err.message : "Gruppe konnte nicht geladen werden");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [groupId, groups]);

  const fetchEntries = useCallback(
    async (signal?: AbortSignal) => {
      if (!groupId) return;
      if (identity.kind !== "user") {
        setEntries([]);
        setEntriesError("Bitte einloggen, um Verfügbarkeiten zu sehen.");
        return;
      }

      setEntriesLoading(true);
      setEntriesError(null);
      try {
        const res = await fetch(`/api/groups/${groupId}/availabilities`, {
          headers: { Authorization: `Bearer ${identity.accessToken}` },
          signal,
        });
        if (!res.ok) throw new Error(`Fehler: ${res.status}`);
        const data = (await res.json()) as Array<{
          id: string;
          startDate: string;
          endDate: string;
          kind: "available" | "unavailable";
        }>;
        if (signal?.aborted) return;
        setEntries(
          data.map((entry) => ({
            id: entry.id,
            groupId: groupId,
            startDate: entry.startDate,
            endDate: entry.endDate,
            kind: entry.kind,
          }))
        );
      } catch (err) {
        if (signal?.aborted) return;
        setEntriesError(err instanceof Error ? err.message : "Verfügbarkeiten konnten nicht geladen werden");
      } finally {
        if (signal?.aborted) return;
        setEntriesLoading(false);
      }
    },
    [groupId, identity]
  );

  useEffect(() => {
    if (!groupId) return;
    const controller = new AbortController();
    void fetchEntries(controller.signal);
    return () => controller.abort();
  }, [groupId, fetchEntries]);

  const members = useMemo(() => {
    const you = {
      name: identity.displayName,
      role: identity.kind === "user" ? "Mitglied" : "Gast",
      note: "Deine Verfügbarkeiten kannst du im Dialog pflegen.",
      isYou: true,
    };
    const placeholders = [
      {
        name: "Weitere Mitglieder",
        role: "Coming soon",
        note: "Sobald andere ihre Verfügbarkeiten teilen, erscheinen sie hier.",
        isYou: false,
      },
    ];
    return [you, ...placeholders];
  }, [identity.displayName, identity.kind]);

  const singleGroupList = useMemo(() => {
    if (!groupId) return [] as GroupMembership[];
    const match = groups.find((g) => g.groupId === groupId);
    return match ? [match] : [];
  }, [groupId, groups]);

  return (
    <div className={stack}>
      <section className={cardMinimal}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={eyebrow}>Gruppe</p>
            <h2 className="text-xl font-semibold text-slate-900">{groupName}</h2>
            {groupError && <div className={pillDanger}>{groupError}</div>}
          </div>
          <button type="button" className={buttonGhost} onClick={() => navigate(-1)}>
            Zurück
          </button>
        </div>
      </section>

      <section className={cardMinimal}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={eyebrow}>Mitglieder</p>
            <h3 className="text-lg font-semibold text-slate-900">Verfügbarkeiten</h3>
          </div>
          {identity.kind !== "user" && <div className={pill}>Login nötig</div>}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {members.map((member, idx) => (
            <div
              key={`${member.name}-${idx}`}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={pillNeutral}>{member.name}</span>
                  <span className={pill}>{member.role}</span>
                </div>
              </div>
              <p className={`mt-2 ${muted}`}>{member.note}</p>
              {member.isYou && identity.kind === "user" && (
                <div className="mt-3 flex flex-col gap-2">
                  {entriesLoading && <p className={muted}>Lade Verfügbarkeiten...</p>}
                  {entriesError && <div className={pillDanger}>{entriesError}</div>}
                  {!entriesLoading && !entriesError && entries.length === 0 && (
                    <p className={muted}>Noch keine Einträge hinterlegt.</p>
                  )}
                  {entries.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {entries.map((entry) => (
                        <li
                          key={entry.id}
                          className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={pillNeutral}>
                              {entry.kind === "available" ? "Verfügbar" : "Nicht verfügbar"}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {dateFormatter.format(new Date(entry.startDate))} – {dateFormatter.format(
                                new Date(entry.endDate)
                              )}
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
      <section className={cardMinimal}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={eyebrow}>Deine Angaben</p>
            <h3 className="text-lg font-semibold text-slate-900">Verfügbarkeiten</h3>
          </div>
          <span className={pillNeutral}>{identity.kind === "user" ? "Eingeloggt" : "Gast"}</span>
        </div>
        <p className={`${muted} mt-2`}>
          Nutzt den bestehenden Kalender-Dialog, um Zeiträume hinzuzufügen oder zu löschen.
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
              void fetchEntries();
            }}
          />
        </div>
      </section>
    </div>
  );
}
