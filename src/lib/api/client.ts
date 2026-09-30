/**
 * API Client — talks to the Turso-backed Hono server in `server/`.
 *
 * Responses are normalised so the rest of the UI can keep using the familiar
 * record shape (`_id`, `_creationTime`) instead of the raw SQLite column names
 * (`id`, `createdAt`). JSON-text columns (`sizes`, `colors`, `variants`,
 * `sizePricing`) are parsed into arrays so components never have to.
 *
 * Usage:
 *   import api from '#/lib/api/client'
 *   const { stores } = await api.get('/api/stores')
 *   const { store } = await api.post('/api/stores', { name, ... })
 */

export const API_URL = ((import.meta as any).env?.VITE_API_URL ?? '').replace(/\/+$/, '');

// ─── Auth token storage ────────────────────────────────────────────────────

const TOKEN_KEY = 'auth_token';

function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof localStorage === 'undefined') return;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredToken(): string | null {
  return getToken();
}

// ─── Response normalisation ────────────────────────────────────────────────

/** Columns stored as JSON text that should be parsed into arrays/objects. */
const JSON_COLUMNS = new Set(['sizes', 'colors', 'variants', 'sizePricing']);

function parseJsonColumn(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/**
 * Recursively converts server rows into UI records:
 *   `id`        → `_id`
 *   `createdAt` → `_creationTime`
 */
export function normalizeResponse<T = any>(value: any): T {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeResponse(item)) as unknown as T;
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, any> = {};

    for (const [key, raw] of Object.entries(value)) {
      out[key] = JSON_COLUMNS.has(key) ? parseJsonColumn(raw) : normalizeResponse(raw);
    }

    if (out._id === undefined && typeof out.id === 'string') {
      out._id = out.id;
    }
    if (out._creationTime === undefined) {
      if (typeof out.createdAt === 'number') {
        out._creationTime = out.createdAt;
      } else if (typeof out.updatedAt === 'number') {
        out._creationTime = out.updatedAt;
      }
    }

    return out as T;
  }

  return value as T;
}

/**
 * Collection endpoints answer with a single-key wrapper, e.g. `{ stores: [...] }`.
 * Unwrap those so callers receive a plain array. Detail endpoints answer with a
 * single-key object (`{ store: {...} }`) and are left untouched.
 */
function unwrapCollection(value: any): any {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length === 1 && Array.isArray((value as any)[keys[0]])) {
      return (value as any)[keys[0]];
    }
  }
  return value;
}

// ─── Request helper ────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(errorData.error || `HTTP ${res.status}`, res.status);
  }

  if (res.status === 204) return undefined as T;

  return unwrapCollection(normalizeResponse<T>(await res.json()));
}

const api = {
  get: <T = any>(path: string) => request<T>('GET', path),
  post: <T = any>(path: string, body?: any) => request<T>('POST', path, body),
  patch: <T = any>(path: string, body?: any) => request<T>('PATCH', path, body),
  delete: <T = any>(path: string) => request<T>('DELETE', path),
};

export default api;