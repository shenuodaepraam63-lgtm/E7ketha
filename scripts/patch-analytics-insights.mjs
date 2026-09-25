/** Insights: sessions, exits, journeys, devices, search events, content tops. Idempotent. */
import fs from 'node:fs';

function patchAnalytics() {
  const f = 'server/analytics.ts';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');

  if (!s.includes('deviceType?:')) {
    s = s.replace(
      'siteHost?: string | null;\n};',
      'siteHost?: string | null;\n  deviceType?: string | null;\n};',
    );
  }

  if (!s.includes('device_type?:')) {
    s = s.replace(
      'referrer_source?: string | null };',
      'referrer_source?: string | null; device_type?: string | null };',
    );
  }

  if (!s.includes('device_type:')) {
    s = s.replace(
      'referrer_source: source,\n  };',
      'referrer_source: source,\n    device_type: (input.deviceType || \'unknown\').slice(0, 20),\n  };',
    );
  }

  s = s.replace(
    'page_views?select=page_path,page_type,entity_slug,visitor_id,created_at,referrer_source&created_at=gte.',
    'page_views?select=page_path,page_type,entity_slug,visitor_id,created_at,referrer_source,device_type&created_at=gte.',
  );
  s = s.replace(
    'page_views?select=page_path,page_type,entity_slug,visitor_id,created_at&created_at=gte.',
    'page_views?select=page_path,page_type,entity_slug,visitor_id,created_at,referrer_source,device_type&created_at=gte.',
  );

  if (!s.includes('export async function trackAnalyticsEvent')) {
    s += `\n\nexport type AnalyticsEventInput = {\n  visitorId: string;\n  eventType: string;\n  pagePath?: string | null;\n  meta?: string | null;\n  userId?: number | null;\n};\n\nexport async function trackAnalyticsEvent(input: AnalyticsEventInput) {\n  const visitorId = String(input.visitorId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);\n  if (visitorId.length < 8) return { ok: false, reason: 'bad-visitor' };\n  const eventType = String(input.eventType || '').slice(0, 40);\n  if (!eventType) return { ok: false, reason: 'bad-type' };\n  const row = {\n    visitor_id: visitorId,\n    user_id: input.userId && input.userId > 0 ? input.userId : null,\n    event_type: eventType,\n    page_path: (input.pagePath || '').slice(0, 200) || null,\n    meta: (input.meta || '').slice(0, 300) || null,\n  };\n  const result = await rest('analytics_events', { method: 'POST', body: JSON.stringify(row) });\n  if (!result.ok) return { ok: false, reason: result.error || 'http' };\n  return { ok: true };\n}\n\nfunction buildSessions(rows) {\n  const byVisitor = new Map();\n  for (const r of rows) {\n    const v = r.visitor_id || 'x';\n    if (!byVisitor.has(v)) byVisitor.set(v, []);\n    byVisitor.get(v).push(r);\n  }\n  const GAP_MS = 30 * 60 * 1000;\n  const sessions = [];\n  for (const [visitor, list] of byVisitor) {\n    const sorted = [...list].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));\n    let cur = [];\n    let lastTs = 0;\n    const flush = () => {\n      if (!cur.length) return;\n      const start = new Date(cur[0].created_at || 0).getTime();\n      const end = new Date(cur[cur.length - 1].created_at || 0).getTime();\n      sessions.push({ visitor, paths: cur.map((x) => x.page_path || '/'), start, end, durationMs: Math.max(0, end - start) });\n      cur = [];\n    };\n    for (const r of sorted) {\n      const ts = new Date(r.created_at || 0).getTime();\n      if (cur.length && ts - lastTs > GAP_MS) flush();\n      cur.push(r);\n      lastTs = ts;\n    }\n    flush();\n  }\n  return sessions;\n}\n`;
  }

  if (!s.includes("export type AnalyticsRange = 'today' | 'week' | 'month' | 'quarter'")) {
    s = s.replace(
      "export type AnalyticsRange = 'today' | 'week' | 'month';",
      "export type AnalyticsRange = 'today' | 'week' | 'month' | 'quarter'",
    );
  }
  if (!s.includes("range === 'quarter'")) {
    s = s.replace(
      'else d.setDate(d.getDate() - 30);\n  return d.toISOString();',
      "else if (range === 'quarter') d.setDate(d.getDate() - 90);\n  else d.setDate(d.getDate() - 30);\n  return d.toISOString();",
    );
    s = s.replace(
      'else start.setDate(start.getDate() - 30);\n  return { start: start.toISOString(), end: end.toISOString() };',
      "else if (range === 'quarter') start.setDate(start.getDate() - 90);\n  else start.setDate(start.getDate() - 30);\n  return { start: start.toISOString(), end: end.toISOString() };",
    );
  }

  if (!s.includes('let topSearches')) {
    s = s.replace(
      'const probe = await rest(',
      `let topSearches = [];\n  let zeroSearches = [];\n  let eventBreakdown = [];\n  try {\n    const ev = await rest('analytics_events?select=event_type,meta,page_path,created_at&created_at=gte.' + start + '&limit=5000', { method: 'GET' });\n    const events = Array.isArray(ev.data) ? ev.data : [];\n    const searchMap = new Map();\n    const zeroMap = new Map();\n    const typeMap = new Map();\n    for (const e of events) {\n      typeMap.set(e.event_type, (typeMap.get(e.event_type) || 0) + 1);\n      if (e.event_type === 'search' && e.meta) searchMap.set(e.meta, (searchMap.get(e.meta) || 0) + 1);\n      if (e.event_type === 'search_zero' && e.meta) zeroMap.set(e.meta, (zeroMap.get(e.meta) || 0) + 1);\n    }\n    topSearches = [...searchMap.entries()].map(([q, count]) => ({ q, count })).sort((a, b) => b.count - a.count).slice(0, 15);\n    zeroSearches = [...zeroMap.entries()].map(([q, count]) => ({ q, count })).sort((a, b) => b.count - a.count).slice(0, 15);\n    eventBreakdown = [...typeMap.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);\n  } catch {}\n\n  const probe = await rest(`,
    );
  }

  if (!s.includes('avgSessionMs')) {
    const old = `  return {\n    range,\n    tableOk: probe.ok,\n    pageViews: current.pageViews,\n    uniqueVisitors: current.uniqueVisitors,\n    previousPageViews: previous.pageViews,\n    previousUniqueVisitors: previous.uniqueVisitors,\n    compareLabel,\n    activeNow,\n    series,\n    busiestDay,\n    otherPaths: otherPathsList,\n    topPages: current.topPages,\n    byPageType: current.byPageType,\n    topNovels: current.topNovels,\n  };\n}`;
    if (s.includes(old)) {
      s = s.replace(
        old,
        `  const sessions = buildSessions(rows);\n  const sessionCount = sessions.length;\n  const durations = sessions.map((x) => x.durationMs).filter((d) => d > 0);\n  const avgSessionMs = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;\n  const maxSessionMs = durations.length ? Math.max(...durations) : 0;\n  const exitMap = new Map();\n  for (const sess of sessions) {\n    const last = sess.paths[sess.paths.length - 1] || '/';\n    exitMap.set(last, (exitMap.get(last) || 0) + 1);\n  }\n  const exitPages = [...exitMap.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 12);\n  const journeyMap = new Map();\n  for (const sess of sessions) {\n    const key = sess.paths.slice(0, 5).join(' → ');\n    if (key) journeyMap.set(key, (journeyMap.get(key) || 0) + 1);\n  }\n  const journeys = [...journeyMap.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 10);\n  const deviceMap = new Map();\n  for (const r of rows) {\n    const d = r.device_type || 'unknown';\n    deviceMap.set(d, (deviceMap.get(d) || 0) + 1);\n  }\n  const devices = [...deviceMap.entries()].map(([device, views]) => ({ device, views })).sort((a, b) => b.views - a.views);\n  const authorMap = new Map();\n  const genreMap = new Map();\n  for (const r of rows) {\n    if (r.page_type === 'author' && r.entity_slug) authorMap.set(r.entity_slug, (authorMap.get(r.entity_slug) || 0) + 1);\n    if (r.page_type === 'genre' && r.entity_slug) genreMap.set(r.entity_slug, (genreMap.get(r.entity_slug) || 0) + 1);\n  }\n  const topAuthors = [...authorMap.entries()].map(([slug, views]) => ({ slug, views })).sort((a, b) => b.views - a.views).slice(0, 10);\n  const topGenres = [...genreMap.entries()].map(([slug, views]) => ({ slug, views })).sort((a, b) => b.views - a.views).slice(0, 10);\n  const tenMin = new Date(Date.now() - 10 * 60 * 1000).toISOString();\n  const liveRows = rows.filter((r) => r.created_at && r.created_at >= tenMin);\n  const livePath = new Map();\n  for (const r of liveRows) livePath.set(r.page_path || '/', (livePath.get(r.page_path || '/') || 0) + 1);\n  const livePages = [...livePath.entries()].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 8);\n  const liveRecent = liveRows.slice().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))).slice(0, 8).map((r) => ({ path: r.page_path || '/', at: r.created_at }));\n\n  return {\n    range,\n    tableOk: probe.ok,\n    pageViews: current.pageViews,\n    uniqueVisitors: current.uniqueVisitors,\n    previousPageViews: previous.pageViews,\n    previousUniqueVisitors: previous.uniqueVisitors,\n    compareLabel,\n    activeNow,\n    series,\n    busiestDay,\n    otherPaths: otherPathsList,\n    topPages: current.topPages,\n    byPageType: current.byPageType,\n    topNovels: current.topNovels,\n    topSearches: typeof topSearches !== 'undefined' ? topSearches : [],\n    zeroSearches: typeof zeroSearches !== 'undefined' ? zeroSearches : [],\n    eventBreakdown: typeof eventBreakdown !== 'undefined' ? eventBreakdown : [],\n    sessionCount,\n    avgSessionMs,\n    maxSessionMs,\n    exitPages,\n    journeys,\n    devices,\n    topAuthors,\n    topGenres,\n    livePages,\n    liveRecent,\n  };\n}`,
      );
    }
  }

  fs.writeFileSync(f, s);
  console.log('[patch-analytics-insights] server');
}

