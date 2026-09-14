type Sample = { durationMs: number; recordedAt: number };

const samplesByRoute = new Map<string, Sample[]>();
const MAX_SAMPLES_PER_ROUTE = 200;

export function recordRequest(route: string, durationMs: number) {
  const samples = samplesByRoute.get(route) ?? [];
  samples.push({ durationMs, recordedAt: Date.now() });
  if (samples.length > MAX_SAMPLES_PER_ROUTE) samples.splice(0, samples.length - MAX_SAMPLES_PER_ROUTE);
  samplesByRoute.set(route, samples);

  if (samples.length % 20 === 0) {
    console.info('[Performance]', JSON.stringify({ route, count: samples.length, p50Ms: percentile(samples, 0.5), p95Ms: percentile(samples, 0.95), lastMs: Math.round(durationMs * 100) / 100 }));
  }
}

function percentile(samples: Sample[], percentileValue: number) {
  if (!samples.length) return 0;
  const sorted = samples.map((sample) => sample.durationMs).sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(percentileValue * sorted.length) - 1);
  return Math.round(sorted[index] * 100) / 100;
}

export function getPerformanceSnapshot() {
  return Object.fromEntries(Array.from(samplesByRoute.entries()).map(([route, samples]) => [route, {
    count: samples.length,
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    lastMs: samples.at(-1)?.durationMs ?? 0,
  }]));
}

export function performanceMiddleware(req: { path: string; method: string }, res: { setHeader: (name: string, value: string) => void }, next: () => void) {
  const startedAt = process.hrtime.bigint();
  res.setHeader('X-Performance-Route', `${req.method} ${req.path}`);
  try {
    next();
  } finally {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const route = `${req.method} ${req.path}`;
    res.setHeader('Server-Timing', `app;dur=${durationMs.toFixed(1)}`);
    res.setHeader('X-Request-Duration-Ms', durationMs.toFixed(1));
    recordRequest(route, durationMs);
  }
}

export function performanceSnapshotHandler(_req: unknown, res: { json: (value: unknown) => void }) {
  res.json({ generatedAt: new Date().toISOString(), routes: getPerformanceSnapshot() });
}

export function publicCacheHeaders(res: { setHeader: (name: string, value: string) => void }, seconds = 300) {
  res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds * 2}`);
}

export function privateCacheHeaders(res: { setHeader: (name: string, value: string) => void }) {
  res.setHeader('Cache-Control', 'private, no-store');
}

export function getP95ForRoute(route: string) {
  const samples = samplesByRoute.get(route) ?? [];
  return percentile(samples, 0.95);
}

export type PerformanceSnapshot = ReturnType<typeof getPerformanceSnapshot>;
