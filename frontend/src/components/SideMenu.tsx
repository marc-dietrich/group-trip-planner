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

  const displayName = useMemo(
    () => identity.displayName || ("Gast" as string),
    [identity.displayName]
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
              <div className="flex flex-col gap-3 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-zinc-800 dark:text-zinc-200 text-xs font-bold uppercase tracking-tight">
                    Unterstütze uns
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] leading-relaxed">
                    Spenden sind willkommen, aber kein Muss. Es gibt keine
                    Vorteile, außer dem Icon.
                  </p>
                </div>
                <button
                  className="flex w-full cursor-pointer items-center justify-center rounded-xl h-10 border border-brand-primary/20 bg-white dark:bg-zinc-900 hover:bg-sage-50 transition-colors text-brand-primary text-xs font-semibold"
                  type="button"
                >
                  Jetzt spenden
                </button>
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className="text-zinc-400 dark:text-zinc-500 text-[10px] uppercase tracking-[0.1em] font-bold px-6 pb-2">
                Einstellungen
              </h3>
              <div className="flex items-center gap-4 bg-transparent px-6 min-h-[52px] justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-zinc-500 dark:text-zinc-400 flex items-center justify-center rounded-xl bg-sage-light dark:bg-brand-primary/10 shrink-0 size-9">
                    <span className="material-symbols-outlined text-[20px]">
                      notifications
                    </span>
                  </div>
                  <p className="text-zinc-800 dark:text-zinc-100 text-[14px] font-medium">
                    Benachrichtigungen
                  </p>
                </div>
                <label className="relative flex h-[26px] w-[46px] cursor-pointer items-center rounded-full border-none bg-zinc-200 dark:bg-zinc-800 p-0.5 transition-all">
                  <input
                    type="checkbox"
                    className="peer hidden"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                  />
                  <div className="h-full aspect-square rounded-full bg-white shadow-sm transition-all peer-checked:translate-x-[20px]" />
                  <div className="absolute inset-0 rounded-full pointer-events-none peer-checked:bg-brand-primary/60" />
                </label>
              </div>
              <div className="flex items-center gap-4 bg-transparent px-6 min-h-[52px] justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-zinc-500 dark:text-zinc-400 flex items-center justify-center rounded-xl bg-sage-light dark:bg-brand-primary/10 shrink-0 size-9">
                    <span className="material-symbols-outlined text-[20px]">
                      fingerprint
                    </span>
                  </div>
                  <p className="text-zinc-800 dark:text-zinc-100 text-[14px] font-medium">
                    Sicherheit (FaceID)
                  </p>
                </div>
                <label className="relative flex h-[26px] w-[46px] cursor-pointer items-center rounded-full border-none bg-zinc-200 dark:bg-zinc-800 p-0.5 transition-all">
                  <input
                    type="checkbox"
                    className="peer hidden"
                    checked={faceId}
                    onChange={(e) => setFaceId(e.target.checked)}
                  />
                  <div className="h-full aspect-square rounded-full bg-white shadow-sm transition-all peer-checked:translate-x-[20px]" />
                  <div className="absolute inset-0 rounded-full pointer-events-none peer-checked:bg-brand-primary/60" />
                </label>
              </div>
            </div>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800/50 mx-6 mt-1" />
            <div className="px-6 py-2 flex flex-col gap-1.5">
              <button
                type="button"
                className="flex items-center gap-3 py-3 group w-full"
                onClick={() => setFeedbackOpen((open) => !open)}
                aria-expanded={feedbackOpen}
              >
                <div className="text-zinc-400 group-hover:text-brand-primary transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    forum
                  </span>
                </div>
                <p className="flex-1 text-left text-zinc-600 dark:text-zinc-400 text-[14px] font-medium group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                  Feedback geben
                </p>
                <span
                  className={`material-symbols-outlined text-[20px] text-zinc-400 transition-transform ${
                    feedbackOpen ? "rotate-180" : ""
                  }`}
                >
                  expand_more
                </span>
              </button>
              {feedbackOpen && (
                <div className="ml-9 mr-3 mt-2 flex flex-col gap-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 p-4">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Stern ${star}`}
                        onClick={() => setRating(star)}
                        className="text-brand-primary"
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] ${
                            star <= rating
                              ? "fill-icon"
                              : "text-zinc-200 dark:text-zinc-700"
                          }`}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Deine Nachricht (optional)..."
                    className="w-full rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-3 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:border-brand-primary/50 focus:ring-0 transition-all resize-none"
                  />
                  <button
                    type="button"
                    className="flex h-9 w-full items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold"
                  >
                    Senden
                  </button>
                </div>
              )}
              <button
                className="flex items-center gap-3 py-3 group"
                type="button"
              >
                <div className="text-zinc-400 group-hover:text-brand-primary transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    mail
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-[14px] font-medium group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                  Kontakt
                </p>
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
          <div className="mt-auto p-6 bg-zinc-50/50 dark:bg-zinc-900/20 border-t border-zinc-100 dark:border-zinc-900">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <p className="text-zinc-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                  Impressum
                </p>
                <span className="text-[10px] text-zinc-300 dark:text-zinc-700 font-mono">
                  v1.2.0
                </span>
              </div>
              <div className="flex flex-col text-[11px] text-zinc-500 dark:text-zinc-400 space-y-0.5">
                <p className="font-medium text-zinc-700 dark:text-zinc-300">
                  Moritz Müller
                </p>
                <p>Berlin, Deutschland</p>
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-zinc-400 italic font-light">
                Von Hand programmiert. Mit Liebe zum Detail und zu viel Koffein
                im Blut. ☕️
              </p>
            </div>
          </div>
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800/20 rounded-full z-[60]" />
      </div>
    </div>
  );
}
