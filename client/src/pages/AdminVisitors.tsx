import { Activity, AlertCircle, Calendar, Eye, Loader2, Radio, RefreshCw, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { trpc } from '@/lib/trpc';

type Range = 'today' | 'week' | 'month';

const RANGE_LABEL: Record<Range, string> = {
  today: 'اليوم',
  week: 'آخر 7 أيام',
  month: 'آخر 30 يومًا',
};

const TYPE_AR: Record<string, string> = {
  home: 'الرئيسية',
  novel: 'روايات',
  author: 'مؤلفون',
  genre: 'تصنيفات',
  quotes: 'اقتباسات',
  article: 'مقالات',
  explore: 'استكشاف',
  search: 'بحث',
  discover: 'اكتشاف',
  series: 'سلاسل',
  info: 'صفحات معلومات',
  other: 'أخرى',
};

function formatDay(iso: string) {
  if (!iso || iso.length < 10) return iso;
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('ar-EG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return iso.slice(5);
  }
}

function deltaText(current: number, previous: number) {
  if (previous <= 0) {
    if (current <= 0) return { text: 'لا تغيير', positive: null as boolean | null };
    return { text: `↑ ${current.toLocaleString('ar-EG')} جديد`, positive: true };
  }
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  if (diff >= 0) return { text: `↑ ${diff.toLocaleString('ar-EG')} (${pct}%)`, positive: true };
  return { text: `↓ ${Math.abs(diff).toLocaleString('ar-EG')} (${Math.abs(pct)}%)`, positive: false };
}

export function AdminVisitors() {
  const [range, setRange] = useState<Range>('today');
  const [chartMode, setChartMode] = useState<'views' | 'unique'>('views');
  const [showOther, setShowOther] = useState(false);
  const [detailPath, setDetailPath] = useState<string | null>(null);

  const query = trpc.admin.visitors.useQuery({ range }, { staleTime: 30_000, refetchOnWindowFocus: false });

  const chartData = useMemo(() => {
    const series = query.data?.series ?? [];
    return series.map((s) => ({
      ...s,
      label: s.day.slice(5),
    }));
  }, [query.data?.series]);

  if (query.isLoading) {
    return (
      <div className="grid min-h-[280px] place-items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="animate-spin" /> جارٍ تحميل تحليلات الزوار…
      </div>
    );
  }

  if (query.isError) {
    return (
      <div className="grid min-h-[240px] place-items-center gap-3 text-center">
        <AlertCircle className="text-red-500" />
        <p className="text-sm font-bold text-red-600">تعذر تحميل التحليلات</p>
        <p className="max-w-md text-xs text-muted-foreground">{query.error.message}</p>
        <button type="button" onClick={() => void query.refetch()} className="rounded-xl border px-4 py-2 text-xs font-bold">
          <RefreshCw size={14} className="inline" /> إعادة
        </button>
      </div>
    );
  }

  const data = query.data!;
  const totalTop = data.topPages.reduce((s, p) => s + p.views, 0) || 1;
  const uvDelta = deltaText(data.uniqueVisitors, data.previousUniqueVisitors);
  const pvDelta = deltaText(data.pageViews, data.previousPageViews);
  const compareLabel = data.compareLabel ?? 'مقارنة بالفترة السابقة';
  const detail = detailPath ? data.topPages.find((p) => p.path === detailPath) ?? null : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">الزوار والتحليلات</h1>
          <p className="mt-2 max-w-xl text-xs leading-6 text-muted-foreground">
            مشاهدات الصفحات وزوار فريدون بمُعرّف مجهول (بدون IP). لا يُسجَّل التمرير أو حركة الفأرة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
            <Radio size={12} className="animate-pulse" /> نشطون الآن: {data.activeNow ?? 0}
          </span>
          {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-xl px-3 py-2 text-[11px] font-bold ${
                range === r ? 'bg-[#675de8] text-white' : 'border border-border'
              }`}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {!data.tableOk && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-50 p-4 text-xs leading-6 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
          <strong>جدول page_views غير متاح.</strong> نفّذ SQL من <code className="font-mono">scripts/sql/page_views.sql</code>.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] border border-border bg-card p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>الزوار الفريدون</span>
            <Users size={16} className="text-[#675de8]" />
          </div>
          <div className="mt-3 text-3xl font-extrabold tabular-nums">{data.uniqueVisitors.toLocaleString('ar-EG')}</div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            الفترة السابقة: <strong className="text-foreground">{data.previousUniqueVisitors.toLocaleString('ar-EG')}</strong>
            <br />
            <span className={uvDelta.positive === true ? 'text-emerald-600' : uvDelta.positive === false ? 'text-red-600' : ''}>
              {uvDelta.text}
            </span>
            <span className="text-muted-foreground"> · {compareLabel}</span>
          </p>
        </div>
        <div className="rounded-[20px] border border-border bg-card p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>مشاهدات الصفحات</span>
            <Eye size={16} className="text-[#675de8]" />
          </div>
          <div className="mt-3 text-3xl font-extrabold tabular-nums">{data.pageViews.toLocaleString('ar-EG')}</div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            الفترة السابقة: <strong className="text-foreground">{data.previousPageViews.toLocaleString('ar-EG')}</strong>
            <br />
            <span className={pvDelta.positive === true ? 'text-emerald-600' : pvDelta.positive === false ? 'text-red-600' : ''}>
              {pvDelta.text}
            </span>
            <span className="text-muted-foreground"> · {compareLabel}</span>
          </p>
        </div>
      </div>

      {data.busiestDay && data.busiestDay.views > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-xs">
          <Calendar size={14} className="text-[#675de8]" />
          <span className="text-muted-foreground">أكثر يوم نشاطًا:</span>
          <strong>{formatDay(data.busiestDay.day)}</strong>
          <span className="text-muted-foreground">—</span>
          <span className="tabular-nums font-bold">{data.busiestDay.views.toLocaleString('ar-EG')} مشاهدة</span>
        </div>
      )}

      <section className="rounded-[20px] border border-border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <Activity size={16} /> حركة الزيارات
          </h2>
          <div className="flex gap-1 rounded-xl border border-border p-0.5">
            <button
              type="button"
              onClick={() => setChartMode('views')}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${chartMode === 'views' ? 'bg-[#675de8] text-white' : ''}`}
            >
              مشاهدات
            </button>
            <button
              type="button"
              onClick={() => setChartMode('unique')}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold ${chartMode === 'unique' ? 'bg-[#675de8] text-white' : ''}`}
            >
              زوار فريدون
            </button>
          </div>
        </div>
        <div className="h-64 w-full">
          {chartData.every((d) => d.views === 0 && d.unique === 0) ? (
            <div className="grid h-full place-items-center text-xs text-muted-foreground">لا بيانات كافية للرسم بعد.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={36} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(_, payload) => {
                    const day = payload?.[0]?.payload?.day;
                    return day ? formatDay(day) : '';
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={chartMode === 'views' ? 'views' : 'unique'}
                  name={chartMode === 'views' ? 'مشاهدات' : 'زوار'}
                  stroke="#675de8"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[20px] border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-extrabold">أكثر الصفحات زيارة</h2>
          {data.topPages.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا بيانات بعد في هذه الفترة.</p>
          ) : (
            <ul className="grid gap-2">
              {data.topPages.map((p) => (
                <li key={p.path}>
                  <button
                    type="button"
                    onClick={() => setDetailPath(detailPath === p.path ? null : p.path)}
                    className="grid w-full gap-1 text-right text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-bold" title={p.path}>{p.path}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {p.views.toLocaleString('ar-EG')} · {p.uniqueVisitors} فريد
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-[#675de8]"
                        style={{ width: `${Math.max(4, Math.round((p.views / totalTop) * 100))}%` }}
                      />
                    </div>
                  </button>
                  {detailPath === p.path && detail && (
                    <div className="mt-2 rounded-xl border border-[#675de8]/25 bg-[#f5f3ff] px-3 py-2 text-[11px] dark:bg-[#1a1830]">
                      <strong>تفاصيل المسار</strong>
                      <div className="mt-1 text-muted-foreground">المشاهدات: {detail.views.toLocaleString('ar-EG')}</div>
                      <div className="text-muted-foreground">الزوار الفريدون: {detail.uniqueVisitors}</div>
                      {(p.path.startsWith('/books/') || p.path.startsWith('/quotes') || p.path.startsWith('/articles')) && (
                        <Link href={p.path} className="mt-1 inline-block font-bold text-[#675de8]">
                          فتح الصفحة ←
                        </Link>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[20px] border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-extrabold">حسب نوع الصفحة</h2>
          {data.byPageType.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا بيانات.</p>
          ) : (
            <ul className="grid gap-2">
              {data.byPageType.map((t) => (
                <li key={t.type}>
                  <button
                    type="button"
                    onClick={() => {
                      if (t.type === 'other') setShowOther((v) => !v);
                    }}
                    className="flex w-full items-center justify-between rounded-xl border border-border/60 px-3 py-2.5 text-xs"
                  >
                    <span className="font-bold">
                      {TYPE_AR[t.type] || t.type}
                      {t.type === 'other' && data.otherPaths?.length ? ` (${t.views})` : ''}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {t.views.toLocaleString('ar-EG')} · {t.uniqueVisitors} زائر
                    </span>
                  </button>
                  {t.type === 'other' && showOther && (data.otherPaths?.length ?? 0) > 0 && (
                    <ul className="mt-2 mr-2 grid gap-1 border-r border-border pr-3">
                      {data.otherPaths!.map((o) => (
                        <li key={o.path} className="flex justify-between text-[11px] text-muted-foreground">
                          <span className="truncate font-mono">{o.path}</span>
                          <span className="tabular-nums">{o.views}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-[20px] border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-extrabold">أكثر الروايات مشاهدة</h2>
          <Link href="/explore" className="text-[11px] font-bold text-[#675de8]">
            عرض المكتبة
          </Link>
        </div>
        {data.topNovels.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا زيارات لصفحات روايات في هذه الفترة — طبيعي مع بيانات قليلة.</p>
        ) : (
          <ol className="grid gap-2 sm:grid-cols-2">
            {data.topNovels.map((n, i) => (
              <li key={n.slug}>
                <Link
                  href={`/books/${n.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-xs transition hover:border-[#675de8]/40"
                >
                  <span className="grid size-7 place-items-center rounded-lg bg-[#efeeff] text-[11px] font-extrabold text-[#675de8]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-bold">{decodeURIComponent(n.slug)}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {n.views.toLocaleString('ar-EG')} مشاهدة
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
