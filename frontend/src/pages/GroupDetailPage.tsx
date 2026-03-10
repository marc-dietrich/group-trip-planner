import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { GroupMembership, Identity } from "../types";
import { buildIdentityHeaders } from "../lib/identity";
import { apiPath } from "../lib/api";
import { AvailabilityFlow } from "../components/AvailabilityFlow";
import {
  ImagePickSource,
  ImageSourceDialog,
} from "../components/ImageSourceDialog";
import { muted } from "../ui";
import { useGroupAvailability } from "../hooks/useGroupAvailability";
import { useGroupMemberAvailabilities } from "../hooks/useGroupMemberAvailabilities";
import { useGroupStats } from "../hooks/useGroupStats";
import { useGroupStore } from "../state/groupStore";
import {
  deleteGroupImage,
  groupImageUrl,
  uploadGroupImage,
} from "../services/imageService";
import genericSurface from "../../assets/generic.webp";
import bannerSurface from "../../assets/banner.svg";

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
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [groupImageDialogOpen, setGroupImageDialogOpen] = useState(false);
  const [groupImageUploading, setGroupImageUploading] = useState(false);
  const [groupImageVersion, setGroupImageVersion] = useState<number>(
    Date.now(),
  );
  const [groupImageFallback, setGroupImageFallback] = useState(false);
  const [memberListFade, setMemberListFade] = useState({
    left: false,
    right: false,
  });
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const memberListRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const groupImageInputRef = useRef<HTMLInputElement | null>(null);
  const removeGroup = useGroupStore((state) => state.removeGroup);

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

  const sortedIntervals = useMemo(
    () =>
      [...summary].sort((a, b) => {
        if (b.availableCount !== a.availableCount) {
          return b.availableCount - a.availableCount;
        }
        return new Date(a.from).getTime() - new Date(b.from).getTime();
      }),
    [summary],
  );

  const bestInterval = sortedIntervals[0] ?? null;
  const otherIntervals = sortedIntervals.slice(1);

  const memberCount = stats.totalUsers || memberAvailabilities.length || 0;
  const unknownMemberCount = Math.max(
    0,
    memberCount - memberAvailabilities.length,
  );
  const membersForDisplay = useMemo(
    () => [
      ...memberAvailabilities,
      ...Array.from({ length: unknownMemberCount }, (_, index) => ({
        memberId: `unknown-member-${index + 1}`,
        actorId: "",
        userId: null,
        displayName: `Mitglied ${memberAvailabilities.length + index + 1}`,
        role: "member",
        availabilities: [],
      })),
    ],
    [memberAvailabilities, unknownMemberCount],
  );
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
  const isOwner = currentGroup?.role === "owner";
  const canLeaveGroup = Boolean(currentGroup);
  const currentGroupImage = groupId
    ? groupImageUrl(groupId, groupImageVersion)
    : bannerSurface;

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

  const showComingSoon = (feature: string) => {
    toast.info("Bald verfügbar", {
      description: `${feature} ist bald verfügbar.`,
    });
  };

  const showVoiceInputComingSoon = () => {
    toast.info("Bald verfügbar", {
      description: "Spracheingabe ist bald verfügbar.",
    });
  };

  const selfHighlight = sortedSelfEntries[0];

  const highlightInterval = bestInterval;
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

  const handleDeleteGroup = async () => {
    if (!groupId) return;
    const confirmed = window.confirm(
      "Gruppe wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
    );
    if (!confirmed) return;

    try {
      const res = await fetch(apiPath(`/api/groups/${groupId}`), {
        method: "DELETE",
        headers: buildIdentityHeaders(identity),
      });
      if (!res.ok) throw new Error(`Fehler: ${res.status}`);
      removeGroup(groupId);
      toast.success("Gruppe gelöscht");
      navigate("/groups", { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Löschen fehlgeschlagen",
      );
    } finally {
      setActionMenuOpen(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!groupId) return;
    const confirmed = window.confirm("Gruppe verlassen?");
    if (!confirmed) return;

    try {
      const res = await fetch(apiPath(`/api/groups/${groupId}/leave`), {
        method: "POST",
        headers: buildIdentityHeaders(identity),
      });
      if (!res.ok) throw new Error(`Fehler: ${res.status}`);
      removeGroup(groupId);
      toast.success("Gruppe verlassen");
      navigate("/groups", { replace: true });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Verlassen fehlgeschlagen",
      );
    } finally {
      setActionMenuOpen(false);
    }
  };

  const openGroupImagePicker = (source: ImagePickSource) => {
    const input = groupImageInputRef.current;
    if (!input) return;
    input.value = "";
    input.accept = "image/*";
    if (source === "camera") {
      input.setAttribute("capture", "environment");
    } else {
      input.removeAttribute("capture");
    }
    input.click();
  };

  const handleGroupImageSource = (source: ImagePickSource) => {
    setGroupImageDialogOpen(false);
    if (!groupId) return;
    openGroupImagePicker(source);
  };

  const handleGroupImageFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !groupId) return;

    try {
      setGroupImageUploading(true);
      await uploadGroupImage(groupId, file, identity);
      setGroupImageFallback(false);
      setGroupImageVersion(Date.now());
      toast.success("Gruppenbild aktualisiert");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gruppenbild konnte nicht hochgeladen werden";
      toast.error(message);
    } finally {
      setGroupImageUploading(false);
    }
  };

  const handleGroupImageDelete = async () => {
    if (!groupId) return;

    try {
      setGroupImageUploading(true);
      await deleteGroupImage(groupId, identity);
      setGroupImageFallback(true);
      toast.success("Gruppenbild gelöscht");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Gruppenbild konnte nicht gelöscht werden";
      toast.error(message);
    } finally {
      setGroupImageUploading(false);
      setGroupImageDialogOpen(false);
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

  useEffect(() => {
    if (!actionMenuOpen) return undefined;

    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current?.contains(event.target as Node)) return;
      setActionMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActionMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [actionMenuOpen]);

  useEffect(() => {
    const node = memberListRef.current;
    if (!node) return;

    const updateFade = () => {
      const nextLeft = node.scrollLeft > 0;
      const nextRight =
        node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
      setMemberListFade((prev) =>
        prev.left === nextLeft && prev.right === nextRight
          ? prev
          : { left: nextLeft, right: nextRight },
      );
    };

    updateFade();
    node.addEventListener("scroll", updateFade, { passive: true });
    window.addEventListener("resize", updateFade);

    return () => {
      node.removeEventListener("scroll", updateFade);
      window.removeEventListener("resize", updateFade);
    };
  }, [membersForDisplay.length]);

  const memberListMask = useMemo(() => {
    if (memberListFade.left && memberListFade.right) {
      return "linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)";
    }
    if (memberListFade.right) {
      return "linear-gradient(to right, black 0, black calc(100% - 16px), transparent 100%)";
    }
    if (memberListFade.left) {
      return "linear-gradient(to right, transparent 0, black 16px, black 100%)";
    }
    return undefined;
  }, [memberListFade.left, memberListFade.right]);

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
    <div className="relative pb-28">
      {groupImageUploading ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-full border border-white/40 bg-slate-900/45 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
          Bild wird hochgeladen…
        </div>
      ) : null}
      <input
        ref={groupImageInputRef}
        type="file"
        className="hidden"
        onChange={handleGroupImageFileChange}
      />
      <ImageSourceDialog
        open={groupImageDialogOpen}
        title="Gruppenbild ändern"
        description="Foto aufnehmen oder ein Bild aus Galerie/Dokumenten wählen."
        onClose={() => setGroupImageDialogOpen(false)}
        onSelect={handleGroupImageSource}
        onDelete={handleGroupImageDelete}
        deleteLabel="Gruppenbild löschen"
        deleteDisabled={groupImageUploading}
      />

      <div className="relative -mx-5 -mt-6 h-[32vh] w-[calc(100%+2.5rem)] overflow-hidden">
        <img
          src={groupImageFallback ? bannerSurface : currentGroupImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setGroupImageFallback(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-sage-900/20" />
        <div className="absolute top-6 left-6 right-4 flex justify-between items-start">
          <div className="flex items-center gap-3 text-sage-900">
            <button
              type="button"
              aria-label="Zurück"
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/75 backdrop-blur-md flex items-center justify-center border border-white/60 hover:bg-white/90 transition"
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
          <div className="relative flex items-center gap-2" ref={actionMenuRef}>
            <button
              type="button"
              aria-label="Einladungslink teilen"
              onClick={handleShareInvite}
              className="w-9 h-9 rounded-full bg-white/75 backdrop-blur-md flex items-center justify-center border border-white/60 text-sage-800 hover:bg-white/90 transition"
            >
              <span className="material-symbols-outlined">share</span>
            </button>
            <button
              type="button"
              aria-label="Gruppenaktionen"
              onClick={() => setActionMenuOpen((open) => !open)}
              className="w-9 h-9 rounded-full bg-white/75 backdrop-blur-md flex items-center justify-center border border-white/60 text-sage-800 hover:bg-white/90 transition"
            >
              <span className="material-symbols-outlined">more_vert</span>
            </button>

            {actionMenuOpen ? (
              <div className="absolute right-0 top-11 z-30 w-48 rounded-2xl border border-sage-200 bg-white p-1.5 shadow-card">
                <button
                  type="button"
                  className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-sage-900 transition hover:bg-sage-50"
                  disabled={groupImageUploading}
                  onClick={() => {
                    setActionMenuOpen(false);
                    setGroupImageDialogOpen(true);
                  }}
                >
                  {groupImageUploading
                    ? "Gruppenbild wird hochgeladen…"
                    : "Gruppenbild anpassen"}
                </button>
                {isOwner ? (
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50"
                    onClick={handleDeleteGroup}
                  >
                    Gruppe löschen
                  </button>
                ) : null}
                {canLeaveGroup ? (
                  <button
                    type="button"
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-sage-900 transition hover:bg-sage-50"
                    onClick={handleLeaveGroup}
                  >
                    Gruppe verlassen
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
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
            onClick={() => showComingSoon("Deadline")}
          >
            <span className="material-symbols-outlined text-slate-500 text-[18px]">
              event_busy
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-xs font-semibold text-slate-800">
                Deadline setzen
              </span>
            </span>
          </button>
        </div>
      </div>

      <div className="mt-6 px-1 space-y-6">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-4 px-1">
            Mitglieder
          </h3>
          <div className="relative">
            <div
              ref={memberListRef}
              className="flex overflow-x-auto no-scrollbar gap-5 items-start px-1"
              style={
                memberListMask
                  ? {
                      maskImage: memberListMask,
                      WebkitMaskImage: memberListMask,
                    }
                  : undefined
              }
            >
              {membersForDisplay.map((member) => (
                <div
                  key={member.memberId}
                  className="flex flex-col items-center gap-2 min-w-[64px]"
                >
                  <div className="w-14 h-14 rounded-full border-[2px] border-brand-primary p-0.5 shadow-sm bg-white">
                    <div className="relative w-full h-full rounded-full overflow-hidden grid place-items-center">
                      <img
                        src={genericSurface}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-sage-900/15" />
                      <span className="relative z-10 text-xs font-bold text-sage-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)]">
                        {formatMemberName(member.displayName).slice(0, 2)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-slate-900">
                    {formatMemberName(member.displayName)}
                  </p>
                </div>
              ))}
            </div>
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
                  Meine Verfügbarkeiten
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
                  Beste Zeiträume
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
            {highlightInterval ? (
              <>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest">
                        Bester Zeitraum
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {dateFormatter.format(new Date(highlightInterval.from))}{" "}
                        — {dateFormatter.format(new Date(highlightInterval.to))}
                      </p>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        {highlightInterval.availableCount} von{" "}
                        {highlightInterval.totalMembers} Personen verfügbar
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-brand-primary">
                      check_circle
                    </span>
                  </div>
                </div>

                {hasExtraGroupIntervals && groupListOpen && (
                  <ul className="mt-3 space-y-2">
                    {otherIntervals.map((item, idx) => (
                      <li
                        key={`${item.from}-${item.to}-${idx}`}
                        className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <p className="font-semibold text-slate-900">
                          {dateFormatter.format(new Date(item.from))} —{" "}
                          {dateFormatter.format(new Date(item.to))}
                        </p>
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {item.availableCount}/{item.totalMembers} verfügbar
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className={muted}>Noch keine Überschneidungen vorhanden.</p>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-6 left-0 right-0 max-w-[520px] mx-auto p-4 flex items-center justify-end gap-3 pointer-events-none">
        <button
          type="button"
          className="pointer-events-auto w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-95 transition-transform active:scale-90 bg-brand-primary border border-white/10 text-white"
          onClick={showVoiceInputComingSoon}
          aria-label="Spracheingabe (bald verfügbar)"
        >
          <span className="relative inline-flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-2xl">
              mic
            </span>
            <span className="absolute -right-0 top-5 inline-flex items-center justify-center bg-transparent text-[12px] font-bold leading-none text-white">
              +
            </span>
          </span>
        </button>
        <button
          type="button"
          className="pointer-events-auto w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-95 transition-transform active:scale-90 bg-brand-primary border border-white/10 text-white"
          onClick={() => showComingSoon("Kalender-Import")}
          aria-label="Kalenderimport (Platzhalter)"
        >
          <span className="material-symbols-outlined text-white text-2xl">
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
