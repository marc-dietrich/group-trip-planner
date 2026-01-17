export const pageShell =
  "mx-auto max-w-[520px] px-5 pb-24 pt-6 sm:px-6 lg:px-0";
export const layoutGrid = "grid grid-cols-1 items-start gap-6 lg:grid-cols-2";

export const card =
  "rounded-3xl border border-sage-100 bg-white/90 p-6 shadow-soft backdrop-blur-sm sm:p-7";
export const cardMinimal =
  "rounded-2xl border border-sage-100 bg-white/90 p-5 shadow-soft";
export const cardMuted = `${card} border-dashed bg-brand-soft/70`;
export const cardHeader = "mb-4 flex items-center justify-between gap-3";
export const cardHeaderSubtle = "mb-3 flex items-center justify-between gap-3";

export const stack = "flex flex-col gap-5";
export const stackSm = "flex flex-col gap-3.5";
export const stackXs = "flex flex-col gap-2.5";

export const field = "flex flex-col gap-1.5 text-sm";
export const input =
  "w-full rounded-2xl border border-sage-200 bg-white/80 px-3.5 py-2.5 text-base text-sage-900 shadow-none outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30 disabled:opacity-60";
export const select = `${input} pr-10`;

const buttonBase =
  "inline-flex items-center justify-center rounded-2xl text-sm font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
export const buttonPrimary =
  `${buttonBase} bg-brand-primary px-5 py-2.5 text-white shadow-pop hover:-translate-y-0.5 hover:bg-sage-600 disabled:shadow-none disabled:transform-none`;
export const buttonGhost =
  `${buttonBase} border border-sage-200 bg-white px-3.5 py-2 text-brand-contrast hover:bg-sage-50`;
export const buttonGhostSmall = `${buttonGhost} px-3 py-2 text-xs font-semibold`;
export const buttonGhostTiny = `${buttonGhost} px-2.5 py-1.5 text-xs font-semibold`;
export const buttonGhostDanger = `${buttonGhost} border-rose-200 text-rose-700 hover:bg-rose-50`;

export const buttonRow = "flex flex-wrap gap-2.5";

export const pill =
  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold";
export const pillSuccess = `${pill} border border-emerald-200 bg-emerald-50 text-emerald-700`;
export const pillDanger = `${pill} border border-rose-200 bg-rose-50 text-rose-700`;
export const pillWarning = `${pill} border border-amber-200 bg-amber-50 text-amber-700`;
export const pillNeutral = `${pill} border border-sage-200 bg-sage-50 text-sage-700`;

export const resultBox =
  "flex flex-col gap-2 rounded-2xl border border-sage-100 bg-sage-50/70 p-4";
export const metaRow =
  "flex flex-wrap items-center justify-between gap-2 text-sm text-sage-600";
export const mono =
  "rounded-md bg-sage-900 px-2 py-1 font-mono text-sm text-sage-50 break-all";
export const muted = "text-sm text-sage-600";
export const smallMuted = "text-xs text-sage-600";

export const modalOverlay =
  "fixed inset-0 z-20 flex items-center justify-center bg-black/35 p-4 backdrop-blur-md";
export const modalCard =
  "w-full max-w-lg rounded-[28px] border border-sage-100 bg-white/95 p-6 shadow-modal sm:p-7 max-h-[90vh] overflow-hidden flex flex-col";

export const identityShell =
  "mx-auto mb-4 flex max-w-3xl items-center gap-4 rounded-3xl border border-sage-100 bg-white/90 p-5 shadow-card";
export const identityIcon =
  "grid h-12 w-12 place-items-center rounded-2xl bg-sage-100 text-2xl text-sage-800";
export const identityLine = "text-lg font-semibold text-sage-900";
export const eyebrow = "text-[10px] uppercase tracking-[0.18em] text-sage-500";
export const mutedCard = `${card} bg-sage-50/80`;
