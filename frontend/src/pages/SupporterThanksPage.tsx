import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { profileImageUrl } from "../services/imageService";
import genericSurface from "../../assets/generic.webp";

function getInitials(value: string) {
  const cleaned = (value || "").trim();
  if (!cleaned) return "M";
  return cleaned[0]?.toUpperCase() || "M";
}

export function SupporterThanksPage() {
  const [searchParams] = useSearchParams();
  const [avatarFailed, setAvatarFailed] = useState(false);

  const actorName = useMemo(() => {
    const raw = searchParams.get("actor_name")?.trim();
    if (raw) return raw.slice(0, 60);
    return "";
  }, [searchParams]);

  const avatarSrc = useMemo(() => {
    const avatarUrl = searchParams.get("avatar_url")?.trim();
    if (avatarUrl) return avatarUrl;

    const userId = searchParams.get("user_id")?.trim();
    if (!userId) return null;
    return profileImageUrl(userId);
  }, [searchParams]);

  const showAvatarImage = Boolean(avatarSrc && !avatarFailed);

  return (
    <main className="min-h-[100svh] bg-cream px-4 pt-10 pb-8 text-slate-900">
      <section className="mx-auto flex min-h-[100svh] w-full max-w-[520px] flex-col items-center">
        <div className="relative mt-10 h-[140px] w-[140px] rounded-full border border-sage-100 bg-sage-50 shadow-soft">
          <img
            src={showAvatarImage ? avatarSrc! : genericSurface}
            alt="Profilbild"
            className="absolute inset-0 h-full w-full rounded-full object-cover"
            onError={() => setAvatarFailed(true)}
          />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 via-transparent to-sage-900/15" />
          <span className="absolute inset-0 z-[1] grid place-items-center text-[28px] font-semibold text-sage-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)]">
            {getInitials(actorName)}
          </span>
          <span
            className="supporter-confetti confetti-1 absolute right-5 top-5 z-[9] h-2 w-2 rounded-full bg-amber-400"
            aria-hidden="true"
          />
          <span
            className="supporter-confetti confetti-2 absolute right-5 top-5 z-[9] h-1.5 w-1.5 rounded-full bg-sage-500"
            aria-hidden="true"
          />
          <span
            className="supporter-confetti confetti-3 absolute right-5 top-5 z-[9] h-2 w-1 rounded-sm bg-brand-primary"
            aria-hidden="true"
          />
          <span
            className="supporter-confetti confetti-4 absolute right-5 top-5 z-[9] h-1.5 w-1.5 rounded-full bg-amber-300"
            aria-hidden="true"
          />
          <span
            className="supporter-confetti confetti-5 absolute right-5 top-5 z-[9] h-2 w-1 rounded-sm bg-sage-400"
            aria-hidden="true"
          />
          <span
            className="supporter-confetti confetti-6 absolute right-5 top-5 z-[9] h-1.5 w-1.5 rounded-full bg-brand-primary"
            aria-hidden="true"
          />
          <span
            className="supporter-crown absolute right-0 top-0 z-10 grid h-10 w-10 place-items-center rounded-full border border-sage-100 bg-white shadow-soft"
            aria-hidden="true"
          >
            <span className="material-symbols-outlined text-[18px] text-amber-400">
              crown
            </span>
          </span>
        </div>

        <h1 className="mt-12 text-center text-[36px] font-semibold leading-[1.05] tracking-tight text-slate-900">
          Vielen Dank für deine
          <br />
          Unterstützung!
        </h1>

        <div className="mt-4 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-sage-100 px-3 py-1 text-sm font-semibold text-sage-600">
            <span className="material-symbols-outlined text-[16px]">
              verified
            </span>
            Badge aktiv
          </span>
        </div>

        <Link
          to="/groups"
          className="mt-auto inline-flex h-12 w-full items-center justify-center rounded-xl bg-sage-600 px-5 text-base font-semibold text-white transition hover:bg-sage-500"
        >
          Zurück zum Dashboard
        </Link>
      </section>

      <style>{`
        @keyframes supporter-crown-flight {
          0% { transform: translate(150px, -170px) scale(0.72) rotate(18deg); opacity: 0; }
          70% { transform: translate(8px, -10px) scale(1.04) rotate(-3deg); opacity: 1; }
          100% { transform: translate(8px, -10px) scale(1) rotate(0deg); opacity: 1; }
        }

        @keyframes supporter-crown-click {
          0% { transform: translate(8px, -10px) scale(1); }
          45% { transform: translate(8px, -10px) scale(0.86); }
          100% { transform: translate(8px, -10px) scale(1); }
        }

        .supporter-crown {
          animation:
            supporter-crown-flight 2200ms cubic-bezier(.22,.8,.2,1) 200ms forwards,
            supporter-crown-click 260ms ease-out 2400ms forwards;
        }

        @keyframes supporter-confetti-burst-1 {
          0% { transform: translate(0, 0) scale(0.55) rotate(0deg); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translate(-48px, -42px) scale(1) rotate(-28deg); opacity: 0; }
        }

        @keyframes supporter-confetti-burst-2 {
          0% { transform: translate(0, 0) scale(0.55) rotate(0deg); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translate(-26px, -58px) scale(1) rotate(36deg); opacity: 0; }
        }

        @keyframes supporter-confetti-burst-3 {
          0% { transform: translate(0, 0) scale(0.55) rotate(0deg); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translate(-8px, -52px) scale(1) rotate(52deg); opacity: 0; }
        }

        @keyframes supporter-confetti-burst-4 {
          0% { transform: translate(0, 0) scale(0.55) rotate(0deg); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translate(16px, -40px) scale(1) rotate(-20deg); opacity: 0; }
        }

        @keyframes supporter-confetti-burst-5 {
          0% { transform: translate(0, 0) scale(0.55) rotate(0deg); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translate(20px, -22px) scale(1) rotate(44deg); opacity: 0; }
        }

        @keyframes supporter-confetti-burst-6 {
          0% { transform: translate(0, 0) scale(0.55) rotate(0deg); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translate(-40px, -16px) scale(1) rotate(24deg); opacity: 0; }
        }

        .supporter-confetti {
          opacity: 0;
          animation-duration: 760ms;
          animation-delay: 2460ms;
          animation-fill-mode: forwards;
          animation-timing-function: ease-out;
        }

        .supporter-confetti.confetti-1 { animation-name: supporter-confetti-burst-1; }
        .supporter-confetti.confetti-2 { animation-name: supporter-confetti-burst-2; }
        .supporter-confetti.confetti-3 { animation-name: supporter-confetti-burst-3; }
        .supporter-confetti.confetti-4 { animation-name: supporter-confetti-burst-4; }
        .supporter-confetti.confetti-5 { animation-name: supporter-confetti-burst-5; }
        .supporter-confetti.confetti-6 { animation-name: supporter-confetti-burst-6; }
      `}</style>
    </main>
  );
}
