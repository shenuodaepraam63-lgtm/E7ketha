import { createClient, type SupportedStorage } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Share session across e7ketha.com subdomains via cookies */
function cookieDomain(): string {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return '';
  if (host === 'e7ketha.com' || host.endsWith('.e7ketha.com')) return '.e7ketha.com';
  return '';
}

const CHUNK_SIZE = 3180; // stay under typical 4KB cookie limit with encoding overhead

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

/** Cookie storage shared on *.e7ketha.com (chunked for large JWT payloads) */
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

      const maxAge = 60 * 60 * 24 * 400;
      if (value.length <= CHUNK_SIZE) {
        writeCookie(key, value, maxAge);
        return;
      }
      const chunks = Math.ceil(value.length / CHUNK_SIZE);
      writeCookie(`${key}.chunks`, String(chunks), maxAge);
      for (let i = 0; i < chunks; i++) {
        writeCookie(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), maxAge);
      }
    },
    removeItem(key: string) {
      eraseCookie(key);
      const all = readCookies();
      const count = Number(all[`${key}.chunks`] || 0);
      eraseCookie(`${key}.chunks`);
      for (let i = 0; i < Math.max(count, 20); i++) eraseCookie(`${key}.${i}`);
    },
  };
}

/** One-time migrate localStorage session → shared cookies */
function migrateLocalStorageToCookies(storage: SupportedStorage) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
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
    // ignore quota / private mode
  }
}

const sharedStorage = typeof window !== 'undefined' ? createSharedCookieStorage() : undefined;
if (sharedStorage) migrateLocalStorageToCookies(sharedStorage);

export const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce',
          storage: sharedStorage,
        },
      })
    : null;

export const supabaseConfigured = Boolean(supabase);

export function requireSupabase() {
  if (!supabase) throw new Error('Supabase Auth is not configured');
  return supabase;
}
