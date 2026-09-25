/** UI sections for insights on AdminVisitors. Idempotent. */
import fs from 'node:fs';
const f = 'client/src/pages/AdminVisitors.tsx';
if (!fs.existsSync(f)) process.exit(0);
let s = fs.readFileSync(f, 'utf8');

if (!s.includes("'quarter'")) {
  s = s.replace("type Range = 'today' | 'week' | 'month';", "type Range = 'today' | 'week' | 'month' | 'quarter'");
  s = s.replace("  month: 'آخر 30 يومًا',\n};", "  month: 'آخر 30 يومًا',\n  quarter: 'آخر 90 يومًا',\n};");
}

if (!s.includes('function formatDuration')) {
  s = s.replace(
    'function formatDay(iso: string) {',
    `function formatDuration(ms: number) {
  if (!ms || ms < 1000) return 'أقل من ثانية';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return sec + 'ث';
  const m = Math.floor(sec / 60);
  const rem = sec % 60;
  if (m < 60) return rem ? m + 'د ' + rem + 'ث' : m + 'د';
  return Math.floor(m / 60) + 'س ' + (m % 60) + 'د';
}
function formatDay(iso: string) {`,
  );
}

if (!s.includes('DEVICE_AR')) {
  s = s.replace(
    'const SOURCE_AR',
    `const DEVICE_AR: Record<string, string> = { mobile: 'الهاتف', desktop: 'الكمبيوتر', tablet: 'الجهاز اللوحي', unknown: 'غير معروف' };
const SOURCE_AR`,
  );
}

if (!s.includes('متوسط الجلسة')) {
  const block = `
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs"><span className="text-muted-foreground">الجلسات</span><strong className="mt-1 block text-xl font-extrabold tabular-nums">{(data.sessionCount ?? 0).toLocaleString('ar-EG')}</strong></div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs"><span className="text-muted-foreground">متوسط الجلسة</span><strong className="mt-1 block text-xl font-extrabold">{formatDuration(data.avgSessionMs ?? 0)}</strong></div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs"><span className="text-muted-foreground">أطول جلسة</span><strong className="mt-1 block text-xl font-extrabold">{formatDuration(data.maxSessionMs ?? 0)}</strong></div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs"><span className="text-muted-foreground">نشطون الآن</span><strong className="mt-1 block text-xl font-extrabold tabular-nums">{data.activeNow ?? 0}</strong></div>
      </div>
`;
  if (s.includes('{data.busiestDay &&')) {
    s = s.replace('{data.busiestDay &&', block + '\n      {data.busiestDay &&');
  }
}

if (!s.includes('أكثر صفحات الخروج') && s.includes('أكثر الروايات مشاهدة')) {
  const extra = `
      {(data.exitPages?.length ?? 0) > 0 && (
        <section className="rounded-[20px] border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-extrabold">أكثر صفحات الخروج</h2>
          <ul className="grid gap-2">{data.exitPages!.map((e) => (<li key={e.path} className="flex justify-between gap-2 text-xs"><span className="truncate font-mono">{e.path}</span><span className="tabular-nums">{e.count}</span></li>))}</ul>
        </section>
      )}
      {(data.journeys?.length ?? 0) > 0 && (
        <section className="rounded-[20px] border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-extrabold">مسارات شائعة</h2>
          <ul className="grid gap-2">{data.journeys!.map((j) => (<li key={j.path} className="flex justify-between gap-3 text-[11px]"><span className="min-w-0 break-all font-mono text-muted-foreground">{j.path}</span><span className="font-bold">{j.count}</span></li>))}</ul>
        </section>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[20px] border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-extrabold">أكثر عمليات البحث</h2>
          {(data.topSearches?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">لا عمليات بحث بعد.</p> : <ul className="grid gap-2">{data.topSearches!.map((x) => (<li key={x.q} className="flex justify-between text-xs"><span className="font-bold">{x.q}</span><span>{x.count}</span></li>))}</ul>}
        </section>
        <section className="rounded-[20px] border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-extrabold">بحث بدون نتائج</h2>
          {(data.zeroSearches?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">لا يوجد بعد.</p> : <ul className="grid gap-2">{data.zeroSearches!.map((x) => (<li key={x.q} className="flex justify-between text-xs"><span className="font-bold">{x.q}</span><span>{x.count}</span></li>))}</ul>}
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[20px] border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-extrabold">أكثر المؤلفين مشاهدة</h2>
          {(data.topAuthors?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">لا بيانات بعد.</p> : <ul className="grid gap-2">{data.topAuthors!.map((a) => (<li key={a.slug} className="flex justify-between text-xs"><span>{decodeURIComponent(a.slug)}</span><span>{a.views}</span></li>))}</ul>}
        </section>
        <section className="rounded-[20px] border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-extrabold">أكثر التصنيفات مشاهدة</h2>
          {(data.topGenres?.length ?? 0) === 0 ? <p className="text-xs text-muted-foreground">لا بيانات بعد.</p> : <ul className="grid gap-2">{data.topGenres!.map((g) => (<li key={g.slug} className="flex justify-between text-xs"><span>{decodeURIComponent(g.slug)}</span><span>{g.views}</span></li>))}</ul>}
        </section>
      </div>
      {(data.devices?.length ?? 0) > 0 && (
        <section className="rounded-[20px] border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-extrabold">الأجهزة</h2>
          <ul className="grid gap-2">{data.devices!.map((d) => (<li key={d.device} className="flex justify-between text-xs"><span className="font-bold">{DEVICE_AR[d.device] || d.device}</span><span>{d.views}</span></li>))}</ul>
        </section>
      )}
`;
  s = s.replace(
    '<h2 className="text-sm font-extrabold">أكثر الروايات مشاهدة</h2>',
    extra + '\n          <h2 className="text-sm font-extrabold">أكثر الروايات مشاهدة</h2>',
  );
}

fs.writeFileSync(f, s);
console.log('[patch-analytics-insights-ui] done');
