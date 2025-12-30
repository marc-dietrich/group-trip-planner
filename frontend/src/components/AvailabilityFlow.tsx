import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { GroupMembership, Identity } from "../types";

const RANGE_TAG: Record<RangeType, string> = {
  available: "Verfügbar",
  unavailable: "Nicht verfügbar",
};
type RangeType = "available" | "unavailable";
type Step = "type" | "start" | "end" | "review";

type DraftRange = {
  type: RangeType;
  start: string | null;
  end: string | null;
  groupId: string | null;
};

type AvailabilityRange = {
  id: string;
  type: RangeType;
  start: string;
  end: string;
  groupId: string;
  groupName: string;
};

type DayOption = {
  iso: string;
  label: string;
  weekday: string;
  monthLabel: string;
  monthKey: string;
  day: number;
};

type MonthGroup = {
  monthLabel: string;
  monthKey: string;
  days: DayOption[];
};

const initialDraft: DraftRange = {
  type: "available",
  start: null,
  end: null,
  groupId: null,
};

const monthFormatter = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  year: "numeric",
});

const dayFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "short",
});

const fullFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function toLocalISO(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7);
}

function buildMonthGroups(daysAhead = 730): MonthGroup[] {
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  start.setDate(1); // begin at first of current month so earlier days show in the grid

  const groups: Record<string, MonthGroup> = {};

  for (let i = 0; i <= daysAhead; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);

    const iso = toLocalISO(current);
    const monthKey = `${current.getFullYear()}-${String(
      current.getMonth() + 1
    ).padStart(2, "0")}`;
    const monthLabel = monthFormatter.format(current);

    if (!groups[monthKey]) {
      groups[monthKey] = { monthKey, monthLabel, days: [] };
    }

    groups[monthKey].days.push({
      iso,
      label: dayFormatter.format(current),
      weekday: new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(
        current
      ),
      monthLabel,
      monthKey,
      day: current.getDate(),
    });
  }

  return Object.values(groups).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey)
  );
}

