/** Enhance AdminVisitors: sources, new/returning, type drill-down. Idempotent. */
import fs from 'node:fs';

const f = 'client/src/pages/AdminVisitors.tsx';
if (!fs.existsSync(f)) process.exit(0);
let s = fs.readFileSync(f, 'utf8');

if (!s.includes('SOURCE_AR')) {
  s = s.replace(
    "  other: 'أخرى',\n};",
    `  other: 'أخرى',
};

const SOURCE_AR: Record<string, string> = {
  direct: 'رابط مباشر',
  internal: 'تصفح داخل الموقع',
  search: 'بحث (Google وغيره)',
  facebook: 'Facebook / Instagram',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  referral: 'مواقع أخرى',
};`,
  );
}

if (!s.includes('drillType')) {
  s = s.replace(
    'const [detailPath, setDetailPath] = useState<string | null>(null);',
    `const [detailPath, setDetailPath] = useState<string | null>(null);
  const [drillType, setDrillType] = useState<string | null>(null);`,
  );
}

if (!s.includes('زوار جدد')) {
  s = s.replace(
    '{data.busiestDay && data.busiestDay.views > 0 && (',
    `{(typeof data.newVisitors === 'number' || typeof data.returningVisitors === 'number') && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs">
            <span className="text-muted-foreground">زوار جدد</span>
            <strong className="mt-1 block text-lg font-extrabold tabular-nums">
              {(data.newVisitors ?? 0).toLocaleString('ar-EG')}
            </strong>
            <span className="text-[10px] text-muted-foreground">أول ظهور في هذه الفترة</span>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-3 text-xs">
            <span className="text-muted-foreground">زوار عائدون</span>
            <strong className="mt-1 block text-lg font-extrabold tabular-nums">
              {(data.returningVisitors ?? 0).toLocaleString('ar-EG')}
            </strong>
            <span className="text-[10px] text-muted-foreground">زُاروا قبل بداية الفترة</span>
          </div>
        </div>
      )}

      {data.busiestDay && data.busiestDay.views > 0 && (`,
  );
}

if (!s.includes('مصدر الزيارة')) {
  s = s.replace(
    `<section className="rounded-[20px] border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-extrabold">أكثر الروايات مشاهدة</h2>`,
    `{(data.sources?.length ?? 0) > 0 && (
        <section className="rounded-[20px] border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-extrabold">مصدر الزيارة</h2>
          <p className="mb-3 text-[11px] text-muted-foreground">تصنيف فقط — لا يُحفظ رابط الإحالة الكامل.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.sources!.map((src) => (
              <li key={src.source} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5 text-xs">
                <span className="font-bold">{SOURCE_AR[src.source] || src.source}</span>
                <span className="tabular-nums text-muted-foreground">{src.views.toLocaleString('ar-EG')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-[20px] border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-extrabold">أكثر الروايات مشاهدة</h2>`,
  );
}

if (!s.includes('setDrillType')) {
  s = s.replace(
    `onClick={() => {
                      if (t.type === 'other') setShowOther((v) => !v);
                    }}`,
    `onClick={() => {
                      if (t.type === 'other') setShowOther((v) => !v);
                      setDrillType(drillType === t.type ? null : t.type);
                    }}`,
  );
}

if (!s.includes('typeDrilldown')) {
  s = s.replace(
    `{t.type === 'other' && showOther && (data.otherPaths?.length ?? 0) > 0 && (
                    <ul className="mt-2 mr-2 grid gap-1 border-r border-border pr-3">
                      {data.otherPaths!.map((o) => (
                        <li key={o.path} className="flex justify-between text-[11px] text-muted-foreground">
                          <span className="truncate font-mono">{o.path}</span>
                          <span className="tabular-nums">{o.views}</span>
                        </li>
                      ))}
                    </ul>
                  )}`,
    `{t.type === 'other' && showOther && (data.otherPaths?.length ?? 0) > 0 && (
                    <ul className="mt-2 mr-2 grid gap-1 border-r border-border pr-3">
                      {data.otherPaths!.map((o) => (
                        <li key={o.path} className="flex justify-between text-[11px] text-muted-foreground">
                          <span className="truncate font-mono">{o.path}</span>
                          <span className="tabular-nums">{o.views}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {drillType === t.type && data.typeDrilldown?.[t.type]?.length ? (
                    <ul className="mt-2 mr-2 grid gap-1 border-r border-[#675de8]/30 pr-3">
                      <li className="text-[10px] font-bold text-[#675de8]">تفاصيل {TYPE_AR[t.type] || t.type}</li>
                      {data.typeDrilldown[t.type].map((row) => (
                        <li key={row.path} className="flex justify-between gap-2 text-[11px]">
                          <span className="min-w-0 truncate font-mono text-muted-foreground">{row.path}</span>
                          <span className="shrink-0 tabular-nums">{row.views} · {row.uniqueVisitors} فريد</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}`,
  );
}

fs.writeFileSync(f, s);
console.log('[patch-analytics-ui] done');
