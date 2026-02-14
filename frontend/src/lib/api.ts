const rawBase = (import.meta.env.VITE_API_BASE_URL ?? "").trim();

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  );
}

function normalizeBase(value: string): string {
  if (!value || value === "/") return "";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function resolveApiBase(value: string): string {
  if (!value) return "";

  // Relative base: keep same-origin requests.
  if (value.startsWith("/")) {
    return normalizeBase(value);
  }

  // Absolute base: protect production from accidentally baked-in localhost URLs.
  try {
    const configured = new URL(value);
    const configuredPath = normalizeBase(configured.pathname);
    const runtimeHost =
      typeof window !== "undefined" ? window.location.hostname : "localhost";

    if (isLocalHost(configured.hostname) && !isLocalHost(runtimeHost)) {
      // Keep path part (e.g. /api) but force current origin.
      return configuredPath;
    }

    return normalizeBase(`${configured.origin}${configured.pathname}`);
  } catch {
    return normalizeBase(value);
  }
}

const base = resolveApiBase(rawBase);

export function apiPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