function dayDiffInclusive(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

function formatRange(startIso: string, endIso: string): string {
  const start = fullFormatter.format(new Date(startIso));
  const end = fullFormatter.format(new Date(endIso));
  if (startIso === endIso) return start;
  return `${start} → ${end}`;
}

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

type MonthCalendarProps = {
  month: MonthGroup;
  selected: string | null;
  minDate?: string | null;
  maxDate?: string | null;
  todayIso: string;
  atStart: boolean;
  atEnd: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (iso: string) => void;
};

function MonthCalendar({
  month,
  selected,
  minDate,
  maxDate,
  todayIso,
  atStart,
  atEnd,
  onPrev,
  onNext,
  onSelect,
}: MonthCalendarProps) {
  const monthDate = new Date(`${month.monthKey}-01T12:00:00`);
  const weekdayOffset = (monthDate.getDay() + 6) % 7; // Monday as first day

  const baseCells: Array<DayOption | null> = [
    ...Array.from({ length: weekdayOffset }, () => null as DayOption | null),
    ...month.days,
  ];

  const rows = 6; // fixed grid height so navigation doesn’t shift between months
  const totalCells = rows * 7;
  const cells: Array<DayOption | null> = baseCells.concat(
    Array.from(
      { length: totalCells - baseCells.length },
      () => null as DayOption | null
    )
  );

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button
          type="button"
          className="ghost tiny"
          onClick={onPrev}
          disabled={atStart}
        >
          ←
        </button>
        <div className="calendar-title">{month.monthLabel}</div>
        <button
          type="button"
          className="ghost tiny"
          onClick={onNext}
          disabled={atEnd}
        >
          →
        </button>
      </div>

      <div className="calendar-weekdays">
        {"Mo Di Mi Do Fr Sa So".split(" ").map((day) => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {cells.map((cell, idx) => {
          if (!cell)
            return <div key={`empty-${idx}`} className="calendar-cell empty" />;

          const isDisabled = Boolean(
            (minDate && cell.iso < minDate) || (maxDate && cell.iso > maxDate)
          );
          const isSelected = selected === cell.iso;
          const isToday = todayIso === cell.iso;

          return (
            <button
              key={cell.iso}
              type="button"
              className={`calendar-cell ${isSelected ? "selected" : ""} ${
                isToday ? "today" : ""
              }`}
              disabled={isDisabled}
              onClick={() => onSelect(cell.iso)}
              aria-pressed={isSelected}
            >
              <span className="calendar-day-number">{cell.day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

type AvailabilityFlowProps = {
  groups: GroupMembership[];
  groupsLoading: boolean;
  groupsError: string | null;
  identity: Identity;
};

export function AvailabilityFlow({
  groups,
  groupsLoading,
  groupsError,
  identity,
}: AvailabilityFlowProps) {
  const [draft, setDraft] = useState<DraftRange>(initialDraft);
  const [step, setStep] = useState<Step>("type");
  const [ranges, setRanges] = useState<AvailabilityRange[]>([]);
  const [rangesLoading, setRangesLoading] = useState(false);
  const [rangesError, setRangesError] = useState<string | null>(null);
  // editing disabled: entries are either created new or deleted
  const [listOpen, setListOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const selectedGroup = useMemo(
    () => groups.find((g) => g.groupId === selectedGroupId) ?? null,
    [selectedGroupId, groups]
  );

  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupId(null);
      setDraft((prev) => ({ ...prev, groupId: null }));
      return;
    }

    setSelectedGroupId((prev) => {
      if (prev && groups.some((g) => g.groupId === prev)) return prev;
      return groups[0]?.groupId ?? null;
    });

    setDraft((prev) => {
      if (prev.groupId && groups.some((g) => g.groupId === prev.groupId)) {
        return prev;
      }
      const fallback = groups[0]?.groupId ?? null;
      return { ...prev, groupId: fallback };
    });
  }, [groups]);

  useEffect(() => {
    if (identity.kind !== "user") return;
    if (!selectedGroupId) {
      setRanges([]);
      setRangesError(null);
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      setRangesLoading(true);
      setRangesError(null);
      try {
        const res = await fetch(
          `/api/groups/${selectedGroupId}/availabilities`,
          {
            headers: { Authorization: `Bearer ${identity.accessToken ?? ""}` },
            signal: controller.signal,
          }
        );
        if (!res.ok) throw new Error(`Fehler: ${res.status}`);
        const data = (await res.json()) as Array<{
          id: string;
          startDate: string;
          endDate: string;
          kind: RangeType;
        }>;
        const mapped: AvailabilityRange[] = data
          .map((item) => ({
            id: item.id,
            type: item.kind,
            start: item.startDate,
            end: item.endDate,
            groupId: selectedGroupId,
            groupName:
              groups.find((g) => g.groupId === selectedGroupId)?.name ||
              "Unbekannte Gruppe",
          }))
          .sort((a, b) => a.start.localeCompare(b.start));
        setRanges(mapped);
        setListOpen(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        setRangesError(
          err instanceof Error ? err.message : "Laden fehlgeschlagen"
        );
      } finally {
        if (controller.signal.aborted) return;
        setRangesLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [identity, selectedGroupId, groups]);

  const monthGroups = useMemo(() => buildMonthGroups(730), []);
  const [monthIndex, setMonthIndex] = useState(0);

  const todayIso = useMemo(() => toLocalISO(new Date()), []);
  const maxIso = useMemo(() => {
    const lastMonth = monthGroups[monthGroups.length - 1];
    const lastDay = lastMonth?.days[lastMonth.days.length - 1];
    return lastDay?.iso ?? todayIso;
  }, [monthGroups, todayIso]);

  const hasMonths = monthGroups.length > 0;
  const atStart = monthIndex === 0;
  const atEnd = hasMonths ? monthIndex === monthGroups.length - 1 : true;
  const currentMonth = hasMonths
    ? monthGroups[Math.min(monthIndex, monthGroups.length - 1)]
    : null;

  const goPrevMonth = () => setMonthIndex((idx) => Math.max(0, idx - 1));
  const goNextMonth = () =>
    setMonthIndex((idx) =>
      Math.min(monthGroups.length - 1, Math.max(0, idx + 1))
    );

  const stepNumber =
    step === "type" ? 1 : step === "start" ? 2 : step === "end" ? 3 : 4;
  const stepLabel: Record<Step, string> = {
    type: "Was möchtest du angeben?",
    start: "Startdatum wählen",
    end: "Enddatum festlegen",
    review: "Prüfen und speichern",
  };

  const durationLabel =
    draft.start && draft.end
      ? `${dayDiffInclusive(draft.start, draft.end)} Tage`
      : "–";

  const canSave = Boolean(
    draft.start &&
      draft.end &&
      draft.groupId &&
      identity.kind === "user" &&
      !saving
  );

  const handleTypeChoice = (type: RangeType) => {
    setDraft((prev) => ({ ...prev, type }));
    setMonthIndex(0);
    setStep("start");
  };

  const handleStartSelect = (iso: string) => {
    setDraft((prev) => ({ ...prev, start: iso, end: iso }));
    setStep("end");
  };

  const handleEndSelect = (iso: string) => {
    setDraft((prev) => ({ ...prev, end: iso }));
    setStep("review");
  };

  const resetFlow = () => {
    const fallbackGroupId =
      selectedGroupId && groups.some((g) => g.groupId === selectedGroupId)
        ? selectedGroupId
        : groups[0]?.groupId ?? null;

    setDraft({ ...initialDraft, groupId: fallbackGroupId });
    setStep("type");
  };

  const handleSave = async () => {
    if (!draft.start || !draft.end) return;
    if (!draft.groupId) {
      toast.error("Bitte wähle eine Gruppe");
      return;
    }

    if (identity.kind !== "user") {
      toast.error("Bitte melde dich an, um Verfügbarkeiten zu speichern.");
      return;
    }

    const group = groups.find((g) => g.groupId === draft.groupId);
    if (!group) {
      toast.error("Ausgewählte Gruppe nicht mehr vorhanden");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${group.groupId}/availabilities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${identity.accessToken ?? ""}`,
        },
        body: JSON.stringify({
          startDate: draft.start,
          endDate: draft.end,
          kind: draft.type,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Fehler: ${res.status}`);
      }

      const data = (await res.json()) as {
        id: string;
        startDate: string;
        endDate: string;
        kind: RangeType;
      };

      const payload: AvailabilityRange = {
        id: data.id,
        type: data.kind,
        start: data.startDate,
        end: data.endDate,
        groupId: group.groupId,
        groupName: group.name,
      };

      setRanges((prev) =>
        [...prev, payload].sort((a, b) => a.start.localeCompare(b.start))
      );

      toast.success("Zeitraum gespeichert");
      resetFlow();
      setOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Speichern fehlgeschlagen"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (identity.kind !== "user") {
      toast.error("Bitte anmelden, um zu löschen");
      return;
    }

    const doDelete = async () => {
      try {
        const res = await fetch(`/api/availabilities/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${identity.accessToken ?? ""}` },
        });
        if (!res.ok) throw new Error(`Fehler: ${res.status}`);
        setRanges((prev) => prev.filter((item) => item.id !== id));
        toast.success("Gelöscht");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Löschen fehlgeschlagen"
        );
      }
    };

    void doDelete();
  };

  const closeDialog = () => {
    resetFlow();
    setOpen(false);
  };

  useEffect(() => {
    if (!draft.start) return;
    const key = monthKeyFromIso(draft.start);
    const idx = monthGroups.findIndex((m) => m.monthKey === key);
    if (idx >= 0) {
      setMonthIndex(idx);
    }
  }, [draft.start, monthGroups]);

  return (
    <section className="card availability-card">
      <div className="card-header subtle">
        <div>
          <p className="eyebrow">Verfügbarkeiten</p>
          <h3>Wann passt es dir?</h3>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="primary"
            onClick={() => {
              if (identity.kind !== "user") {
                toast.error(
                  "Bitte zuerst anmelden, um Verfügbarkeiten zu erfassen."
                );
                return;
              }
              setOpen(true);
            }}
            disabled={identity.kind !== "user"}
          >
            + Hinzufügen
          </button>
        </div>
      </div>
      {identity.kind !== "user" && (
        <div className="pill warning" style={{ marginTop: "0.5rem" }}>
          Bitte melde dich an, bevor du Verfügbarkeiten hinzufügst.
        </div>
      )}
      {open && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="card-header subtle">
              <div>
                <p className="eyebrow">Neuer Zeitraum</p>
                <h3>Wann passt es dir?</h3>
              </div>
              <div className="button-row">
                <button
                  type="button"
                  className="ghost small"
                  onClick={closeDialog}
                >
                  Schließen
                </button>
              </div>
            </div>

            <p className="muted">
              Schritt-für-Schritt mit Kalender: Verfügbar/Nicht verfügbar
              wählen, Start und Ende setzen, prüfen und speichern.
            </p>

            <div className="stack xs">
              <label className="field compact">
                <span>Gruppe auswählen</span>
                <select
                  value={selectedGroupId ?? ""}
                  onChange={(e) => {
                    const nextId = e.target.value || null;
                    setSelectedGroupId(nextId);
                    setDraft((prev) => ({ ...prev, groupId: nextId }));
                  }}
                  disabled={groupsLoading || !groups.length}
                  required
                >
                  <option value="" disabled>
                    {groupsLoading ? "Lade Gruppen..." : "Gruppe wählen"}
                  </option>
                  {groups.map((group) => (
                    <option key={group.groupId} value={group.groupId}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>

              {groupsError && <div className="pill danger">{groupsError}</div>}
              {!groupsLoading && !groups.length && (
                <p className="muted small">
                  Lege zuerst eine Gruppe an, um Verfügbarkeiten zuzuordnen.
                </p>
              )}
            </div>

            {step === "type" && (
              <div className="type-choices">
                <button
                  type="button"
                  className="type-choice available"
                  onClick={() => handleTypeChoice("available")}
                >
                  <div className="type-choice-title">Ich bin verfügbar</div>
                  <div className="type-choice-sub">
                    Zeige den Zeitraum, in dem du mitreisen kannst.
                  </div>
                </button>
                <button
                  type="button"
                  className="type-choice unavailable"
                  onClick={() => handleTypeChoice("unavailable")}
                >
                  <div className="type-choice-title">
                    Ich bin nicht verfügbar
                  </div>
                  <div className="type-choice-sub">
                    Blende Tage aus, die für dich nicht gehen.
                  </div>
                </button>
              </div>
            )}

            {step !== "type" && (
              <>
                <div className="draft-bar">
                  <div className={`range-chip ${draft.type}`}>
                    {RANGE_TAG[draft.type]}
                  </div>
                  <div className="draft-actions">
                    <button
                      type="button"
                      className="ghost tiny"
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          type:
                            prev.type === "available"
                              ? "unavailable"
                              : "available",
                        }))
                      }
                    >
                      Typ wechseln
                    </button>
                    <button
                      type="button"
                      className="ghost tiny"
                      onClick={resetFlow}
                    >
                      Neu starten
                    </button>
                  </div>
                </div>

                <div className="stepper">
                  <span className="step-badge">{stepNumber}/4</span>
                  <span className="step-label">{stepLabel[step]}</span>
                  <span className="step-duration">{durationLabel}</span>
                </div>
              </>
            )}

            {step === "start" && currentMonth && (
              <div className="stack sm">
                <p className="muted">Wähle zuerst den Start im Kalender.</p>
                <MonthCalendar
                  month={currentMonth}
                  selected={draft.start}
                  minDate={todayIso}
                  maxDate={maxIso}
                  todayIso={todayIso}
                  atStart={atStart}
                  atEnd={atEnd}
                  onPrev={goPrevMonth}
                  onNext={goNextMonth}
                  onSelect={handleStartSelect}
                />
              </div>
            )}

            {step === "end" && currentMonth && (
              <div className="stack sm">
                <p className="muted">
                  Ende muss am gleichen oder späteren Tag liegen.
                </p>
                <MonthCalendar
                  month={currentMonth}
                  selected={draft.end}
                  minDate={draft.start ?? todayIso}
                  maxDate={maxIso}
                  todayIso={todayIso}
                  atStart={atStart}
                  atEnd={atEnd}
                  onPrev={goPrevMonth}
                  onNext={goNextMonth}
                  onSelect={handleEndSelect}
                />
                <div className="button-row">
                  <button
                    type="button"
                    className="ghost small"
                    onClick={() => setStep("start")}
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={!draft.end || !draft.start}
                    onClick={() => setStep("review")}
                  >
                    Weiter
                  </button>
                </div>
              </div>
            )}

            {step === "review" && draft.start && draft.end && (
              <div className="stack sm">
                <div className="review-card">
                  <div className="review-row">
                    <span className={`range-chip ${draft.type}`}>
                      {RANGE_TAG[draft.type]}
                    </span>
                    <span className="muted">{durationLabel}</span>
                  </div>
                  <div className="review-dates">
                    {formatRange(draft.start, draft.end)}
                  </div>
                  <div className="muted small">
                    Gruppe: {selectedGroup?.name ?? "Keine Gruppe"}
                  </div>
                  <p className="muted small">Kurz prüfen und dann speichern.</p>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className="ghost small"
                    onClick={() => setStep("end")}
                  >
                    Zurück
                  </button>
                  <button
                    type="button"
                    className="primary"
                    disabled={!canSave}
                    onClick={handleSave}
                  >
                    {saving
                      ? "Speichere..."
                      : editingId
                      ? "Aktualisieren"
                      : "Speichern"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ranges-section">
        <div className="card-header subtle">
          <div>
            <p className="eyebrow">Gespeicherte Zeiträume</p>
            <h4>
              {rangesLoading
                ? "Lade..."
                : ranges.length
                ? `${ranges.length} Einträge`
                : "Noch nichts gespeichert"}
            </h4>
          </div>
        </div>

        {rangesError && <div className="pill danger">{rangesError}</div>}

        {!rangesLoading && !ranges.length && (
          <div className="empty-state">
            <p className="muted">
              Füge einen Zeitraum hinzu, um deine Teilnahme zu teilen.
            </p>
          </div>
        )}

        {ranges.length > 0 && (
          <ul className="range-list">
            {(listOpen ? ranges : ranges.slice(0, 2)).map((range) => (
              <li key={range.id} className="range-row">
                <div className="range-meta">
                  <span className={`range-chip ${range.type}`}>
                    {RANGE_TAG[range.type]}
                  </span>
                  <span className="range-dates">
                    {formatRange(range.start, range.end)}
                  </span>
                  <span className="range-duration">
                    {dayDiffInclusive(range.start, range.end)} Tage
                  </span>
                  <span className="muted small">Gruppe: {range.groupName}</span>
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className="ghost tiny danger"
                    onClick={() => handleDelete(range.id)}
                  >
                    Löschen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {ranges.length > 2 && (
          <button
            type="button"
            className="range-toggle"
            onClick={() => setListOpen((open) => !open)}
            aria-expanded={listOpen}
          >
            <span className="muted">
              {listOpen
                ? "Einklappen"
                : `Alle anzeigen (+${ranges.length - 2})`}
            </span>
            <span className={`chevron ${listOpen ? "open" : ""}`}>⌄</span>
          </button>
        )}
      </div>
    </section>
  );
}
