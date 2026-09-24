/** Anonymous browse-based recommendations (localStorage only — no account). */

const KEY = 'e7k_browse_v1';
const MAX_NOVELS = 50;
const MAX_GENRES = 20;
const MAX_SEARCHES = 15;

export type BrowseStore = {
  novels: Record<string, { n: number; title?: string; at: number }>;
  genres: Record<string, { n: number; name?: string; at: number }>;
  searches: Array<{ q: string; at: number }>;
};

function empty(): BrowseStore {
  return { novels: {}, genres: {}, searches: [] };
}

export function getBrowseStore(): BrowseStore {
  if (typeof window === 'undefined') return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as BrowseStore;
    return {
      novels: parsed.novels ?? {},
      genres: parsed.genres ?? {},
      searches: Array.isArray(parsed.searches) ? parsed.searches : [],
    };
  } catch {
    return empty();
  }
}

function save(store: BrowseStore) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

function pruneRecord<T extends { at: number; n: number }>(
  rec: Record<string, T>,
  max: number,
): Record<string, T> {
  const entries = Object.entries(rec).sort((a, b) => b[1].at - a[1].at);
  return Object.fromEntries(entries.slice(0, max));
}

export function trackNovelView(slug: string, title?: string) {
  const s = slug?.trim();
  if (!s) return;
  const store = getBrowseStore();
  const prev = store.novels[s];
  store.novels[s] = {
    n: (prev?.n ?? 0) + 1,
    title: title || prev?.title,
    at: Date.now(),
  };
  store.novels = pruneRecord(store.novels, MAX_NOVELS);
  save(store);
}

export function trackGenreView(slug: string, name?: string) {
  const s = slug?.trim();
  if (!s) return;
  const store = getBrowseStore();
  const prev = store.genres[s];
  store.genres[s] = {
    n: (prev?.n ?? 0) + 1,
    name: name || prev?.name,
    at: Date.now(),
  };
  store.genres = pruneRecord(store.genres, MAX_GENRES);
  save(store);
}

export function trackSearch(q: string) {
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return;
  const store = getBrowseStore();
  store.searches = [{ q: query, at: Date.now() }, ...store.searches.filter((x) => x.q !== query)].slice(
    0,
    MAX_SEARCHES,
  );
  save(store);
}

export function topGenreSlugs(limit = 3): string[] {
  const store = getBrowseStore();
  return Object.entries(store.genres)
    .sort((a, b) => b[1].n - a[1].n || b[1].at - a[1].at)
    .slice(0, limit)
    .map(([slug]) => slug);
}

export function viewedNovelSlugs(): Set<string> {
  return new Set(Object.keys(getBrowseStore().novels));
}

/** Enough signal to show personalized block (not empty first visit). */
export function hasBrowseSignal(): boolean {
  const store = getBrowseStore();
  const novelViews = Object.values(store.novels).reduce((a, x) => a + x.n, 0);
  const genreViews = Object.values(store.genres).reduce((a, x) => a + x.n, 0);
  return novelViews + genreViews >= 2 || store.searches.length >= 1;
}

export function clearBrowseStore() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
