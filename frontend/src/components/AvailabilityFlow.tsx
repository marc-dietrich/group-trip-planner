import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useSelfAvailabilities } from "../hooks/useSelfAvailabilities";
import { useGroupStore } from "../state/groupStore";
import { GroupMembership, Identity } from "../types";
import {
  buttonGhostDanger,
  buttonGhostTiny,
  buttonPrimary,
  buttonRow,
  card,
  cardHeaderSubtle,
  eyebrow,
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
  rangeStart?: string | null;
  rangeEnd?: string | null;
  hoverDate?: string | null;
  onHoverDate?: (iso: string | null) => void;
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
  showGroupPickerOnOpen?: boolean;
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
      current.getMonth() + 1,
    ).padStart(2, "0")}`;
    const monthLabel = monthFormatter.format(current);

    if (!groups[monthKey]) {
      groups[monthKey] = { monthKey, monthLabel, days: [] };
    }

    groups[monthKey].days.push({
      iso,
      label: dayFormatter.format(current),
      weekday: new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(
        current,
      ),
      monthLabel,
      monthKey,
      day: current.getDate(),
    });
  }

  return Object.values(groups).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey),
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
  rangeStart,
  rangeEnd,
  hoverDate,
  onHoverDate,
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
      () => null as DayOption | null,
    ),
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-sage-100 bg-white/90 p-4 shadow-soft">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className={buttonGhostTiny}
          onClick={onPrev}
          disabled={atStart}
        >
          <span className="material-symbols-outlined text-[18px]">
            chevron_left
          </span>
        </button>
        <div className="text-sm font-semibold text-sage-900">
          {month.monthLabel}
        </div>
        <button
          type="button"
          className={buttonGhostTiny}
          onClick={onNext}
          disabled={atEnd}
        >
          <span className="material-symbols-outlined text-[18px]">
            chevron_right
          </span>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
        {"Mo Di Mi Do Fr Sa So".split(" ").map((day) => (
          <div key={day} className="py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell)
            return <div key={`empty-${idx}`} className="aspect-square" />;

          const isDisabled = Boolean(
            (minDate && cell.iso < minDate) || (maxDate && cell.iso > maxDate),
          );
          const isSelected = selected === cell.iso;
          const isToday = todayIso === cell.iso;
          const effectiveRangeEnd = hoverDate ?? rangeEnd;
          const rangeFrom =
            rangeStart && effectiveRangeEnd
              ? rangeStart <= effectiveRangeEnd
                ? rangeStart
                : effectiveRangeEnd
              : null;
          const rangeTo =
            rangeStart && effectiveRangeEnd
              ? rangeStart <= effectiveRangeEnd
                ? effectiveRangeEnd
                : rangeStart
              : null;
          const inRange =
            rangeFrom &&
            rangeTo &&
            cell.iso >= rangeFrom &&
            cell.iso <= rangeTo;

          const base =
            "relative flex aspect-square w-full items-center justify-center rounded-xl border text-sm font-semibold transition";
          const state = isSelected
            ? "border-brand-primary bg-brand-primary text-white shadow"
            : "border-sage-100 bg-sage-50 text-sage-900 hover:border-brand-primary/40";
          const today = isToday && !isSelected ? "border-brand-primary/40" : "";
          const disabled = isDisabled ? "cursor-not-allowed opacity-40" : "";
          const range =
            inRange && !isSelected
              ? "bg-brand-primary/25 text-brand-primary border-brand-primary/30"
              : "";

          return (
            <button
              key={cell.iso}
              type="button"
              className={`${base} ${state} ${today} ${disabled} ${range}`}
              disabled={isDisabled}
              onClick={() => onSelect(cell.iso)}
              onMouseEnter={() => {
                if (!isDisabled) onHoverDate?.(cell.iso);
              }}
              onMouseLeave={() => onHoverDate?.(null)}
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
  showGroupPickerOnOpen = false,
}: AvailabilityFlowProps) {
  const [draft, setDraft] = useState<DraftRange>(initialDraft);
  const [step, setStep] = useState<Step>("start");
  const [listOpen, setListOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [prefaceOpen, setPrefaceOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [monthIndex, setMonthIndex] = useState(0);
  const [hoveredEndDate, setHoveredEndDate] = useState<string | null>(null);

  const optimisticAdd = useGroupStore(
    (state) => state.optimisticAddAvailability,
  );
  const optimisticDelete = useGroupStore(
    (state) => state.optimisticDeleteAvailability,
  );

  const {
    data: ranges = [],
    loading: rangesLoading,
    error: rangesError,
    refetch: refetchSelf,
  } = useSelfAvailabilities(selectedGroupId, identity);

  const monthGroups = useMemo(() => buildMonthGroups(730), []);
  const todayIso = useMemo(() => toLocalISO(new Date()), []);
  const maxIso = useMemo(() => {
    const lastMonth = monthGroups[monthGroups.length - 1];
    const lastDay = lastMonth?.days[lastMonth.days.length - 1];
    return lastDay?.iso ?? todayIso;
  }, [monthGroups, todayIso]);

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
    if (!draft.start) return;
    const key = monthKeyFromIso(draft.start);
    const idx = monthGroups.findIndex((m) => m.monthKey === key);
    if (idx >= 0) setMonthIndex(idx);
  }, [draft.start, monthGroups]);

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
      Math.min(monthGroups.length - 1, Math.max(0, idx + 1)),
    );

  const stepMeta =
    step === "start"
      ? {
          badge: "1/3 Startdatum",
          title: "Startdatum auswählen",
          subtitle: "Tippe auf ein Startdatum im Kalender",
          cta: "Weiter",
        }
      : step === "end"
        ? {
            badge: "2/3 Enddatum",
            title: "Enddatum wählen",
            subtitle: "Wähle nun ein Enddatum",
            cta: "Weiter",
          }
        : {
            badge: "3/3 Prüfen & Bestätigen",
            title: "Zusammenfassung",
            subtitle: "Alles korrekt?",
            cta: saving ? "Speichere…" : "Bestätigen & Speichern",
          };

  const canSave = Boolean(draft.start && draft.end && draft.groupId && !saving);

  const orderedRanges = useMemo(
    () => [...ranges].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [ranges],
  );

  const selectedGroupName = useMemo(() => {
    if (!selectedGroupId) return "";
    return groups.find((g) => g.groupId === selectedGroupId)?.name ?? "";
  }, [groups, selectedGroupId]);

  const resetFlow = () => {
    const fallbackGroupId = fixedGroupId
      ? fixedGroupId
      : selectedGroupId && groups.some((g) => g.groupId === selectedGroupId)
        ? selectedGroupId
        : (groups[0]?.groupId ?? null);

    setDraft({ ...initialDraft, groupId: fallbackGroupId });
    setStep("start");
  };

  const openDialog = () => {
    if (showGroupPickerOnOpen && !fixedGroupId && groups.length > 1) {
      setPrefaceOpen(true);
      return;
    }
    setOpen(true);
  };

  const closeDialog = () => {
    resetFlow();
    setOpen(false);
    setPrefaceOpen(false);
    setHoveredEndDate(null);
  };

  const handlePrefaceSelect = (groupId: string) => {
    const target = groupId || groups[0]?.groupId || null;
    setSelectedGroupId(target);
    setDraft((prev) => ({ ...prev, groupId: target }));
    setPrefaceOpen(false);
    setOpen(true);
  };

  const handleStartSelect = (iso: string) => {
    setDraft((prev) => ({ ...prev, start: iso, end: iso }));
    setHoveredEndDate(null);
    setStep("end");
  };

  const handleEndSelect = (iso: string) => {
    setDraft((prev) => ({ ...prev, end: iso }));
    setHoveredEndDate(null);
    setStep("review");
  };

  const handleSave = async () => {
    if (!draft.start || !draft.end) return;
    if (!draft.groupId) {
      toast.error("Bitte wähle eine Gruppe");
      return;
    }

    setSaving(true);
    setMutationError(null);

    try {
      await optimisticAdd({
        groupId: draft.groupId,
        startDate: draft.start,
        endDate: draft.end,
        identity,
      });
      toast.success("Zeitraum gespeichert");
      if (onChange) onChange();
      setListOpen(false);
      resetFlow();
      setOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Speichern fehlgeschlagen";
      setMutationError(message);
      toast.error(message);
      void refetchSelf();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!selectedGroupId) return;
    setMutationError(null);

    void (async () => {
      try {
        await optimisticDelete({
          availabilityId: id,
          groupId: selectedGroupId,
          identity,
        });
        toast.success("Gelöscht");
        if (onChange) onChange();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Löschen fehlgeschlagen";
        setMutationError(message);
        toast.error(message);
        void refetchSelf();
      }
    })();
  };

  const triggerNode = renderTrigger ? (
    renderTrigger({ open: openDialog, disabled: false })
  ) : (
    <div className={buttonRow}>
      <button
        type="button"
        className={buttonPrimary}
        onClick={openDialog}
        disabled={false}
      >
        + Hinzufügen
      </button>
    </div>
  );

  return (
    <section
      className={`${
        embedded ? "flex flex-col gap-3" : `${card} flex flex-col gap-4`
      }`}
    >
      {embedded ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {triggerNode}
        </div>
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

      {(open || prefaceOpen) && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/35 backdrop-blur-sm px-4 py-8"
          role="dialog"
          aria-modal="true"
        >
          {prefaceOpen ? (
            <div className="relative w-full max-w-[360px]">
              <div className="relative w-full bg-white rounded-[24px] shadow-2xl border border-white/30 overflow-hidden flex flex-col">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <h2 className="text-[17px] font-semibold text-slate-900">
                    Gruppe wählen
                  </h2>
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors bg-slate-50 rounded-full"
                    onClick={closeDialog}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      close
                    </span>
                  </button>
                </div>
                <div className="px-3 pb-4 space-y-1">
                  {groups.map((group) => {
                    const isSelected = selectedGroupId === group.groupId;
                    const initials = group.name.slice(0, 2).toUpperCase();
                    return (
                      <button
                        key={group.groupId}
                        type="button"
                        onClick={() => handlePrefaceSelect(group.groupId)}
                        className={`flex w-full items-center justify-between rounded-2xl p-3 transition-colors border ${
                          isSelected
                            ? "bg-sage-50 border-brand-primary/30 shadow-sm"
                            : "hover:bg-slate-50 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-10 h-10 rounded-full bg-sage-100 flex items-center justify-center text-sage-800 font-semibold border border-white shadow-sm">
                            {initials}
                          </div>
                          <span className="text-[15px] font-semibold text-slate-900">
                            {group.name}
                          </span>
                        </div>
                        {isSelected ? (
                          <span className="material-symbols-outlined text-brand-primary text-[20px] font-bold">
                            check
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full max-w-[420px]">
              <div className="relative w-full bg-white rounded-[24px] shadow-2xl border border-white/30 overflow-hidden flex flex-col">
                <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                  <div className="bg-sage-50 text-brand-primary px-3 py-1 rounded-full border border-sage-100">
                    <span className="text-[12px] font-bold tracking-tight">
                      {stepMeta.badge}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="text-slate-400 font-medium text-sm px-2 py-1 hover:text-slate-600 transition-colors"
                    onClick={closeDialog}
                  >
                    Schließen
                  </button>
                </div>

                <div className="px-6 pb-6 pt-1 flex-1 flex flex-col gap-3">
                  <div className="space-y-1">
                    <h3 className="text-slate-900 text-xl font-bold leading-tight">
                      {stepMeta.title}
                    </h3>
                    <p className="text-slate-500 text-sm">
                      {stepMeta.subtitle}
                    </p>
                  </div>

                  {step === "start" && currentMonth && (
                    <MonthCalendar
                      month={currentMonth}
                      selected={draft.start}
                      minDate={todayIso}
                      maxDate={maxIso}
                      todayIso={todayIso}
                      atStart={atStart}
                      atEnd={atEnd}
                      rangeStart={draft.start}
                      rangeEnd={draft.start}
                      onPrev={goPrevMonth}
                      onNext={goNextMonth}
                      onSelect={handleStartSelect}
                    />
                  )}

                  {step === "end" && currentMonth && (
                    <MonthCalendar
                      month={currentMonth}
                      selected={draft.end}
                      minDate={draft.start ?? todayIso}
                      maxDate={maxIso}
                      todayIso={todayIso}
                      atStart={atStart}
                      atEnd={atEnd}
                      rangeStart={draft.start}
                      rangeEnd={draft.end}
                      hoverDate={hoveredEndDate}
                      onHoverDate={setHoveredEndDate}
                      onPrev={goPrevMonth}
                      onNext={goNextMonth}
                      onSelect={handleEndSelect}
                    />
                  )}

                  {step === "review" && draft.start && draft.end && (
                    <div className="flex flex-col gap-3">
                      <div className="bg-sage-50 border border-sage-100 rounded-[20px] p-5 space-y-4">
                        <div className="space-y-3 pl-1">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                              Von
                            </span>
                            <span className="text-slate-900 font-semibold text-xl">
                              {fullFormatter.format(new Date(draft.start))}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">
                              Bis
                            </span>
                            <span className="text-slate-900 font-semibold text-xl">
                              {fullFormatter.format(new Date(draft.end))}
                            </span>
                          </div>
                        </div>
                        <div className="pt-3">
                          <div className="inline-flex px-3 py-1 bg-sage-200 rounded-full">
                            <span className="text-[10px] font-bold text-slate-700 tracking-wider uppercase">
                              {dayDiffInclusive(draft.start, draft.end)} Tage
                              eingeplant
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-6 py-5 bg-white flex flex-col gap-3">
                  {step === "review" ? (
                    <button
                      className="w-full bg-brand-primary py-4 px-6 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-brand-primary/20 transition-all active:scale-[0.98]"
                      type="button"
                      onClick={handleSave}
                      disabled={!canSave}
                    >
                      <span>{stepMeta.cta}</span>
                      <span className="material-symbols-outlined">
                        arrow_forward
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
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
                  ? "Lade…"
                  : orderedRanges.length
                    ? `${orderedRanges.length} Einträge`
                    : "Noch nichts gespeichert"}
              </h4>
            </div>
          </div>

          {(rangesError || mutationError) && (
            <div className={pillDanger}>{rangesError || mutationError}</div>
          )}

          {!rangesLoading && !orderedRanges.length && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm sm:text-base">
              <p className={muted}>
                Füge einen Zeitraum hinzu, um deine Teilnahme zu teilen.
              </p>
            </div>
          )}

          {orderedRanges.length > 0 && (
            <ul className="flex flex-col gap-2">
              {(listOpen ? orderedRanges : orderedRanges.slice(0, 2)).map(
                (range) => (
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
                          {formatRange(range.startDate, range.endDate)}
                        </span>
                        <span className={muted}>
                          {dayDiffInclusive(range.startDate, range.endDate)}{" "}
                          Tage
                        </span>
                        {showGroupName && (
                          <span className={smallMuted}>
                            Gruppe: {selectedGroupName}
                          </span>
                        )}
                      </div>
                      <div
                        className={`${buttonRow} justify-start sm:justify-end`}
                      >
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
                ),
              )}
            </ul>
          )}

          {orderedRanges.length > 2 && (
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-900 hover:bg-slate-50 sm:text-base"
              onClick={() => setListOpen((openState) => !openState)}
              aria-expanded={listOpen}
            >
              <span className={muted}>
                {listOpen
                  ? "Einklappen"
                  : `Alle anzeigen (+${orderedRanges.length - 2})`}
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
