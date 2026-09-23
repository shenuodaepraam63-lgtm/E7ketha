/**
 * Lazy Supabase client — @supabase/supabase-js (~200KB) is NOT on the homepage critical path.
 * Loaded only when auth is needed (login, admin, session cookie present).
 */
import type { SupabaseClient, SupportedStorage } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && publishableKey);

/** True if browser likely has an auth session (no SDK load). */
export function hasAuthHint(): boolean {
  if (typeof document === 'undefined') return false;
  const c = document.cookie || '';
  if (c.includes('sb-') || c.includes('auth-token')) return true;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('sb-') || k.includes('auth-token'))) return true;
    }
  } catch {
    /* private mode */
  }
  return false;
}

function cookieDomain(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return '';
  if (host === 'e7ketha.com' || host.endsWith('.e7ketha.com')) return '.e7ketha.com';
  return '';
}

const CHUNK_SIZE = 3180;

function writeCookie(name: string, value: string, maxAgeSec: number) {
  if (typeof document === 'undefined') return;
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${Math.max(0, maxAgeSec)}`,
    'SameSite=Lax',
  ];
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    parts.push('Secure');
  }
  const domain = cookieDomain();
  if (domain) parts.push(`Domain=${domain}`);
  document.cookie = parts.join('; ');
}

function readCookies(): Record<string, string> {
  if (typeof document === 'undefined') return {};
  const out: Record<string, string> = {};
  for (const part of document.cookie.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function eraseCookie(name: string) {
  writeCookie(name, '', 0);
}

function createSharedCookieStorage(): SupportedStorage {
  return {
    getItem(key: string) {
      const all = readCookies();
      if (all[key]) return all[key];
      const count = Number(all[`${key}.chunks`] || 0);
      if (!count) return null;
      let value = '';
      for (let i = 0; i < count; i++) {
        const piece = all[`${key}.${i}`];
        if (piece == null) return null;
        value += piece;
      }
      return value;
    },
    setItem(key: string, value: string) {
      eraseCookie(key);
      const prevChunks = Number(readCookies()[`${key}.chunks`] || 0);
      for (let i = 0; i < Math.max(prevChunks, 20); i++) eraseCookie(`${key}.${i}`);
      eraseCookie(`${key}.chunks`);
      if (value.length <= CHUNK_SIZE) {
        writeCookie(key, value, 60 * 60 * 24 * 400);
        return;
      }
      const chunks = Math.ceil(value.length / CHUNK_SIZE);
      writeCookie(`${key}.chunks`, String(chunks), 60 * 60 * 24 * 400);
      for (let i = 0; i < chunks; i++) {
        writeCookie(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), 60 * 60 * 24 * 400);
      }
    },
    removeItem(key: string) {
      eraseCookie(key);
      const count = Number(readCookies()[`${key}.chunks`] || 0);
      for (let i = 0; i < Math.max(count, 20); i++) eraseCookie(`${key}.${i}`);
      eraseCookie(`${key}.chunks`);
    },
  };
}

function migrateLocalStorageToCookies(storage: SupportedStorage) {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('sb-') || k.includes('auth-token'))) keys.push(k);
    }
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (!value) continue;
      if (!storage.getItem(key)) storage.setItem(key, value);
    }
  } catch {
    /* ignore */
  }
}

function createAuthStorage(): SupportedStorage | undefined {
  if (typeof window === 'undefined') return undefined;
  const cookieStorage = createSharedCookieStorage();
  migrateLocalStorageToCookies(cookieStorage);
  return {
    getItem(key: string) {
      if (key.includes('code-verifier')) {
        try {
          const fromLs = localStorage.getItem(key);
          if (fromLs) return fromLs;
        } catch {
          /* private mode */
        }
      }
      return cookieStorage.getItem(key);
    },
    setItem(key: string, value: string) {
      if (key.includes('code-verifier')) {
        try {
          localStorage.setItem(key, value);
        } catch {
          /* ignore */
        }
      }
      cookieStorage.setItem(key, value);
    },
    removeItem(key: string) {
      if (key.includes('code-verifier')) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
      }
      cookieStorage.removeItem(key);
    },
  };
}

let client: SupabaseClient | null = null;
let loading: Promise<SupabaseClient | null> | null = null;

/** Load Supabase SDK once — call only on auth routes or when hasAuthHint(). */
export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured) return null;
  if (client) return client;
  if (loading) return loading;
  loading = (async () => {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(url!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: createAuthStorage(),
      },
    });
    return client;
  })();
  return loading;
}

export async function requireSupabase(): Promise<SupabaseClient> {
  const sb = await getSupabase();
  if (!sb) throw new Error('Supabase Auth is not configured');
  return sb;
}

/** Sync export always null — use getSupabase(). Prevents accidental static SDK pull. */
export const supabase: SupabaseClient | null = null;
