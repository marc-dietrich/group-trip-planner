import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "sonner";

// Defensive: ensure a fallback exists for the shared muted class even if a module fails to load during HMR.
if (typeof window !== "undefined" && !(window as any).muted) {
  (window as any).muted = "text-sm text-slate-600";
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster position="top-right" richColors closeButton />
  </React.StrictMode>
);
