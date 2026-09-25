/** Enhance analytics.ts: referrer categories, new/returning, type drilldown. Idempotent. */
import fs from 'node:fs';

const f = 'server/analytics.ts';
if (!fs.existsSync(f)) process.exit(0);
let s = fs.readFileSync(f, 'utf8');

if (!s.includes('referrer?:')) {
  s = s.replace(
    `export type PageViewInput = {
  visitorId: string;
  pagePath: string;
  pageType?: string;
  entitySlug?: string | null;
  userId?: number | null;
};`,
    `export type PageViewInput = {
  visitorId: string;
  pagePath: string;
  pageType?: string;
  entitySlug?: string | null;
  userId?: number | null;
  referrer?: string | null;
  siteHost?: string | null;
};`,
  );
}

if (!s.includes('referrer_source?:')) {
  s = s.replace(
    'type AggRow = { page_path?: string; page_type?: string; entity_slug?: string; visitor_id?: string; created_at?: string };',
    'type AggRow = { page_path?: string; page_type?: string; entity_slug?: string; visitor_id?: string; created_at?: string; referrer_source?: string | null };',
  );
}

if (!s.includes('function classifyReferrer')) {
  s = s.replace(
    'export async function trackPageView',
    `export function classifyReferrer(raw: string | null | undefined, siteHost?: string | null): string {
  const ref = (raw || '').trim();
  if (!ref) return 'direct';
  try {
    const u = new URL(ref);
    const host = u.hostname.replace(/^www\\./i, '').toLowerCase();
    const site = (siteHost || '').replace(/^www\\./i, '').toLowerCase().split(':')[0];
    if (site && (host === site || host.endsWith('.' + site))) return 'internal';
    if (/google\\.|bing\\.|yahoo\\.|duckduckgo\\.|yandex\\.|baidu\\./.test(host)) return 'search';
    if (/facebook\\.|fb\\.com|fb\\.me|instagram\\.|threads\\.net/.test(host)) return 'facebook';
    if (/whatsapp\\.|wa\\.me/.test(host)) return 'whatsapp';
    if (/t\\.me|telegram\\./.test(host)) return 'telegram';
    if (/twitter\\.|x\\.com|t\\.co/.test(host)) return 'x';
    if (/youtube\\.|youtu\\.be/.test(host)) return 'youtube';
    if (/tiktok\\./.test(host)) return 'tiktok';
    return 'referral';
  } catch {
    return 'direct';
  }
}

export async function trackPageView`,
  );
}

if (!s.includes('referrer_source: source')) {
  s = s.replace(
    `  const row = {
    visitor_id: visitorId,
    user_id: input.userId && input.userId > 0 ? input.userId : null,
    page_type: input.pageType || classified.pageType,
    page_path: classified.pagePath,
    entity_slug: input.entitySlug ?? classified.entitySlug,
  };`,
    `  const source = classifyReferrer(input.referrer, input.siteHost);
  const row = {
    visitor_id: visitorId,
    user_id: input.userId && input.userId > 0 ? input.userId : null,
    page_type: input.pageType || classified.pageType,
    page_path: classified.pagePath,
    entity_slug: input.entitySlug ?? classified.entitySlug,
    referrer_source: source,
  };`,
  );
}

s = s.replace(
  'page_views?select=page_path,page_type,entity_slug,visitor_id,created_at&created_at=gte.',
  'page_views?select=page_path,page_type,entity_slug,visitor_id,created_at,referrer_source&created_at=gte.',
);

if (!s.includes('newVisitors')) {
  s = s.replace(
    `  return {
    range,
    tableOk: probe.ok,
    pageViews: current.pageViews,
    uniqueVisitors: current.uniqueVisitors,
    previousPageViews: previous.pageViews,
    previousUniqueVisitors: previous.uniqueVisitors,
    compareLabel,
    activeNow,
    series,
    busiestDay,
    otherPaths: otherPathsList,
    topPages: current.topPages,
    byPageType: current.byPageType,
    topNovels: current.topNovels,
  };
}`,
    `  const sourceMap = new Map();
  for (const r of rows) {
    const src = r.referrer_source || 'direct';
    sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
  }
  const sources = [...sourceMap.entries()].map(([source, views]) => ({ source, views })).sort((a, b) => b.views - a.views);

  const visitorsInRange = [...new Set(rows.map((r) => r.visitor_id).filter(Boolean))];
  let returningVisitors = 0;
  let newVisitors = visitorsInRange.length;
  if (visitorsInRange.length) {
    try {
      const prior = await rest('page_views?select=visitor_id&created_at=lt.' + start + '&limit=8000', { method: 'GET' });
      const priorSet = new Set((prior.data || []).map((r) => r.visitor_id).filter(Boolean));
      returningVisitors = visitorsInRange.filter((v) => priorSet.has(v)).length;
      newVisitors = Math.max(0, visitorsInRange.length - returningVisitors);
    } catch { /* ignore */ }
  }

  const pathsByType = new Map();
  for (const r of rows) {
    const type = r.page_type || 'other';
    const path = r.page_path || '/';
    if (!pathsByType.has(type)) pathsByType.set(type, new Map());
    const m = pathsByType.get(type);
    if (!m.has(path)) m.set(path, { views: 0, visitors: new Set() });
    const cell = m.get(path);
    cell.views += 1;
    if (r.visitor_id) cell.visitors.add(r.visitor_id);
  }
  const typeDrilldown = {};
  for (const [type, m] of pathsByType) {
    typeDrilldown[type] = [...m.entries()]
      .map(([path, v]) => ({ path, views: v.views, uniqueVisitors: v.visitors.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);
  }

  return {
    range,
    tableOk: probe.ok,
    pageViews: current.pageViews,
    uniqueVisitors: current.uniqueVisitors,
    previousPageViews: previous.pageViews,
    previousUniqueVisitors: previous.uniqueVisitors,
    compareLabel,
    activeNow,
    series,
    busiestDay,
    otherPaths: otherPathsList,
    topPages: current.topPages,
    byPageType: current.byPageType,
    topNovels: current.topNovels,
    sources,
    newVisitors,
    returningVisitors,
    typeDrilldown,
  };
}`,
  );
}

fs.writeFileSync(f, s);
console.log('[patch-analytics-server] done');
