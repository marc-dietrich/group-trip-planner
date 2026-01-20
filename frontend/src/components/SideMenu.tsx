import { useMemo, useState } from "react";
import { Identity } from "../types";

export type SideMenuProps = {
  open: boolean;
  onClose: () => void;
  identity: Identity;
  onLogout?: () => void;
};

export function SideMenu({ open, onClose, identity, onLogout }: SideMenuProps) {
  const [notifications, setNotifications] = useState(true);
  const [faceId, setFaceId] = useState(false);
  const [rating, setRating] = useState(4);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const pendingSurface = "bg-rose-50 border border-rose-100";
  const pendingText = "text-rose-700";
  const pendingBadge =
    "inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700 border border-rose-200";

  const displayName = useMemo(
    () => identity.displayName || ("Gast" as string),
    [identity.displayName],
  );
  const email = useMemo(() => {
    if (identity.kind === "user") return "angemeldet";
    return "gastnutzer";
  }, [identity.kind]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Menü schließen"
        onClick={onClose}
      />
      <div className="relative w-full max-w-[430px] h-full flex">
        <div
          className="absolute inset-0 bg-black/5 pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative left-0 top-0 z-50 h-full w-[82%] bg-white dark:bg-zinc-950 shadow-xl flex flex-col overflow-hidden rounded-r-[32px] border-r border-zinc-900/5">
          <div className="absolute right-3 top-3 z-10">
            <button
              type="button"
              aria-label="Schließen"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center text-sage-700 hover:text-sage-900 transition"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-5 pt-10 flex flex-col gap-3">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <div className="size-12 rounded-full bg-sage-100 flex items-center justify-center text-sage-800 font-semibold border border-sage-200">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-sage-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px] text-amber-400">
                      crown
                    </span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <p className="text-zinc-900 dark:text-zinc-100 text-[15px] font-semibold leading-tight">
                    {displayName}
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] font-normal">
                    {email}
                  </p>
                </div>
              </div>
            </div>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800/50 mx-6" />
            <div className="p-6">
              <div
                className={`flex flex-col gap-3 rounded-2xl p-4 ${pendingSurface}`}
                aria-label="Spendenplatzhalter"
              >
                <div className="flex items-center justify-between">
                  <p
                    className={`text-xs font-bold uppercase tracking-tight ${pendingText}`}
                  >
                    Unterstütze uns
                  </p>
                  <span className={pendingBadge}>in Planung</span>
                </div>
                <p className={`${pendingText} text-[11px] leading-relaxed`}>
                  Spendenfläche ist noch nicht aktiv. Bald gibt es hier Infos
                  und eine sichere Abwicklung.
                </p>
                <button
                  className={`flex w-full cursor-not-allowed items-center justify-center rounded-xl h-10 border border-rose-200 bg-rose-100 text-xs font-semibold ${pendingText}`}
                  type="button"
                  aria-disabled="true"
                >
                  Kommt bald
                </button>
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className="text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-[0.1em] font-bold px-6 pb-2">
                Einstellungen
              </h3>
              <div
                className={`flex items-center gap-4 px-6 min-h-[60px] justify-between rounded-2xl ${pendingSurface}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-xl bg-rose-100 shrink-0 size-9 text-rose-700">
                    <span className="material-symbols-outlined text-[20px]">
                      notifications
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <p className={`text-[14px] font-semibold ${pendingText}`}>
                      Benachrichtigungen
                    </p>
                    <span className="text-[11px] font-medium text-rose-600">
                      noch nicht verfügbar
                    </span>
                  </div>
                </div>
                <label className="relative flex h-[26px] w-[46px] cursor-not-allowed items-center rounded-full border border-rose-200 bg-rose-100 p-0.5 transition-all">
                  <input
                    type="checkbox"
                    className="peer hidden"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                    disabled
                  />
                  <div className="h-full aspect-square rounded-full bg-white shadow-sm transition-all peer-checked:translate-x-[20px]" />
                  <div className="absolute inset-0 rounded-full pointer-events-none peer-checked:bg-rose-300/60" />
                </label>
              </div>
              <div
                className={`flex items-center gap-4 px-6 min-h-[60px] justify-between rounded-2xl mt-3 ${pendingSurface}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-xl bg-rose-100 shrink-0 size-9 text-rose-700">
                    <span className="material-symbols-outlined text-[20px]">
                      fingerprint
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <p className={`text-[14px] font-semibold ${pendingText}`}>
                      Sicherheit (FaceID)
                    </p>
                    <span className="text-[11px] font-medium text-rose-600">
                      noch nicht aktiv
                    </span>
                  </div>
                </div>
                <label className="relative flex h-[26px] w-[46px] cursor-not-allowed items-center rounded-full border border-rose-200 bg-rose-100 p-0.5 transition-all">
                  <input
                    type="checkbox"
                    className="peer hidden"
                    checked={faceId}
                    onChange={(e) => setFaceId(e.target.checked)}
                    disabled
                  />
                  <div className="h-full aspect-square rounded-full bg-white shadow-sm transition-all peer-checked:translate-x-[20px]" />
                  <div className="absolute inset-0 rounded-full pointer-events-none peer-checked:bg-rose-300/60" />
                </label>
              </div>
            </div>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800/50 mx-6 mt-1" />
            <div className="px-6 py-2 flex flex-col gap-1.5">
              <button
                type="button"
                className={`flex items-center gap-3 py-3 group w-full ${pendingText}`}
                onClick={() => setFeedbackOpen((open) => !open)}
                aria-expanded={feedbackOpen}
              >
                <div className="text-rose-500 group-hover:text-rose-600 transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    forum
                  </span>
                </div>
                <p className="flex-1 text-left text-[14px] font-semibold">
                  Feedback (Platzhalter)
                </p>
                <span
                  className={`material-symbols-outlined text-[20px] text-rose-400 transition-transform ${
                    feedbackOpen ? "rotate-180" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>
              {feedbackOpen && (
                <div
                  className={`ml-9 mr-3 mt-2 flex flex-col gap-3 rounded-xl p-4 ${pendingSurface}`}
                >
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Stern ${star}`}
                        onClick={() => setRating(star)}
                        className="text-rose-500"
                        disabled
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] ${
                            star <= rating ? "text-rose-500" : "text-rose-200"
                          }`}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Feedback-Slot folgt"
                    className="w-full rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 placeholder:text-rose-400 focus:border-rose-400 focus:ring-0 transition-all resize-none"
                    disabled
                  />
                  <button
                    type="button"
                    className="flex h-9 w-full items-center justify-center rounded-xl bg-rose-100 text-rose-700 text-xs font-semibold cursor-not-allowed border border-rose-200"
                    aria-disabled="true"
                  >
                    Kommt bald
                  </button>
                </div>
              )}
              <button
                className={`flex items-center gap-3 py-3 group ${pendingText}`}
                type="button"
              >
                <div className="text-rose-500 group-hover:text-rose-600 transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    mail
                  </span>
                </div>
                <p className="text-[14px] font-semibold">Kontakt (bald)</p>
              </button>
              <button
                className="flex items-center gap-3 py-3 group"
                type="button"
                onClick={() => {
                  if (onLogout) onLogout();
                  onClose();
                }}
              >
                <div className="text-zinc-400 group-hover:text-red-500 transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    logout
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-[14px] font-medium group-hover:text-red-500 transition-colors">
                  Abmelden
                </p>
              </button>
            </div>
          </div>
          <div className={`mt-auto p-6 border-t ${pendingSurface}`}>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest ${pendingText}`}
                >
                  Impressum (Platzhalter)
                </p>
                <span className={`text-[10px] font-mono ${pendingText}`}>
                  v1.2.0
                </span>
              </div>
              <div
                className={`flex flex-col text-[11px] space-y-0.5 ${pendingText}`}
              >
                <p className="font-semibold">Daten werden nachgereicht</p>
                <p>Nicht final</p>
              </div>
              <p
                className={`${pendingText} mt-2 text-[10px] leading-relaxed italic font-medium`}
              >
                Rechtsangaben folgen noch. Dieser Bereich ist bewusst markiert.
              </p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800/20 rounded-full z-[60]" />
      </div>
    </div>
  );
}
