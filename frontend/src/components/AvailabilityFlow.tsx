import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
};

type AvailabilityRange = {
  id: string;
  type: RangeType;
  start: string;
  end: string;
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

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function buildMonthGroups(daysAhead = 150): MonthGroup[] {
  const start = new Date();
  start.setHours(12, 0, 0, 0);

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

  return Object.values(groups).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
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

  const cells: Array<DayOption | null> = Array.from({ length: weekdayOffset }, () => null).concat(
    month.days
  );

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button type="button" className="ghost tiny" onClick={onPrev} disabled={atStart}>
          ←
        </button>
        <div className="calendar-title">{month.monthLabel}</div>
        <button type="button" className="ghost tiny" onClick={onNext} disabled={atEnd}>
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
          if (!cell) return <div key={`empty-${idx}`} className="calendar-cell empty" />;

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

export function AvailabilityFlow() {
  const [draft, setDraft] = useState<DraftRange>(initialDraft);
  const [step, setStep] = useState<Step>("type");
  const [ranges, setRanges] = useState<AvailabilityRange[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [open, setOpen] = useState(false);

  const monthGroups = useMemo(() => buildMonthGroups(180), []);
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
    setMonthIndex((idx) => Math.min(monthGroups.length - 1, Math.max(0, idx + 1)));

  const stepNumber = step === "type" ? 1 : step === "start" ? 2 : step === "end" ? 3 : 4;
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
    setDraft(initialDraft);
    setStep("type");
    setEditingId(null);
  };

  const handleSave = () => {
    if (!draft.start || !draft.end) return;

    const payload: AvailabilityRange = {
      id: editingId ?? randomId(),
      type: draft.type,
      start: draft.start,
      end: draft.end,
    };

    setRanges((prev) => {
      if (editingId) {
        return prev.map((item) => (item.id === editingId ? payload : item));
      }
      return [...prev, payload].sort((a, b) => a.start.localeCompare(b.start));
    });

    toast.success(editingId ? "Zeitraum aktualisiert" : "Zeitraum gespeichert");
    resetFlow();
    setOpen(false);
  };

  const handleEdit = (range: AvailabilityRange) => {
    setDraft({ type: range.type, start: range.start, end: range.end });
    setEditingId(range.id);
    setListOpen(true);
    setStep("review");
  };

  const handleDelete = (id: string) => {
    setRanges((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      resetFlow();
    }
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
          <button type="button" className="primary" onClick={() => setOpen(true)}>
            + Hinzufügen
          </button>
        </div>
      </div>
      {open && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal">
            <div className="card-header subtle">
              <div>
                <p className="eyebrow">Neuer Zeitraum</p>
                <h3>Wann passt es dir?</h3>
              </div>
              <div className="button-row">
                <button type="button" className="ghost small" onClick={closeDialog}>
                  Schließen
                </button>
              </div>
            </div>

            <p className="muted">
              Schritt-für-Schritt mit Kalender: Verfügbar/Nicht verfügbar wählen, Start und Ende
              setzen, prüfen und speichern.
            </p>

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
                  <div className="type-choice-title">Ich bin nicht verfügbar</div>
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
                          type: prev.type === "available" ? "unavailable" : "available",
                        }))
                      }
                    >
                      Typ wechseln
                    </button>
                    <button type="button" className="ghost tiny" onClick={resetFlow}>
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
                <p className="muted">Ende muss am gleichen oder späteren Tag liegen.</p>
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
                  <button type="button" className="ghost small" onClick={() => setStep("start")}>
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
                    <span className={`range-chip ${draft.type}`}>{RANGE_TAG[draft.type]}</span>
                    <span className="muted">{durationLabel}</span>
                  </div>
                  <div className="review-dates">{formatRange(draft.start, draft.end)}</div>
                  <p className="muted small">Kurz prüfen und dann speichern.</p>
                </div>
                <div className="button-row">
                  <button type="button" className="ghost small" onClick={() => setStep("end")}>
                    Zurück
                  </button>
                  <button type="button" className="primary" onClick={handleSave}>
                    {editingId ? "Aktualisieren" : "Speichern"}
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
            <h4>{ranges.length ? `${ranges.length} Einträge` : "Noch nichts gespeichert"}</h4>
          </div>
        </div>

        {!ranges.length && (
          <div className="empty-state">
            <p className="muted">Füge einen Zeitraum hinzu, um deine Teilnahme zu teilen.</p>
          </div>
        )}

        {ranges.length > 0 && (
          <ul className="range-list">
            {(listOpen ? ranges : ranges.slice(0, 2)).map((range) => (
              <li key={range.id} className="range-row">
                <div className="range-meta">
                  <span className={`range-chip ${range.type}`}>{RANGE_TAG[range.type]}</span>
                  <span className="range-dates">{formatRange(range.start, range.end)}</span>
                  <span className="range-duration">
                    {dayDiffInclusive(range.start, range.end)} Tage
                  </span>
                </div>
                <div className="button-row">
                  <button type="button" className="ghost tiny" onClick={() => handleEdit(range)}>
                    Bearbeiten
                  </button>
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
