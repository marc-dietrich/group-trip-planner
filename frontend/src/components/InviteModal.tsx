import { GroupInvitePreview } from "../types";
import {
  buttonGhostSmall,
  buttonPrimary,
  buttonRow,
  cardHeaderSubtle,
  eyebrow,
  modalCard,
  modalOverlay,
  muted,
  pillDanger,
  pillSuccess,
  stackSm,
} from "../ui";

export type InviteModalProps = {
  open: boolean;
  loading: boolean;
  invite: GroupInvitePreview | null;
  error: string | null;
  joining: boolean;
  alreadyMember: boolean;
  requireLogin: boolean;
  onJoin: () => void;
  onClose: () => void;
  onLogin: () => void;
};

export function InviteModal({
  open,
  loading,
  invite,
  error,
  joining,
  alreadyMember,
  requireLogin,
  onJoin,
  onClose,
  onLogin,
}: InviteModalProps) {
  if (!open) return null;

  return (
    <div className={modalOverlay} role="dialog" aria-modal="true">
      <div className={modalCard}>
        <div className={cardHeaderSubtle}>
          <div>
            <p className={eyebrow}>Einladung</p>
            <h3 className="text-lg font-semibold text-slate-900">
              Gruppe beitreten?
            </h3>
          </div>
          <button type="button" className={buttonGhostSmall} onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className={stackSm}>
          {loading ? (
            <p className={muted}>Einladung wird geladen...</p>
          ) : error ? (
            <div className={pillDanger}>{error}</div>
          ) : invite ? (
            <>
              <p>
                Du wurdest eingeladen, der Gruppe
                <span className="font-semibold"> {invite.name} </span>
                beizutreten.
              </p>
              {alreadyMember && (
                <div className={pillSuccess}>Du bist bereits Mitglied.</div>
              )}
              {requireLogin && !alreadyMember && (
                <p className={muted}>Bitte logge dich ein, um beizutreten.</p>
              )}
            </>
          ) : null}

          <div className={buttonRow}>
            <button
              type="button"
              className={buttonPrimary}
              onClick={requireLogin ? onLogin : onJoin}
              disabled={loading || joining || !!error || alreadyMember}
            >
              {requireLogin
                ? "Jetzt einloggen"
                : joining
                ? "Tritt bei..."
                : alreadyMember
                ? "Schon drin"
                : "Beitreten"}
            </button>
            <button
              type="button"
              className={buttonGhostSmall}
              onClick={onClose}
            >
              Nein, danke
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
