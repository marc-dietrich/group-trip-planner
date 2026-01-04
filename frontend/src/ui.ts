export const pageShell = "mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 lg:px-8";
export const layoutGrid = "grid grid-cols-1 items-start gap-6 lg:grid-cols-2";

export const card = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
export const cardMinimal = "rounded-lg border border-slate-200 bg-white p-5 sm:p-6";
export const cardMuted = `${card} border-dashed`;
export const cardHeader = "mb-3 flex items-center justify-between gap-3";
export const cardHeaderSubtle = "mb-2 flex items-center justify-between gap-3";

export const stack = "flex flex-col gap-4";
export const stackSm = "flex flex-col gap-3";
export const stackXs = "flex flex-col gap-2";

export const field = "flex flex-col gap-1.5 text-sm";
export const input =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 shadow-none outline-none transition focus:border-transparent focus:ring-2 focus:ring-slate-400 disabled:opacity-60";
export const select = `${input} pr-10`;

const buttonBase =
  "inline-flex items-center justify-center rounded-md text-sm font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white";
export const buttonPrimary =
  `${buttonBase} bg-slate-900 px-4 py-2.5 text-white shadow-sm hover:-translate-y-0.5 hover:bg-slate-800 disabled:shadow-none disabled:transform-none`;
export const buttonGhost =
  `${buttonBase} border border-slate-200 bg-white px-3 py-2 text-slate-900 hover:bg-slate-50`;
export const buttonGhostSmall = `${buttonGhost} px-3 py-2 text-xs font-semibold`;
export const buttonGhostTiny = `${buttonGhost} px-2.5 py-1.5 text-xs font-semibold`;
export const buttonGhostDanger = `${buttonGhost} border-rose-200 text-rose-700 hover:bg-rose-50`;

export const buttonRow = "flex flex-wrap gap-2";

export const pill =
  "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold";
export const pillSuccess = `${pill} border border-green-200 bg-green-50 text-green-700`;
export const pillDanger = `${pill} border border-rose-200 bg-rose-50 text-rose-700`;
export const pillWarning = `${pill} border border-amber-200 bg-amber-50 text-amber-700`;
export const pillNeutral = `${pill} border border-slate-200 bg-slate-100 text-slate-700`;

export const resultBox =
  "flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3";
export const metaRow =
  "flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600";
export const mono =
  "rounded-md bg-slate-900 px-2 py-1 font-mono text-sm text-slate-200 break-all";
export const muted = "text-sm text-slate-600";
export const smallMuted = "text-xs text-slate-600";

export const modalOverlay =
  "fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm";
export const modalCard =
  "w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-md sm:p-5 max-h-[90vh] overflow-hidden flex flex-col";

export const identityShell =
  "mx-auto mb-4 flex max-w-3xl items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card";
export const identityIcon =
  "grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-2xl";
export const identityLine = "text-lg font-semibold text-slate-900";
export const eyebrow = "text-xs uppercase tracking-[0.16em] text-slate-600";
export const mutedCard = `${card} bg-slate-50`;
