/** Прямой URL API (без префикса /api). */
const DEFAULT_API = 'http://127.0.0.1:3001';
const SESSION_KEY = 'agentyoshka_session';

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

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string | null) {
  try {
    if (token) localStorage.setItem(SESSION_KEY, token);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode */
  }
}

/** fetch с Bearer-сессией. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getSessionToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(apiUrl(path), { ...init, headers });
}

/** Гостевая сессия на устройство — свой агент, не общий demo. */
export async function ensureGuestSession(): Promise<{
  token: string;
  isGuest: boolean;
  handle: string | null;
}> {
  const existing = getSessionToken();
  if (existing) {
    const me = await apiFetch('/auth/me');
    if (me.ok) {
      const json = (await me.json()) as {
        auth?: { isGuest?: boolean; handle?: string | null };
      };
      return {
        token: existing,
        isGuest: Boolean(json.auth?.isGuest ?? true),
        handle: json.auth?.handle ?? null,
      };
    }
    setSessionToken(null);
  }

  const res = await apiFetch('/auth/guest', { method: 'POST', body: '{}' });
  const json = (await res.json()) as {
    ok?: boolean;
    token?: string;
    auth?: { isGuest?: boolean; handle?: string | null };
    error?: string;
  };
  if (!res.ok || !json.token) {
    throw new Error(json.error ?? 'Не удалось создать гостя');
  }
  setSessionToken(json.token);
  return {
    token: json.token,
    isGuest: Boolean(json.auth?.isGuest ?? true),
    handle: json.auth?.handle ?? null,
  };
}
