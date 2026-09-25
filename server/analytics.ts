/**
 * Privacy-friendly page analytics for E7ketha.
 * Anonymous visitor_id, optional user_id, page view only.
 * Soft-fail if table missing.
 */
import { ENV } from './_core/env';

export type PageViewInput = {
  visitorId: string;
  pagePath: string;
  pageType?: string;
  entitySlug?: string | null;
  userId?: number | null;
};

export type AnalyticsRange = 'today' | 'week' | 'month';

type AggRow = { page_path?: string; page_type?: string; entity_slug?: string; visitor_id?: string };

function restKey() {
  return ENV.supabaseSecretKey || ENV.supabasePublishableKey;
}

async function rest<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  if (!ENV.supabaseUrl || !restKey()) return { ok: false, status: 0, data: null, error: 'no-supabase' };
  try {
    const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${path}`, {
      ...init,
      signal: AbortSignal.timeout(10000),
      headers: {
        apikey: restKey()!,
        Authorization: `Bearer ${restKey()}`,
        'Content-Type': 'application/json',
        Prefer: (init?.method ?? 'GET').toUpperCase() === 'GET' ? 'return=representation' : 'return=minimal',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { ok: false, status: response.status, data: null, error: text.slice(0, 200) };
    }
    if (response.status === 204) return { ok: true, status: 204, data: null };
    const text = await response.text();
    if (!text) return { ok: true, status: response.status, data: null };
    return { ok: true, status: response.status, data: JSON.parse(text) as T };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e instanceof Error ? e.message : 'fetch' };
  }
}

const recent = new Map<string, number>();
const DEBOUNCE_MS = 25_000;

function debounced(visitorId: string, path: string): boolean {
  const key = `${visitorId}|${path}`;
  const now = Date.now();
  const prev = recent.get(key) ?? 0;
  if (now - prev < DEBOUNCE_MS) return true;
  recent.set(key, now);
  if (recent.size > 5000) {
    const cutoff = now - DEBOUNCE_MS * 2;
    for (const [k, t] of recent) {
      if (t < cutoff) recent.delete(k);
    }
  }
  return false;
}

export function classifyPagePath(rawPath: string): { pageType: string; pagePath: string; entitySlug: string | null } {
  let path = (rawPath.split('?')[0] || '/').trim() || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/+/g, '/');
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

  if (path.startsWith('/admin') || path.startsWith('/login') || path.startsWith('/api')) {
    return { pageType: 'skip', pagePath: path, entitySlug: null };
  }

  if (path === '/' || path === '') return { pageType: 'home', pagePath: '/', entitySlug: null };
  if (path.startsWith('/books/')) {
    const slug = decodeURIComponent(path.slice('/books/'.length).split('/')[0] || '');
    return { pageType: 'novel', pagePath: path, entitySlug: slug || null };
  }
  if (path.startsWith('/authors/')) {
    const slug = decodeURIComponent(path.slice('/authors/'.length).split('/')[0] || '');
    return { pageType: 'author', pagePath: path, entitySlug: slug || null };
  }
  if (path.startsWith('/genres/')) {
    const slug = decodeURIComponent(path.slice('/genres/'.length).split('/')[0] || '');
    return { pageType: 'genre', pagePath: path, entitySlug: slug || null };
  }
  if (path.startsWith('/articles/')) {
    const slug = decodeURIComponent(path.slice('/articles/'.length).split('/')[0] || '');
    return { pageType: 'article', pagePath: path.slice(0, 200), entitySlug: slug || null };
  }
  if (path.startsWith('/quotes')) return { pageType: 'quotes', pagePath: path.slice(0, 200), entitySlug: null };
  if (path.startsWith('/explore')) return { pageType: 'explore', pagePath: '/explore', entitySlug: null };
  if (path.startsWith('/search')) return { pageType: 'search', pagePath: '/search', entitySlug: null };
  if (path.startsWith('/discover')) return { pageType: 'discover', pagePath: '/discover', entitySlug: null };
  if (path.startsWith('/series')) return { pageType: 'series', pagePath: path.slice(0, 200), entitySlug: null };
  if (path.startsWith('/about') || path.startsWith('/faq') || path.startsWith('/contact') || path.startsWith('/privacy') || path.startsWith('/terms')) {
    return { pageType: 'info', pagePath: path, entitySlug: null };
  }
  return { pageType: 'other', pagePath: path.slice(0, 200), entitySlug: null };
}

export async function trackPageView(input: PageViewInput): Promise<{ ok: boolean; skipped?: boolean; reason?: string }> {
  const visitorId = String(input.visitorId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
  if (visitorId.length < 8) return { ok: false, reason: 'bad-visitor' };

  const classified = classifyPagePath(input.pagePath);
  if (classified.pageType === 'skip') return { ok: true, skipped: true, reason: 'skip-path' };
  if (debounced(visitorId, classified.pagePath)) return { ok: true, skipped: true, reason: 'debounce' };

  const row = {
    visitor_id: visitorId,
    user_id: input.userId && input.userId > 0 ? input.userId : null,
    page_type: input.pageType || classified.pageType,
    page_path: classified.pagePath,
    entity_slug: input.entitySlug ?? classified.entitySlug,
  };

  const result = await rest('page_views', { method: 'POST', body: JSON.stringify(row) });
  if (!result.ok) return { ok: false, reason: result.error || `http-${result.status}` };
  return { ok: true };
}

function rangeStart(range: AnalyticsRange): string {
  const d = new Date();
  if (range === 'today') d.setHours(0, 0, 0, 0);
  else if (range === 'week') d.setDate(d.getDate() - 7);
  else d.setDate(d.getDate() - 30);
  return d.toISOString();
}

function previousRange(range: AnalyticsRange): { start: string; end: string } {
  const end = new Date(rangeStart(range));
  const start = new Date(end);
  if (range === 'today') start.setDate(start.getDate() - 1);
  else if (range === 'week') start.setDate(start.getDate() - 7);
  else start.setDate(start.getDate() - 30);
  return { start: start.toISOString(), end: end.toISOString() };
}

async function fetchViewsSince(iso: string, until?: string): Promise<AggRow[]> {
  let q = `page_views?select=page_path,page_type,entity_slug,visitor_id&created_at=gte.${iso}`;
  if (until) q += `&created_at=lt.${until}`;
  q += '&limit=10000';
  const result = await rest<AggRow[]>(q, { method: 'GET' });
  if (!result.ok || !Array.isArray(result.data)) return [];
  return result.data;
}

function aggregate(rows: AggRow[]) {
  const pageViews = rows.length;
  const uniqueVisitors = new Set(rows.map((r) => r.visitor_id).filter(Boolean)).size;
  const byPath = new Map<string, { views: number; visitors: Set<string> }>();
  const byType = new Map<string, { views: number; visitors: Set<string> }>();
  const byNovel = new Map<string, { views: number; visitors: Set<string> }>();

  for (const r of rows) {
    const path = r.page_path || '/';
    const type = r.page_type || 'other';
    const vid = r.visitor_id || 'x';
    if (!byPath.has(path)) byPath.set(path, { views: 0, visitors: new Set() });
    byPath.get(path)!.views += 1;
    byPath.get(path)!.visitors.add(vid);
    if (!byType.has(type)) byType.set(type, { views: 0, visitors: new Set() });
    byType.get(type)!.views += 1;
    byType.get(type)!.visitors.add(vid);
    if (type === 'novel' && r.entity_slug) {
      if (!byNovel.has(r.entity_slug)) byNovel.set(r.entity_slug, { views: 0, visitors: new Set() });
      byNovel.get(r.entity_slug)!.views += 1;
      byNovel.get(r.entity_slug)!.visitors.add(vid);
    }
  }

  const topPages = [...byPath.entries()]
    .map(([path, v]) => ({ path, views: v.views, uniqueVisitors: v.visitors.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);
  const byPageType = [...byType.entries()]
    .map(([type, v]) => ({ type, views: v.views, uniqueVisitors: v.visitors.size }))
    .sort((a, b) => b.views - a.views);
  const topNovels = [...byNovel.entries()]
    .map(([slug, v]) => ({ slug, views: v.views, uniqueVisitors: v.visitors.size }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 12);

  return { pageViews, uniqueVisitors, topPages, byPageType, topNovels };
}

export async function getVisitorAnalytics(range: AnalyticsRange = 'today') {
  const start = rangeStart(range);
  const rows = await fetchViewsSince(start);
  const current = aggregate(rows);
  const prev = previousRange(range);
  const prevRows = await fetchViewsSince(prev.start, prev.end);
  const previous = aggregate(prevRows);
  const probe = await rest('page_views?select=id&limit=1', { method: 'GET' });
  return {
    range,
    tableOk: probe.ok,
    pageViews: current.pageViews,
    uniqueVisitors: current.uniqueVisitors,
    previousPageViews: previous.pageViews,
    previousUniqueVisitors: previous.uniqueVisitors,
    topPages: current.topPages,
    byPageType: current.byPageType,
    topNovels: current.topNovels,
  };
}
