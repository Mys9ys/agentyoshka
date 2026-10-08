/** Прямой URL API (без префикса /api). */
const DEFAULT_API = 'http://127.0.0.1:3001';

function normalizeBase(raw: string): string {
  return raw.replace(/\/$/, '');
}

/**
 * URL для Fastify: в dev через Vite-proxy `/api`, на OSPanel — `/api` (nginx) или прямой порт.
 */
export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const configured = import.meta.env.VITE_API_URL?.trim();

  if (configured) {
    const base = normalizeBase(configured);
    if (base === '/api' || base.endsWith('/api')) {
      return `${base}${p}`;
    }
    return `${base}${p}`;
  }

  if (import.meta.env.DEV) {
    return `/api${p}`;
  }

  return `${DEFAULT_API}${p}`;
}
