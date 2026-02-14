const rawBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim();
const base = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

export function apiPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}