function patchRouters() {
  const f = 'server/routers.ts';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes('trackAnalyticsEvent')) {
    s = s.replace(
      "import { getVisitorAnalytics, trackPageView } from './analytics';",
      "import { getVisitorAnalytics, trackPageView, trackAnalyticsEvent } from './analytics';",
    );
  }
  if (!s.includes('trackEvent:')) {
    s = s.replace(
      '.mutation(({ input }) => trackPageView(input)),',
      `.mutation(({ input }) => trackPageView(input)),\n    trackEvent: publicProcedure\n      .input(z.object({\n        visitorId: z.string().min(8).max(64),\n        eventType: z.string().min(2).max(40),\n        pagePath: z.string().max(300).optional().nullable(),\n        meta: z.string().max(300).optional().nullable(),\n        userId: z.number().int().positive().optional().nullable(),\n      }))\n      .mutation(({ input }) => trackAnalyticsEvent(input)),`,
    );
  }
  if (!s.includes("'quarter'")) {
    s = s.replace("z.enum(['today', 'week', 'month'])", "z.enum(['today', 'week', 'month', 'quarter'])");
  }
  if (!s.includes('deviceType:')) {
    s = s.replace(
      'siteHost: z.string().max(120).optional().nullable(),',
      "siteHost: z.string().max(120).optional().nullable(),\n        deviceType: z.string().max(20).optional().nullable(),",
    );
  }
  fs.writeFileSync(f, s);
  console.log('[patch-analytics-insights] routers');
}

