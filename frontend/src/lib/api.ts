const rawBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const sanitizedEnvBase = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

const localhostHosts = new Set(['localhost', '127.0.0.1']);

function shouldFallbackToWindowOrigin(base: string): boolean {
  if (typeof window === 'undefined') {
    return !base;
  }

  if (!base) {
    return true;
  }

  try {
    const candidate = new URL(base, window.location.origin);
    const envHostIsLocal = localhostHosts.has(candidate.hostname);
    const windowHostIsLocal = localhostHosts.has(window.location.hostname);
    // When the bundle was built with a localhost API base but runs on a public domain,
    // prefer the current origin so calls go through the reverse proxy.
    return envHostIsLocal && !windowHostIsLocal;
  } catch {
    return true;
  }
}

const runtimeFallbackBase = '';

const base = shouldFallbackToWindowOrigin(sanitizedEnvBase)
  ? runtimeFallbackBase
  : sanitizedEnvBase;

export function apiPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;

  if (base.endsWith('/api') && normalized.startsWith('/api/')) {
    return `${base}${normalized.slice('/api'.length)}`;
  }

  return `${base}${normalized}`;
}
