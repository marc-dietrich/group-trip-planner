import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type LayoutMode = "desktop" | "mobile";

const LayoutContext = createContext<LayoutMode>("mobile");

function detectLayout(): LayoutMode {
  if (typeof window === "undefined") return "mobile";
  const media = window.matchMedia("(min-width: 1024px)");
  return media.matches ? "desktop" : "mobile";
}

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<LayoutMode>(() => detectLayout());

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setMode(media.matches ? "desktop" : "mobile");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const value = useMemo(() => mode, [mode]);

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayoutMode() {
  return useContext(LayoutContext);
}