function patchTracker() {
  const f = 'client/src/components/AnalyticsRouteTracker.tsx';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes('deviceType')) {
    s = s.replace(
      `track.mutate({\n          visitorId,\n          pagePath: path,\n          referrer: typeof document !== 'undefined' ? document.referrer.slice(0, 400) : '',\n          siteHost: typeof window !== 'undefined' ? window.location.hostname : '',\n        });`,
      `const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';\n        let deviceType = 'desktop';\n        if (/iPad|Tablet/i.test(ua)) deviceType = 'tablet';\n        else if (/Mobi|Android|iPhone/i.test(ua)) deviceType = 'mobile';\n        track.mutate({\n          visitorId,\n          pagePath: path,\n          referrer: typeof document !== 'undefined' ? document.referrer.slice(0, 400) : '',\n          siteHost: typeof window !== 'undefined' ? window.location.hostname : '',\n          deviceType,\n        });`,
    );
  }
  fs.writeFileSync(f, s);
  console.log('[patch-analytics-insights] tracker');
}

function patchSearchTrack() {
  const g = 'client/src/components/GlobalSearch.tsx';
  if (fs.existsSync(g)) {
    let s = fs.readFileSync(g, 'utf8');
    if (!s.includes("from '@/lib/visitorId'") && s.includes('navigate(`/search?q=')) {
      s = s.replace(/^import /, "import { getVisitorId } from '@/lib/visitorId';\nimport ");
    }
    if (s.includes("navigate(`/search?q=${encodeURIComponent(t)}`);") && !s.includes("eventType: 'search'")) {
      s = s.replace(
        'navigate(`/search?q=${encodeURIComponent(t)}`);',
        `try { const vid = getVisitorId(); if (vid.length >= 8) { fetch('/api/trpc/analytics.trackEvent?batch=1', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ '0': { json: { visitorId: vid, eventType: 'search', pagePath: '/search', meta: t.slice(0, 120) } } }) }).catch(() => {}); } } catch {}\n    navigate(\`/search?q=\${encodeURIComponent(t)}\`);`,
      );
      fs.writeFileSync(g, s);
      console.log('[patch-analytics-insights] GlobalSearch');
    }
  }
}

patchAnalytics();
patchRouters();
patchTracker();
patchSearchTrack();
