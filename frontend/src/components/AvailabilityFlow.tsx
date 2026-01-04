import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { GroupMembership, Identity } from "../types";
import { apiPath } from "../lib/api";
import {
  buttonGhostDanger,
  buttonGhostSmall,
  buttonGhostTiny,
  buttonPrimary,
  buttonRow,
  card,
  cardHeaderSubtle,
  eyebrow,
  modalCard,
  modalOverlay,
  muted,
  pillDanger,
  pillWarning,
  smallMuted,
} from "../ui";

type Step = "start" | "end" | "review";

type DraftRange = {
  start: string | null;
  end: string | null;
  groupId: string | null;
};

type AvailabilityRange = {
  id: string;
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

type AvailabilityFlowProps = {
  groups: GroupMembership[];
  identity: Identity;
  fixedGroupId?: string | null;
  hideSavedList?: boolean;
  embedded?: boolean;
  renderTrigger?: (args: { open: () => void; disabled: boolean }) => ReactNode;
  onChange?: () => void;
};

const AVAILABLE_TAG = "Verfügbar";

const availableChipClass =
  "border-green-200 bg-green-50 text-green-700 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold";

const initialDraft: DraftRange = {
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
  start.setDate(1);

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
  const weekdayOffset = (monthDate.getDay() + 6) % 7;

  const baseCells: Array<DayOption | null> = [
    ...Array.from({ length: weekdayOffset }, () => null as DayOption | null),
    ...month.days,
  ];

  const rows = 6;
  const totalCells = rows * 7;
  const cells: Array<DayOption | null> = baseCells.concat(
    Array.from(
      { length: totalCells - baseCells.length },
      () => null as DayOption | null
    )
  );

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className={buttonGhostTiny}
          onClick={onPrev}
          disabled={atStart}
        >
          ←
        </button>
        <div className="text-sm font-semibold text-slate-900">
          {month.monthLabel}
        </div>
        <button
          type="button"
          className={buttonGhostTiny}
          onClick={onNext}
          disabled={atEnd}
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-600">
        {"Mo Di Mi Do Fr Sa So".split(" ").map((day) => (
          <div key={day} className="rounded-md bg-slate-50 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell)
            return <div key={`empty-${idx}`} className="aspect-square" />;

          const isDisabled = Boolean(
            (minDate && cell.iso < minDate) || (maxDate && cell.iso > maxDate)
          );
          const isSelected = selected === cell.iso;
          const isToday = todayIso === cell.iso;

          const base =
            "flex aspect-square w-full items-center justify-center rounded-lg border text-sm font-semibold transition";
          const state = isSelected
            ? "border-sky-500 bg-sky-500 text-white shadow"
            : "border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-400";
          const today = isToday && !isSelected ? "border-sky-300" : "";
          const disabled = isDisabled ? "cursor-not-allowed opacity-40" : "";

          return (
            <button
              key={cell.iso}
              type="button"
              className={`${base} ${state} ${today} ${disabled}`}
              disabled={isDisabled}
              onClick={() => onSelect(cell.iso)}
              aria-pressed={isSelected}
            >
              <span className="text-base">{cell.day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AvailabilityFlow({
  groups,
  identity,
  fixedGroupId = null,
  hideSavedList = false,
  embedded = false,
  renderTrigger,
  onChange,
}: AvailabilityFlowProps) {
  const [draft, setDraft] = useState<DraftRange>(initialDraft);
  const [step, setStep] = useState<Step>("start");
  const [ranges, setRanges] = useState<AvailabilityRange[]>([]);
  const [rangesLoading, setRangesLoading] = useState(false);
  const [rangesError, setRangesError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (fixedGroupId) {
      setSelectedGroupId(fixedGroupId);
      setDraft((prev) => ({ ...prev, groupId: fixedGroupId }));
      return;
    }

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
  }, [groups, fixedGroupId]);

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
          apiPath(`/api/groups/${selectedGroupId}/availabilities`),
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
        }>;
        const mapped: AvailabilityRange[] = data
          .map((item) => ({
            id: item.id,
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

  const showGroupName = !fixedGroupId && groups.length > 1;

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

  const stepNumber = step === "start" ? 1 : step === "end" ? 2 : 3;

  const canSave = Boolean(
    draft.start &&
      draft.end &&
      draft.groupId &&
      identity.kind === "user" &&
      !saving
  );

  const handleStartSelect = (iso: string) => {
    setDraft((prev) => ({ ...prev, start: iso, end: iso }));
    setStep("end");
  };

  const handleEndSelect = (iso: string) => {
    setDraft((prev) => ({ ...prev, end: iso }));
    setStep("review");
  };

  const resetFlow = () => {
    const fallbackGroupId = fixedGroupId
      ? fixedGroupId
      : selectedGroupId && groups.some((g) => g.groupId === selectedGroupId)
      ? selectedGroupId
      : groups[0]?.groupId ?? null;

    setDraft({ ...initialDraft, groupId: fallbackGroupId });
    setStep("start");
  };

  const openDialog = () => {
    if (identity.kind !== "user") {
      toast.error("Bitte zuerst anmelden, um Verfügbarkeiten zu erfassen.");
      return;
    }
    setOpen(true);
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

    const group =
      groups.find((g) => g.groupId === draft.groupId) ??
      (draft.groupId
        ? { groupId: draft.groupId, name: "Ausgewählte Gruppe" }
        : null);

    if (!group) {
      toast.error("Ausgewählte Gruppe nicht mehr vorhanden");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        apiPath(`/api/groups/${group.groupId}/availabilities`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${identity.accessToken ?? ""}`,
          },
          body: JSON.stringify({
            startDate: draft.start,
            endDate: draft.end,
          }),
        }
      );

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Fehler: ${res.status}`);
      }

      const data = (await res.json()) as {
        id: string;
        startDate: string;
        endDate: string;
      };

      const payload: AvailabilityRange = {
        id: data.id,
        start: data.startDate,
        end: data.endDate,
        groupId: group.groupId,
        groupName: group.name,
      };

      setRanges((prev) =>
        [...prev, payload].sort((a, b) => a.start.localeCompare(b.start))
      );

      toast.success("Zeitraum gespeichert");
      if (onChange) onChange();
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
        const res = await fetch(apiPath(`/api/availabilities/${id}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${identity.accessToken ?? ""}` },
        });
        if (!res.ok) throw new Error(`Fehler: ${res.status}`);
        setRanges((prev) => prev.filter((item) => item.id !== id));
        toast.success("Gelöscht");
        if (onChange) onChange();
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

  const triggerNode = renderTrigger ? (
    renderTrigger({ open: openDialog, disabled: identity.kind !== "user" })
  ) : (
    <div className={buttonRow}>
      <button
        type="button"
        className={buttonPrimary}
        onClick={openDialog}
        disabled={identity.kind !== "user"}
      >
        + Hinzufügen
      </button>
    </div>
  );

  return (
    <section className={`${embedded ? "flex flex-col gap-3" : `${card} flex flex-col gap-4`}`}>
      {embedded ? (
        <div className="flex flex-wrap items-center justify-end gap-2">{triggerNode}</div>
      ) : (
        <div
          className={`${cardHeaderSubtle} flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between`}
        >
          <div>
            <p className={eyebrow}>Verfügbarkeiten</p>
            <h3 className="text-xl font-semibold text-slate-900">
              Wann passt es dir?
            </h3>
            <p className={`${muted} hidden sm:block`}>
              Kurze Zeiträume hinzufügen, die für dich funktionieren.
            </p>
          </div>
          <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto sm:flex-nowrap">
            {triggerNode}
          </div>
        </div>
      )}

      {!embedded && identity.kind !== "user" && (
        <div className={`${pillWarning} mt-1`}>
          Bitte melde dich an, bevor du Verfügbarkeiten hinzufügst.
        </div>
      )}

      {open && (
        <div className={modalOverlay} role="dialog" aria-modal="true">
          <div className={modalCard}>
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-800">
                {stepNumber}/3{" "}
                {step === "start"
                  ? "Startdatum"
                  : step === "end"
                  ? "Enddatum"
                  : "Prüfen"}
              </span>
              <button
                type="button"
                className={buttonGhostSmall}
                onClick={closeDialog}
              >
                Schließen
              </button>
            </div>

            <hr className="my-3 border-slate-200" />

            <div className="flex-1 overflow-hidden pt-1">
              {step === "start" && currentMonth && (
                <div className="flex h-full flex-col gap-3">
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
                  <div className="min-h-[44px]" aria-hidden="true" />
                </div>
              )}

              {step === "end" && currentMonth && (
                <div className="flex flex-col gap-3">
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
                  <div className="min-h-[44px]" aria-hidden="true" />
                </div>
              )}

              {step === "review" && draft.start && draft.end && (
                <div className="flex flex-col gap-3">
                  <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-3 shadow-inner">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-slate-900 text-white grid place-items-center text-sm font-bold">
                        ✓
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-slate-900">
                          Zusammenfassung
                        </div>
                        <div className="flex flex-col gap-2 text-left">
                          <hr className="border-slate-200" />
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Von
                            </span>
                            <span className="text-base font-bold text-slate-900 leading-tight">
                              {fullFormatter.format(new Date(draft.start))}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                              Bis
                            </span>
                            <span className="text-base font-bold text-slate-900 leading-tight">
                              {fullFormatter.format(new Date(draft.end))}
                            </span>
                          </div>
                          <hr className="border-slate-200" />
                        </div>
                        <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                          {dayDiffInclusive(draft.start, draft.end)} Tage
                          eingeplant
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`${buttonRow} shrink-0 justify-end min-h-[44px]`}
                  >
                    <button
                      type="button"
                      className={buttonPrimary}
                      disabled={!canSave}
                      onClick={handleSave}
                    >
                      {saving ? "Speichere..." : "Bestätigen"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!hideSavedList && (
        <div className="space-y-3">
          <div
            className={`${cardHeaderSubtle} flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between`}
          >
            <div>
              <p className={eyebrow}>Gespeicherte Zeiträume</p>
              <h4 className="text-base font-semibold text-slate-900 sm:text-lg">
                {rangesLoading
                  ? "Lade..."
                  : ranges.length
                  ? `${ranges.length} Einträge`
                  : "Noch nichts gespeichert"}
              </h4>
            </div>
          </div>

          {rangesError && <div className={pillDanger}>{rangesError}</div>}

          {!rangesLoading && !ranges.length && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:text-base">
              <p className={muted}>
                Füge einen Zeitraum hinzu, um deine Teilnahme zu teilen.
              </p>
            </div>
          )}

          {ranges.length > 0 && (
            <ul className="flex flex-col gap-2">
              {(listOpen ? ranges : ranges.slice(0, 2)).map((range) => (
                <li
                  key={range.id}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 sm:p-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                      <span className={availableChipClass}>
                        {AVAILABLE_TAG}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {formatRange(range.start, range.end)}
                      </span>
                      <span className={muted}>
                        {dayDiffInclusive(range.start, range.end)} Tage
                      </span>
                      {showGroupName && (
                        <span className={smallMuted}>Gruppe: {range.groupName}</span>
                      )}
                    </div>
                    <div className={`${buttonRow} justify-start sm:justify-end`}>
                      <button
                        type="button"
                        className={`${buttonGhostTiny} ${buttonGhostDanger}`}
                        onClick={() => handleDelete(range.id)}
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {ranges.length > 2 && (
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50 sm:text-base"
              onClick={() => setListOpen((open) => !open)}
              aria-expanded={listOpen}
            >
              <span className={muted}>
                {listOpen
                  ? "Einklappen"
                  : `Alle anzeigen (+${ranges.length - 2})`}
              </span>
              <span
                className={`text-lg transition ${listOpen ? "rotate-180" : ""}`}
              >
                ⌄
              </span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}
