import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Identity } from "../types";
import { createDonationCheckoutSession } from "../services/donationService";
import {
  getSupportEmail,
  sendFeedback,
} from "../services/contactFeedbackService";
import {
  startOAuthLogin,
  authEnabled as defaultAuthEnabled,
} from "../lib/auth";
import { ImagePickSource, ImageSourceDialog } from "./ImageSourceDialog";
import { profileImageUrl, uploadProfileImage } from "../services/imageService";
import genericSurface from "../../assets/generic.webp";

export type SideMenuProps = {
  open: boolean;
  onClose: () => void;
  identity: Identity;
  hasSupporterCrown?: boolean;
  onLogout?: () => void;
  onLogin?: () => void;
  authEnabled?: boolean;
};

function getInitials(value: string) {
  const cleaned = (value || "").trim();
  if (!cleaned) return "GA";
  const parts = cleaned
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
  return parts.toUpperCase() || cleaned.slice(0, 2).toUpperCase();
}

export function SideMenu({
  open,
  onClose,
  identity,
  hasSupporterCrown = false,
  onLogout,
  onLogin,
  authEnabled,
}: SideMenuProps) {
  const ANIMATION_DURATION_MS = 220;
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(open);
  const [notifications, setNotifications] = useState(false);
  const [faceId, setFaceId] = useState(false);
  const [donationLoading, setDonationLoading] = useState(false);
  const [donationExpanded, setDonationExpanded] = useState(false);
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [contactExpanded, setContactExpanded] = useState(false);
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageVersion, setImageVersion] = useState<number>(Date.now());
  const [imageFallback, setImageFallback] = useState(false);
  const oauthReady = authEnabled ?? defaultAuthEnabled;
  const donationAmounts = [5, 10, 20];
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const donationMotionClass = (index: number) => {
    if (donationExpanded) {
      return "translate-x-0 scale-100 opacity-100";
    }

    if (index === 0) {
      return "translate-x-[calc(100%+0.5rem)] scale-75 opacity-0";
    }

    if (index === 2) {
      return "translate-x-[calc(-100%-0.5rem)] scale-75 opacity-0";
    }

    return "translate-x-0 scale-75 opacity-0";
  };

  const donationDelayClass = (index: number) => {
    if (index === 1) return "delay-75";
    if (index === 2) return "delay-150";
    return "delay-0";
  };

  const pendingSurface = "bg-sage-50 border-sage-100";
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
  const identityLabel = useMemo(
    () => (isUser ? "Angemeldet" : "Gastmodus"),
    [isUser],
  );

  const currentImageSrc =
    identity.kind === "user"
      ? profileImageUrl(identity.userId, imageVersion)
      : genericSurface;

  const openFilePicker = (source: ImagePickSource) => {
    const input = fileInputRef.current;
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

  const handleSelectImageSource = (source: ImagePickSource) => {
    setPickerOpen(false);
    if (identity.kind !== "user") {
      toast.info("Bitte melde dich zuerst an, um ein Profilbild hochzuladen.");
      return;
    }
    openFilePicker(source);
  };

  const handleProfileFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || identity.kind !== "user") return;
    try {
      setImageUploading(true);
      await uploadProfileImage(file, identity);
      setImageFallback(false);
      setImageVersion(Date.now());
      toast.success("Profilbild aktualisiert");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Profilbild konnte nicht hochgeladen werden";
      toast.error(message);
    } finally {
      setImageUploading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setRendered(true);
      const frameId = window.requestAnimationFrame(() => {
        setVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    setVisible(false);

    const timeoutId = window.setTimeout(() => {
      setRendered(false);
    }, ANIMATION_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open]);

  const handleLoginClick = () => {
    if (!oauthReady) {
      toast.error(
        "OAuth-Proxy-Container ist nicht aktiv. Bitte starte oauth-proxy per Docker.",
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

  const handleDonationClick = async (amountInEur: number) => {
    if (donationLoading) return;

    try {
      setDonationLoading(true);
      const sessionUrl = await createDonationCheckoutSession(
        amountInEur,
        identity.actorId,
        identity.kind === "user" ? identity.userId : undefined,
      );

      if (!sessionUrl) {
        throw new Error("Keine Checkout-URL erhalten");
      }

      window.location.assign(sessionUrl);
    } catch (error) {
      console.error("Donation checkout failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Spende konnte nicht gestartet werden. Bitte später erneut.";
      toast.error(message);
    } finally {
      setDonationLoading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackLoading || !feedbackRating) return;

    try {
      setFeedbackLoading(true);
      const trimmedMessage = feedbackMessage.trim();
      await sendFeedback({
        rating: feedbackRating,
        message: trimmedMessage ? trimmedMessage : undefined,
        actorId: identity.actorId,
        displayName,
      });
      toast.success("Danke für dein Feedback!");
      setFeedbackRating(null);
      setFeedbackMessage("");
      setFeedbackExpanded(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Feedback konnte nicht gesendet werden.";
      toast.error(message);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const handleRevealContact = async () => {
    if (contactLoading) return;

    try {
      setContactLoading(true);
      const emailAddress = await getSupportEmail();
      setContactEmail(emailAddress);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Kontakt konnte nicht geladen werden.";
      toast.error(message);
    } finally {
      setContactLoading(false);
    }
  };

  const handleContactToggle = () => {
    const nextExpanded = !contactExpanded;
    setContactExpanded(nextExpanded);
    setFeedbackExpanded(false);

    if (nextExpanded && !contactEmail && !contactLoading) {
      void handleRevealContact();
    }
  };

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleProfileFileChange}
      />
      <ImageSourceDialog
        open={pickerOpen}
        title="Profilbild ändern"
        description="Foto aufnehmen oder ein Bild aus Galerie/Dokumenten wählen."
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectImageSource}
      />
      <button
        type="button"
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ease-out ${visible ? "opacity-100" : "opacity-0"}`}
        aria-label="Menü schließen"
        onClick={onClose}
        disabled={!visible}
      />
      <div className="relative w-full max-w-[430px] h-full flex">
        <div
          className={`absolute inset-0 bg-black/5 pointer-events-none transition-opacity duration-200 ease-out ${visible ? "opacity-100" : "opacity-0"}`}
          aria-hidden="true"
        />
        <div
          className={`relative left-0 top-0 z-50 h-full w-[82%] bg-cream dark:bg-zinc-950 shadow-xl flex flex-col overflow-hidden rounded-r-[32px] border-r border-zinc-900/5 transition-all duration-200 ease-out ${visible ? "translate-x-0 opacity-100" : "-translate-x-6 opacity-0"}`}
        >
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
          <div className="flex h-full flex-1 flex-col overflow-y-auto overflow-x-hidden">
            <div className="p-5 pt-10 flex flex-col gap-3">
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <button
                    type="button"
                    className="relative size-12 rounded-full overflow-hidden border border-sage-200 bg-sage-100 flex items-center justify-center"
                    onClick={() => setPickerOpen(true)}
                    aria-label="Profilbild ändern"
                    disabled={imageUploading}
                  >
                    <img
                      src={imageFallback ? genericSurface : currentImageSrc}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full object-cover"
                      onError={() => setImageFallback(true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-sage-900/15" />
                    <span className="relative z-10 text-sage-900 font-semibold drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)]">
                      {getInitials(displayName)}
                    </span>
                  </button>
                  {hasSupporterCrown ? (
                    <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-sage-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[12px] text-amber-400">
                        crown
                      </span>
                    </div>
                  ) : null}
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
                            ? "Anmeldung über Google OAuth"
                            : "OAuth-Proxy offline – starte den oauth-proxy-Container"
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
                    {identityLabel}
                  </p>
                </div>
                {isActor && !oauthReady ? (
                  <div className="ml-auto flex flex-col items-center gap-1">
                    <span
                      className="text-[10px] uppercase tracking-wide text-amber-600"
                    >
                      Proxy offline
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800/50 mx-6" />
            <div className="p-6">
              <div
                className="flex flex-col rounded-2xl p-4 gap-3"
                aria-label="Spenden"
              >
                <div className="flex flex-col gap-1">
                  <p
                    className={`text-xs font-bold uppercase tracking-tight ${mutedText}`}
                  >
                    Unterstützung
                  </p>
                  <p className="text-[11px] leading-relaxed text-zinc-600">
                    Dieses Tool bleibt kostenlos. Spenden sind freiwillig und
                    ohne Vorteile.
                  </p>
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    className={`flex w-full items-center justify-center rounded-xl bg-sage-700 text-[12px] font-semibold text-white border border-sage-700 transition duration-200 hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-60 overflow-hidden focus-visible:outline-none focus-visible:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] ${donationExpanded ? "h-0 opacity-0 scale-95 border-0 bg-transparent pointer-events-none" : "h-10 opacity-100 scale-100"}`}
                    disabled={donationLoading}
                    onClick={() => {
                      setDonationExpanded(true);
                    }}
                  >
                    {donationLoading ? "Weiterleitung…" : "Supporter werden"}
                  </button>

                  <div
                    className={`grid grid-cols-3 gap-2 overflow-hidden transition-all duration-300 ease-out ${donationExpanded ? "mt-2 max-h-14 opacity-100" : "max-h-0 opacity-0 pointer-events-none"}`}
                  >
                    {donationAmounts.map((amount, index) => (
                      <button
                        key={amount}
                        type="button"
                        className={`flex h-10 items-center justify-center rounded-xl bg-sage-700 text-[12px] font-semibold text-white border border-sage-700 transition-transform transition-opacity duration-300 ease-out hover:bg-sage-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-0 active:outline-none [-webkit-tap-highlight-color:transparent] ${donationMotionClass(index)} ${donationDelayClass(index)}`}
                        disabled={donationLoading}
                        onClick={() => {
                          void handleDonationClick(amount);
                        }}
                      >
                        {donationLoading ? "…" : `${amount} €`}
                      </button>
                    ))}
                  </div>
                </div>
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
                        "Lade die App herunter, um alle Funktionen freizuschalten.",
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
                        "Lade die App herunter, um alle Funktionen freizuschalten.",
                      );
                    }}
                    aria-label="Biometrische Anmeldung nur in mobiler App verfügbar"
                  />
                        {donationLoading ? "…" : `${amount} €`}
                  <div className="absolute inset-0 rounded-full pointer-events-none peer-checked:bg-zinc-300/70" />
                </label>
              </div>
            </div>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800/50 mx-6 mt-1" />
            <div className="px-6 py-2 flex flex-col gap-1.5">
              <button
                type="button"
                className="flex items-center gap-3 py-3 group w-full"
                onClick={() => {
                  setFeedbackExpanded((prev) => !prev);
                  setContactExpanded(false);
                }}
                aria-expanded={feedbackExpanded}
              >
                <div className="text-zinc-400 group-hover:text-sage-300 transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    forum
                  </span>
                </div>
                <p className="flex-1 text-left text-[14px] font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-sage-700 transition-colors">
                  Feedback
                </p>
                <span className="material-symbols-outlined text-zinc-400 text-[18px]">
                  {feedbackExpanded ? "expand_less" : "expand_more"}
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${feedbackExpanded ? "max-h-96 opacity-100 pb-2" : "max-h-0 opacity-0"}`}
              >
                <div className="rounded-xl border border-sage-100 bg-sage-50 p-3">
                  <p className="text-[11px] text-zinc-600">
                    Wie zufrieden bist du?
                  </p>
                  <div className="mt-2 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="p-1"
                        aria-label={`${star} Sterne`}
                        onClick={() => setFeedbackRating(star)}
                      >
                        <span
                          className={`material-symbols-outlined text-[24px] ${feedbackRating && star <= feedbackRating ? "text-amber-400" : "text-zinc-300"}`}
                        >
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={feedbackMessage}
                    onChange={(event) => setFeedbackMessage(event.target.value)}
                    placeholder="Hast du Anmerkungen oder Verbesserungsvorschläge?"
                    className="mt-2 w-full rounded-lg border border-sage-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-sage-400"
                  />
                  <button
                    type="button"
                    className="mt-3 w-full rounded-lg bg-sage-700 px-3 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={feedbackLoading || !feedbackRating}
                    onClick={() => {
                      void handleFeedbackSubmit();
                    }}
                  >
                    {feedbackLoading ? "Wird gesendet…" : "Feedback senden"}
                  </button>
                </div>
              </div>
              <button
                className="flex items-center gap-3 py-3 group"
                type="button"
                onClick={handleContactToggle}
                aria-expanded={contactExpanded}
              >
                <div className="text-zinc-400 group-hover:text-sage-300 transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">
                    mail
                  </span>
                </div>
                <p className="flex-1 text-left text-[14px] font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-sage-700 transition-colors">
                  Kontakt
                </p>
                <span className="material-symbols-outlined text-zinc-400 text-[18px]">
                  {contactExpanded ? "expand_less" : "expand_more"}
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${contactExpanded ? "max-h-56 opacity-100 pb-2" : "max-h-0 opacity-0"}`}
              >
                <div className="rounded-xl border border-sage-100 bg-sage-50 p-3">
                  {contactLoading ? (
                    <p className="text-center text-[12px] text-zinc-600">
                      Lade Kontakt…
                    </p>
                  ) : null}
                  {!contactLoading && contactEmail ? (
                    <a
                      className="block text-center text-[13px] font-semibold text-sage-800 underline underline-offset-2"
                      href={`mailto:${contactEmail}`}
                    >
                      {contactEmail}
                    </a>
                  ) : null}
                </div>
              </div>
              {isUser ? (
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
              ) : null}
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
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-zinc-800/20 rounded-full z-[60]" />
      </div>
    </div>
  );
}
