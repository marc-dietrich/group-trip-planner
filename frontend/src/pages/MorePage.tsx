import { buttonPrimary, cardMinimal, eyebrow, muted, stackSm } from "../ui";

type MorePageProps = {
  onTestVoice: () => void;
};

export function MorePage({ onTestVoice }: MorePageProps) {
  return (
    <section className={cardMinimal}>
      <p className={eyebrow}>Mehr</p>
      <h2 className="text-xl font-semibold text-slate-900">Extras</h2>
      <div className={stackSm}>
        <p className={muted}>Debug-/Mock-Aktionen für interne Tests.</p>
        <button type="button" className={buttonPrimary} onClick={onTestVoice}>
          Speech-to-Text Mock auslösen
        </button>
      </div>
    </section>
  );
}
