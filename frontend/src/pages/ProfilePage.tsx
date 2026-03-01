import { useRef, useState } from "react";
import { toast } from "sonner";
import { HealthCheck, Identity } from "../types";
import genericSurface from "../../assets/generic.webp";
import {
  ImagePickSource,
  ImageSourceDialog,
} from "../components/ImageSourceDialog";
import { profileImageUrl, uploadProfileImage } from "../services/imageService";
import {
  buttonGhost,
  buttonPrimary,
  cardMinimal,
  eyebrow,
  muted,
  pill,
  pillSuccess,
  stack,
  stackSm,
} from "../ui";

type ProfilePageProps = {
  identity: Identity;
  authLoading: boolean;
  authEnabled: boolean;
  health: HealthCheck | null;
  onLogin: () => void;
  onLogout: () => void;
};

export function ProfilePage({
  identity,
  authLoading,
  authEnabled,
  health,
  onLogin,
  onLogout,
}: ProfilePageProps) {
  const isOnline = health?.status === "ok";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageVersion, setImageVersion] = useState<number>(Date.now());
  const [imageFallback, setImageFallback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentImageUrl =
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

  const onSelectSource = (source: ImagePickSource) => {
    setPickerOpen(false);
    if (identity.kind !== "user") {
      toast.info("Bitte zuerst einloggen, um ein Profilbild hochzuladen.");
      return;
    }
    openFilePicker(source);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (identity.kind !== "user") return;

    try {
      setUploading(true);
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
      setUploading(false);
    }
  };

  return (
    <div className={stack}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />
      <ImageSourceDialog
        open={pickerOpen}
        title="Profilbild ändern"
        description="Wähle, ob du ein Foto aufnehmen oder ein Bild auswählen möchtest."
        onClose={() => setPickerOpen(false)}
        onSelect={onSelectSource}
      />

      {!authEnabled && (
        <section className={cardMinimal}>
          <p className={eyebrow}>Login</p>
          <p className={muted}>
            OAuth Proxy ist nicht konfiguriert. Stelle die Umgebungsvariablen
            bereit, um die Anmeldung zu aktivieren.
          </p>
        </section>
      )}

      <section className={cardMinimal}>
        <div className="mb-2 flex items-start justify-between gap-3">
          <p className={eyebrow}>Profil</p>
          <button
            type="button"
            className="text-xs font-semibold text-sage-600 transition hover:text-sage-900 disabled:opacity-60"
            onClick={() => setPickerOpen(true)}
            disabled={uploading}
          >
            Profilbild ändern
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-slate-900">
            {identity.displayName}
          </h2>
          <p className={muted}>
            {identity.kind === "user"
              ? "Angemeldet via OAuth"
              : "Lokaler Modus ohne Login"}
          </p>
          <img
            src={imageFallback ? genericSurface : currentImageUrl}
            alt="Profilbild"
            className="hidden"
            onError={() => setImageFallback(true)}
          />
          <div className="flex flex-wrap gap-2">
            {identity.kind === "user" ? (
              <button
                type="button"
                className={buttonGhost}
                onClick={onLogout}
                disabled={authLoading}
              >
                Logout
              </button>
            ) : (
              <button
                type="button"
                className={buttonPrimary}
                onClick={onLogin}
                disabled={!authEnabled}
              >
                Login / Signup
              </button>
            )}
          </div>

          <div className="mt-2 text-sm text-slate-700">
            {identity.kind === "user" ? (
              <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className={pillSuccess}>Eingeloggt</div>
                  <p className="font-semibold text-slate-900">
                    Deine Gruppen sind gesichert.
                  </p>
                </div>
                <p className={muted}>
                  Gruppen und Verfügbarkeiten werden geräteübergreifend
                  gespeichert und gehen nicht verloren, wenn du den Cache
                  leerst.
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm">
                  <div className={pill}>Gastmodus</div>
                  <p className="font-semibold text-slate-900">
                    Schnellstart ohne Konto
                  </p>
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                    aria-label="Mehr Infos zum Gastmodus"
                  >
                    i
                  </button>
                  <div className="absolute left-0 top-full z-20 mt-2 hidden w-80 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-lg group-hover:block group-focus-within:block">
                    <p className="font-semibold text-slate-900">
                      Du bist als Akteur unterwegs.
                    </p>
                    <p className="mt-1 text-sm">
                      Daten liegen nur lokal im Browser. Cache leeren, Inkognito
                      schließen oder Gerätewechsel kann deine Gruppen und
                      Verfügbarkeiten löschen.
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      <li>Starte sofort ohne Registrierung.</li>
                      <li>Login sichert alles geräteübergreifend.</li>
                      <li>Empfohlen, wenn du auf mehreren Geräten planst.</li>
                    </ul>
                    <div className="mt-3">
                      <button
                        type="button"
                        className={buttonPrimary}
                        onClick={onLogin}
                        disabled={!authEnabled}
                      >
                        Jetzt einloggen
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={cardMinimal}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={eyebrow}>Entwicklung</p>
            <h3 className="text-lg font-semibold text-slate-900">Tools</h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
            <span>{isOnline ? "Backend OK" : "Backend Fehler"}</span>
          </div>
        </div>
        <div className={stackSm}>
          {authEnabled ? (
            <div className={pillSuccess}>OAuth Proxy aktiv</div>
          ) : (
            <p className={muted}>OAuth Proxy nicht konfiguriert</p>
          )}
        </div>
      </section>
    </div>
  );
}
