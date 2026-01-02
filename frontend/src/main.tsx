import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "sonner";

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
    <Toaster position="top-right" richColors closeButton />
  </React.StrictMode>
);
