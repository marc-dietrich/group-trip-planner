import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "sonner";

const toastShell =
  "rounded-3xl border border-slate-800/80 bg-slate-950/95 px-4 py-3 text-sage-50 shadow-pop backdrop-blur-md";
const toastDescription = "text-sage-200/85 text-sm font-medium";
const toastActionButton =
  "rounded-2xl border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15";
const toastCancelButton =
  "rounded-2xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/5";
const toastCloseButton = "text-white/70 transition hover:text-white";
const toastToneOverride = "!bg-slate-950/95 !text-sage-50";

// Defensive: ensure a fallback exists for the shared muted class even if a module fails to load during HMR.
if (typeof window !== "undefined" && !(window as any).muted) {
  (window as any).muted = "text-sm text-slate-600";
}

// If 404.html redirected us with the original path in ?redirect=..., restore it
// before the router mounts to avoid refresh loops on GitHub Pages.
(() => {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (!redirect) return;
  // Preserve absolute paths; ensure leading slash.
  const target = redirect.startsWith("/") ? redirect : "/" + redirect;
  window.history.replaceState({}, "", target);
})();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      closeButton
      toastOptions={{
        className: toastShell,
        descriptionClassName: toastDescription,
        classNames: {
          actionButton: toastActionButton,
          cancelButton: toastCancelButton,
          closeButton: toastCloseButton,
          success: toastToneOverride,
          error: toastToneOverride,
          info: toastToneOverride,
          warning: toastToneOverride,
          loading: toastToneOverride,
          default: toastToneOverride,
        },
      }}
    />
  </React.StrictMode>,
);
