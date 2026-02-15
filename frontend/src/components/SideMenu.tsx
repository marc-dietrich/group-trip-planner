import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Identity } from "../types";
import {
  startOAuthLogin,
  authEnabled as defaultAuthEnabled,
} from "../lib/auth";

export type SideMenuProps = {
  open: boolean;
  onClose: () => void;
  identity: Identity;
  onLogout?: () => void;
  onLogin?: () => void;
  authEnabled?: boolean;
};

export function SideMenu({
  open,
  onClose,
  identity,
  onLogout,
  onLogin,
  authEnabled,
}: SideMenuProps) {
  const [notifications, setNotifications] = useState(false);
  const [faceId, setFaceId] = useState(false);
  const oauthReady = authEnabled ?? defaultAuthEnabled;

  const pendingSurface = "bg-sage-50 border border-sage-100";
  const pendingText = "text-sage-800";
  const infoText = "text-slate-800";
  const mutedText = "text-zinc-700";
  const impressumLines = [
    "Marc Dietrich",
    "c/o DE Office Solutions",
    "Erfweiler Straße 12",
    "66994 Dahn",
  ];

  const isActor = identity.kind === "actor";
  const isUser = identity.kind === "user";

  const displayName = useMemo(
    () => identity.displayName || ("Gast" as string),
    [identity.displayName],
  );
  const email = useMemo(() => (isUser ? "angemeldet" : "gastnutzer"), [isUser]);

  const handleComingSoon = () => {
    toast.info("Kommt bald – Feedback und Kontakt sind demnächst verfügbar.");
  };

  const handleLoginClick = () => {
    if (!oauthReady) {
      toast.error(
        "OAuth Proxy Container nicht aktiv. Bitte oauth-proxy via Docker starten.",
      );
      return;
    }
    if (onLogin) {
      onLogin();
    } else {
      startOAuthLogin();
    }
    onClose();
  };

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
                  <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-sage-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[12px] text-amber-400">
                      crown
                    </span>
                  </div>
                  {isActor && (
                    <div className="absolute -bottom-1 -right-1 flex items-center justify-center">
                      <div
                        className="absolute size-6 rounded-full bg-white border border-sage-100 shadow-sm"
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        aria-label="Jetzt anmelden"
                        className={`relative flex size-[18px] items-center justify-center rounded-full transition ${oauthReady ? "text-sage-700 hover:bg-sage-50" : "text-zinc-400 cursor-not-allowed"}`}
                        onClick={handleLoginClick}
                        disabled={!oauthReady}
                        title={
                          oauthReady
                            ? "Login öffnet den Google OAuth Proxy"
                            : "OAuth Proxy offline – starte oauth-proxy Container"
                        }
                      >
                        <span className="material-symbols-outlined text-[10px]">
                          login
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <p className="text-zinc-900 dark:text-zinc-100 text-[15px] font-semibold leading-tight">
                    {displayName}
                  </p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] font-normal">
                    {email}
                  </p>
                </div>
                <div className="ml-auto flex flex-col items-center gap-1">
                  {isUser ? (
                    <div className="inline-flex items-center gap-1 rounded-full border border-sage-200 bg-sage-50 px-2 py-0.5 text-[11px] font-semibold text-sage-800">
                      <span className="material-symbols-outlined text-[14px]">
                        verified_user
                      </span>
                      Google
                    </div>
                  ) : (
                    <p className="text-[11px] font-semibold text-sage-800">
                      Gastmodus
                    </p>
                  )}
                  <span
                    className={`text-[10px] uppercase tracking-wide ${oauthReady ? "text-sage-600" : "text-amber-600"}`}
                  >
                    {oauthReady ? "OAuth bereit" : "Proxy offline"}
                  </span>
                </div>
              </div>
            </div>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800/50 mx-6" />
            <div className="p-6">
              <div
                className="flex flex-col rounded-2xl p-4 gap-3"
                aria-label="Spenden Coming Soon"
              >
                <div className="flex flex-col gap-1">
                  <p
                    className={`text-xs font-bold uppercase tracking-tight ${mutedText}`}
                  >
                    Unterstütze uns
                  </p>
                  <p className="text-[11px] leading-relaxed text-zinc-600">
                    Dieses Tool bleibt kostenlos. Spenden sind freiwillig und
                    ohne Vorteile.
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-3 flex h-10 w-full items-center justify-center rounded-xl bg-zinc-200 text-[12px] font-semibold text-zinc-600 cursor-not-allowed border border-zinc-200"
                  aria-disabled="true"
                >
                  Coming soon
                </button>
              </div>
            </div>
            <div className="flex flex-col px-6 pb-4 gap-3">
              <h3 className="text-zinc-500 text-[11px] uppercase tracking-[0.14em] font-bold">
                Einstellungen
              </h3>
              <div
                className="flex items-center gap-4 min-h-[56px] justify-between"
                title="Push nur in mobiler App aktivierbar."
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-xl bg-sage-100 shrink-0 size-9 text-sage-800">
                    <span className="material-symbols-outlined text-[20px]">
                      notifications
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <p className={`text-[14px] font-semibold ${infoText}`}>
                      Benachrichtigungen
                    </p>
                  </div>
                </div>
                <label
                  className="relative flex h-[26px] w-[46px] cursor-pointer items-center rounded-full border border-zinc-200 bg-zinc-100 p-0.5 transition-all"
                  title="Push nur in mobiler App aktivierbar."
                >
                  <input
                    type="checkbox"
                    className="peer hidden"
                    checked={notifications}
                    onChange={() => {
                      setNotifications(false);
                      toast.info(
                        "Download App, um alle Features freizuschalten.",
                      );
                    }}
                    aria-label="Benachrichtigungen nur in mobiler App aktivierbar"
                  />
                  <div className="h-full aspect-square rounded-full bg-white shadow-sm transition-all peer-checked:translate-x-[20px]" />
                  <div className="absolute inset-0 rounded-full pointer-events-none peer-checked:bg-zinc-300/70" />
                </label>
              </div>
              <div
                className="flex items-center gap-4 min-h-[56px] justify-between"
                title="Face ID / Fingerprint nur in mobiler App verfügbar."
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-xl bg-sage-100 shrink-0 size-9 text-sage-800">
                    <span className="material-symbols-outlined text-[20px]">
                      fingerprint
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <p className={`text-[14px] font-semibold ${infoText}`}>
                      Sicherheit
                    </p>
                  </div>
                </div>
                <label
                  className="relative flex h-[26px] w-[46px] cursor-pointer items-center rounded-full border border-zinc-200 bg-zinc-100 p-0.5 transition-all"
                  title="Face ID / Fingerprint nur in mobiler App verfügbar."
                >
                  <input
                    type="checkbox"
                    className="peer hidden"
                    checked={faceId}
                    onChange={() => {
                      setFaceId(false);
                      toast.info(
                        "Download App, um alle Features freizuschalten.",
                      );
                    }}
                    aria-label="Biometrische Anmeldung nur in mobiler App verfügbar"
                  />
                  <div className="h-full aspect-square rounded-full bg-white shadow-sm transition-all peer-checked:translate-x-[20px]" />
                  <div className="absolute inset-0 rounded-full pointer-events-none peer-checked:bg-zinc-300/70" />
                </label>
              </div>
            </div>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800/50 mx-6 mt-1" />
            <div className="px-6 py-2 flex flex-col gap-1.5">
              <button
                type="button"
                className="flex items-center gap-3 py-3 group w-full text-sage-400 cursor-not-allowed"
                onClick={handleComingSoon}
                aria-disabled="true"
              >
                <div className="text-sage-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    forum
                  </span>
                </div>
                <p className="flex-1 text-left text-[14px] font-semibold">
                  Feedback (bald verfügbar)
                </p>
              </button>
              <button
                className="flex items-center gap-3 py-3 group text-sage-400 cursor-not-allowed"
                type="button"
                onClick={handleComingSoon}
                aria-disabled="true"
              >
                <div className="text-sage-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    mail
                  </span>
                </div>
                <p className="text-[14px] font-semibold">
                  Kontakt (bald verfügbar)
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
                <div className="text-zinc-400 group-hover:text-sage-300 transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    logout
                  </span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-[14px] font-medium group-hover:text-sage-700 transition-colors">
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
                  Impressum
                </p>
                <span className={`text-[10px] font-mono ${pendingText}`}>
                  v1.2.0
                </span>
              </div>
              <div
                className={`flex flex-col text-[11px] space-y-0.5 ${pendingText}`}
              >
                {impressumLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800/20 rounded-full z-[60]" />
      </div>
    </div>
  );
}
