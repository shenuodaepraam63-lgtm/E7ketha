/** Tiny in-memory TTL cache for public read endpoints (warm instance only). */
type Entry = { exp: number; value: unknown };
const store = new Map<string, Entry>();
const MAX_KEYS = 250;

export async function withPublicCache<T>(key: string, ttlMs: number, fn: () => Promise<T> | T): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.exp > now) return hit.value as T;
  const value = await fn();
  store.set(key, { exp: now + ttlMs, value });
  if (store.size > MAX_KEYS) {
    for (const [k, v] of store) {
      if (v.exp <= now) store.delete(k);
    }
    if (store.size > MAX_KEYS) {
      const first = store.keys().next().value;
      if (first !== undefined) store.delete(first);
    }
  }
  return value;
}

export function publicCacheStats() {
  return { keys: store.size };
}
