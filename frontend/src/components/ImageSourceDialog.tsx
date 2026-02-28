import { buttonGhost, buttonPrimary, modalCard, modalOverlay } from "../ui";

export type ImagePickSource = "camera" | "gallery" | "documents";

type ImageSourceDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onSelect: (source: ImagePickSource) => void;
  onDelete?: () => void;
  deleteLabel?: string;
  deleteDisabled?: boolean;
};

export function ImageSourceDialog({
  open,
  title,
  description,
  onClose,
  onSelect,
  onDelete,
  deleteLabel = "Bild löschen",
  deleteDisabled = false,
}: ImageSourceDialogProps) {
  if (!open) return null;

  return (
    <div className={`${modalOverlay} !z-[80]`} role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Dialog schließen"
        onClick={onClose}
      />
      <div className={`${modalCard} relative max-w-md`}>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-sage-900">{title}</h3>
          {description ? (
            <p className="text-sm text-sage-600">{description}</p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            className={buttonPrimary}
            onClick={() => onSelect("camera")}
          >
            Foto aufnehmen
          </button>
          <button
            type="button"
            className={buttonGhost}
            onClick={() => onSelect("gallery")}
          >
            Aus Galerie wählen
          </button>
          <button
            type="button"
            className={buttonGhost}
            onClick={() => onSelect("documents")}
          >
            Aus Dokumenten wählen
          </button>
          {onDelete ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-500 bg-slate-600 px-3.5 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-500 disabled:opacity-60"
              onClick={onDelete}
              disabled={deleteDisabled}
            >
              {deleteLabel}
            </button>
          ) : null}
        </div>

        <button
          type="button"
          className="mt-4 text-sm font-semibold text-sage-600 transition hover:text-sage-900"
          onClick={onClose}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
