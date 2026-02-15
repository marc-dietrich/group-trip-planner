import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { GroupMembership, Identity } from "../types";
import { buildIdentityHeaders } from "../lib/identity";
import { apiPath } from "../lib/api";
import { AvailabilityFlow } from "../components/AvailabilityFlow";
import { muted } from "../ui";
import { useGroupAvailability } from "../hooks/useGroupAvailability";
import { useGroupMemberAvailabilities } from "../hooks/useGroupMemberAvailabilities";
import { useGroupStats } from "../hooks/useGroupStats";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
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
  const [selfListOpen, setSelfListOpen] = useState(false);
  const [groupListOpen, setGroupListOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement | null>(null);

  const { data: summary, refetch: refetchSummary } = useGroupAvailability(
    groupId ?? null,
    identity,
  );

  const { data: memberAvailabilities, refetch: refetchMembers } =
    useGroupMemberAvailabilities(groupId ?? null, identity);

  const { data: stats, refetch: refetchStats } = useGroupStats(
    groupId ?? null,
    identity,
  );

  useEffect(() => {
    const fallback = groups.find((g) => g.groupId === groupId);
    if (fallback?.name) {
      setGroupName(fallback.name);
    }

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

  const singleGroupList = useMemo(() => {
    if (!groupId) return [] as GroupMembership[];
    const match = groups.find((g) => g.groupId === groupId);
    if (match) return [match];

    return [
      {
        groupId,
        name: groupName || "Gruppe",
        role: "member",
        inviteLink: "",
      },
    ];
  }, [groupId, groups, groupName]);

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
    [bestSummaryIndex, summary],
  );

  const heroImage =
    "https://lh3.googleusercontent.com/aida-public/AB6AXuD3i28Elw_Feunq2K3GfAGi-SNBmuJFRw46SjkuVJxn1SV_e3ecsDrL6YnmIyQSWf2cfzld5CMTox5AfIpWuR8hGDT9qQrICDXbRE1Ir2yWi66Armm-FolWtypSAiZOj5wyfOjUxf3IEeraftLM3paFFSFyTTPRcVORQJQa4zK_LKbLbwhLhqRAPW3PYy9Hgr1gTXdlAmR7j-9ulu_PlKypxJshdKhhDyplp6ZEJIwty-RC_AqZNlufncHY5p_uBrpdL9xaDhBivH4";

  const memberCount = stats.totalUsers || memberAvailabilities.length || 0;
  const compactMembers = memberAvailabilities.slice(0, 4);
  const remainingMembers = Math.max(0, memberCount - compactMembers.length);
  const currentGroup = useMemo(() => {
    if (!groupId) return null;
    return (
      groups.find((g) => g.groupId === groupId) || {
        groupId,
        name: groupName || "Gruppe",
        role: "member",
        inviteLink: "",
      }
    );
  }, [groupId, groupName, groups]);
  const inviteLink = useMemo(() => {
    if (!currentGroup) return null;
    if (currentGroup.inviteLink) return currentGroup.inviteLink;
    if (typeof window === "undefined") return null;
    const base = import.meta.env.BASE_URL || "/";
    const normalizedBase = base === "/" ? "" : base.replace(/\/$/, "");
    return `${window.location.origin}${normalizedBase}/invite/${currentGroup.groupId}`;
  }, [currentGroup]);

  const selfEntries = useMemo(
    () =>
      memberAvailabilities.find((member) => member.actorId === identity.actorId)
        ?.availabilities ?? [],
    [identity.actorId, memberAvailabilities],
  );

  const sortedSelfEntries = useMemo(
    () =>
      [...selfEntries].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [selfEntries],
  );
  const otherSelfEntries = useMemo(
    () => sortedSelfEntries.slice(1),
    [sortedSelfEntries],
  );
  const extraSelfCount = otherSelfEntries.length;
  const hasExtraSelfEntries = extraSelfCount > 0;
  const extraGroupCount = otherIntervals.length;
  const hasExtraGroupIntervals = extraGroupCount > 0;

  const showComingSoon = () => {
    toast("Coming soon");
  };

  const selfHighlight = sortedSelfEntries[0];

  const highlightInterval = bestInterval || summary[0] || null;
  const highlightFill = highlightInterval
    ? Math.round(
        (highlightInterval.availableCount /
          Math.max(1, highlightInterval.totalMembers)) *
          100,
      )
    : 0;
  const isReadyToBook = Boolean(
    highlightInterval &&
    highlightInterval.totalMembers > 0 &&
    highlightInterval.availableCount >= highlightInterval.totalMembers,
  );

  const handleShareInvite = async () => {
    if (!inviteLink) {
      toast.error("Kein Einladungslink verfügbar");
      return;
    }
    try {
      if (!navigator?.clipboard)
        throw new Error("Clipboard API nicht verfügbar");
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Einladungslink kopiert");
    } catch (err) {
      toast.error("Konnte Link nicht kopieren");
    }
  };

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

  useEffect(() => {
    setSelfListOpen(false);
  }, [sortedSelfEntries.length]);

  useEffect(() => {
    setGroupListOpen(false);
  }, [extraGroupCount]);

  useLayoutEffect(() => {
    const node = titleRef.current;
    if (!node) return;
    const BASE_SIZE = 24;
    const MIN_SIZE = 16;

    let frame = 0;

    const applySize = (size: number) => {
      node.style.setProperty("--group-title-size", `${size}px`);
    };

    const measure = () => {
      const el = titleRef.current;
      if (!el) return;
      applySize(BASE_SIZE);
      const available = el.offsetWidth;
      const scroll = el.scrollWidth;
      if (!available || !scroll) {
        applySize(BASE_SIZE);
        return;
      }
      let next = BASE_SIZE;
      if (scroll > available) {
        const ratio = available / scroll;
        next = Math.max(MIN_SIZE, Math.floor(BASE_SIZE * ratio));
      }
      applySize(next);
    };

    measure();

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });

    observer.observe(node);
    if (node.parentElement) observer.observe(node.parentElement);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [groupName]);
  return (
    <div className="relative pb-28 space-y-6">
      <div className="relative h-[32vh] w-full overflow-hidden rounded-3xl shadow-soft">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.5)), url(${heroImage})`,
          }}
        ></div>
        <div className="absolute top-6 left-6 right-4 flex justify-between items-start">
          <div className="flex items-center gap-3 text-white drop-shadow-md">
            <button
              type="button"
              aria-label="Zurück"
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 hover:bg-white/30 transition"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1
              ref={titleRef}
              className="text-2xl font-bold tracking-tight max-w-[60%] leading-tight whitespace-nowrap"
              style={{
                fontSize: "var(--group-title-size, 24px)",
                overflow: "visible",
              }}
            >
              {groupName}
            </h1>
          </div>
          <button
            type="button"
            aria-label="Einladungslink teilen"
            onClick={handleShareInvite}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white hover:bg-white/30 transition"
          >
            <span className="material-symbols-outlined">share</span>
          </button>
        </div>
        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl border border-white/40 shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-brand-primary text-[18px]">
              group
            </span>
            <span className="text-xs font-bold text-slate-800">
              {memberCount} Personen
            </span>
          </div>
          <button
            className="pointer-events-auto px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 bg-slate-100/90 border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            type="button"
            aria-label="Deadline setzen (Platzhalter)"
            onClick={showComingSoon}
          >
            <span className="material-symbols-outlined text-slate-500 text-[18px]">
              event_busy
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-xs font-semibold text-slate-800">
                Deadline setzen
              </span>
              <span className="text-[11px] text-slate-500">Coming soon</span>
            </span>
          </button>
        </div>
      </div>

      <div className="px-1 space-y-6">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">
            Mitglieder
          </h3>
          <div className="flex overflow-x-auto no-scrollbar gap-5 items-start px-1">
            {compactMembers.map((member) => (
              <div
                key={member.memberId}
                className="flex flex-col items-center gap-2 min-w-[64px]"
              >
                <div className="w-14 h-14 rounded-full border-[2px] border-brand-primary p-0.5 shadow-sm bg-white">
                  <div className="w-full h-full rounded-full bg-sage-100 grid place-items-center text-xs font-bold text-sage-700">
                    {formatMemberName(member.displayName).slice(0, 2)}
                  </div>
                </div>
                <p className="text-[11px] font-bold text-slate-900">
                  {formatMemberName(member.displayName)}
                </p>
              </div>
            ))}
            {remainingMembers > 0 && (
              <div className="flex flex-col items-center gap-2 min-w-[64px]">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                  <span className="text-xs font-bold text-slate-500">
                    +{remainingMembers}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500">Andere</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-soft">
            <div className="flex items-center gap-5 mb-6">
              <div className="w-16 h-16 rounded-2xl bg-sage-50 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-brand-primary text-[32px]">
                  landscape
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  Nächste Reise
                </h2>
                <p className="text-slate-500 text-sm font-medium mt-0.5">
                  {highlightInterval
                    ? `${dateFormatter.format(
                        new Date(highlightInterval.from),
                      )} – ${dateFormatter.format(
                        new Date(highlightInterval.to),
                      )}`
                    : "Noch kein Zeitraum"}
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block">
                    Status
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {isReadyToBook ? "Bereit zur Buchung ✓" : "Noch in Planung"}
                  </span>
                </div>
                {highlightInterval && (
                  <div className="text-right">
                    <span className="text-brand-primary font-bold text-sm">
                      {highlightInterval.availableCount}/
                      {highlightInterval.totalMembers} Personen
                    </span>
                  </div>
                )}
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${highlightFill}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sage-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-brand-primary text-[22px]">
                    person
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Meine Verfügbarkeit
                  {hasExtraSelfEntries ? (
                    <span className="ml-1 text-xs font-semibold text-slate-500">
                      (+ {extraSelfCount})
                    </span>
                  ) : null}
                </h2>
              </div>
              {hasExtraSelfEntries ? (
                <button
                  type="button"
                  className="p-1 text-slate-400 transition hover:text-slate-600"
                  onClick={() => setSelfListOpen((prev) => !prev)}
                  aria-expanded={selfListOpen}
                >
                  <span
                    className={`material-symbols-outlined text-[22px] transition-transform ${
                      selfListOpen ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
              ) : null}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest">
                    Bester Zeitraum
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {selfHighlight
                      ? `${dateFormatter.format(
                          new Date(selfHighlight.startDate),
                        )} — ${dateFormatter.format(
                          new Date(selfHighlight.endDate),
                        )}`
                      : "Noch nichts hinterlegt"}
                  </p>
                </div>
                <span className="material-symbols-outlined text-brand-primary">
                  check_circle
                </span>
              </div>
            </div>
            {hasExtraSelfEntries && selfListOpen && (
              <ul className="mt-3 space-y-2">
                {otherSelfEntries.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    {`${dateFormatter.format(
                      new Date(entry.startDate),
                    )} — ${dateFormatter.format(new Date(entry.endDate))}`}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-sage-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-brand-primary text-[22px]">
                    groups
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Beste Gruppen-Zeiträume
                  {hasExtraGroupIntervals ? (
                    <span className="ml-1 text-xs font-semibold text-slate-500">
                      (+ {extraGroupCount})
                    </span>
                  ) : null}
                </h2>
              </div>
              {hasExtraGroupIntervals ? (
                <button
                  type="button"
                  className="p-1 text-slate-400 transition hover:text-slate-600"
                  onClick={() => setGroupListOpen((prev) => !prev)}
                  aria-expanded={groupListOpen}
                >
                  <span
                    className={`material-symbols-outlined text-[22px] transition-transform ${
                      groupListOpen ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
              ) : null}
            </div>
            <div className="space-y-3">
              {highlightInterval ? (
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-bold text-slate-900">
                        {dateFormatter.format(new Date(highlightInterval.from))}{" "}
                        - {dateFormatter.format(new Date(highlightInterval.to))}
                      </p>
                      <span className="bg-brand-primary/10 text-brand-primary text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        TOP MATCH
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {highlightInterval.availableCount} von{" "}
                      {highlightInterval.totalMembers} Personen verfügbar
                    </p>
                  </div>
                </div>
              ) : (
                <p className={muted}>Noch keine Überschneidungen vorhanden.</p>
              )}
              {hasExtraGroupIntervals && groupListOpen && (
                <ul className="space-y-3">
                  {otherIntervals.map((item, idx) => (
                    <li key={`${item.from}-${item.to}-${idx}`}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-sm font-bold text-slate-900">
                              {dateFormatter.format(new Date(item.from))} -{" "}
                              {dateFormatter.format(new Date(item.to))}
                            </p>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {item.availableCount} von {item.totalMembers}{" "}
                            Personen verfügbar
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-0 right-0 max-w-[520px] mx-auto p-4 flex items-center justify-end gap-3 pointer-events-none">
        <button
          type="button"
          className="pointer-events-auto w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-95 transition-transform active:scale-90 bg-slate-100 border border-slate-200 text-brand-primary"
          onClick={showComingSoon}
          aria-label="Kalender Import (Platzhalter)"
        >
          <span className="material-symbols-outlined text-brand-primary text-2xl">
            calendar_add_on
          </span>
        </button>
        <div className="pointer-events-auto">
          <AvailabilityFlow
            groups={singleGroupList}
            identity={identity}
            fixedGroupId={groupId ?? null}
            hideSavedList
            embedded
            renderTrigger={({ open }) => (
              <button
                type="button"
                className="pointer-events-auto h-14 px-6 bg-brand-primary text-white rounded-full shadow-2xl flex items-center gap-2 hover:scale-95 transition-transform active:scale-90 border border-white/10"
                onClick={open}
              >
                <span className="material-symbols-outlined font-bold text-xl">
                  add
                </span>
                <span className="text-[13px] font-bold tracking-tight">
                  Neue Verfügbarkeit
                </span>
              </button>
            )}
            onChange={() => {
              void refetchSummary();
              void refetchMembers();
              void refetchStats();
            }}
          />
        </div>
      </div>
    </div>
  );
}
