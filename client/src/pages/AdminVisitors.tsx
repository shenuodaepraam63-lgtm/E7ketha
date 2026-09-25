import { Activity, AlertCircle, Eye, Loader2, RefreshCw, Users } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'wouter';
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

function delta(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? '+100%' : '—';
  const pct = Math.round(((current - previous) / previous) * 100);
  return pct >= 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`;
}

export function AdminVisitors() {
  const [range, setRange] = useState<Range>('today');
  const query = trpc.admin.visitors.useQuery({ range }, { staleTime: 30_000, refetchOnWindowFocus: false });

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

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">الزوار والتحليلات</h1>
          <p className="mt-2 max-w-xl text-xs leading-6 text-muted-foreground">
            مشاهدات الصفحات وزوار فريدون بمُعرّف مجهول (بدون IP أو بيانات شخصية). لا يُسجَّل التمرير أو حركة الفأرة.
          </p>
        </div>
        <div className="flex gap-2">
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
          <strong>جدول page_views غير متاح.</strong> نفّذ SQL مرة واحدة في Supabase SQL Editor من الملف{' '}
          <code className="font-mono">scripts/sql/page_views.sql</code> ثم انتظر زيارات جديدة.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] border border-border bg-card p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>الزوار الفريدون</span>
            <Users size={16} className="text-[#675de8]" />
          </div>
          <div className="mt-3 text-3xl font-extrabold tabular-nums">{data.uniqueVisitors.toLocaleString('ar-EG')}</div>
          <p className="mt-2 text-[11px] font-bold text-[#675de8]">
            {delta(data.uniqueVisitors, data.previousUniqueVisitors)} مقارنة بالفترة السابقة
          </p>
        </div>
        <div className="rounded-[20px] border border-border bg-card p-5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>مشاهدات الصفحات</span>
            <Eye size={16} className="text-[#675de8]" />
          </div>
          <div className="mt-3 text-3xl font-extrabold tabular-nums">{data.pageViews.toLocaleString('ar-EG')}</div>
          <p className="mt-2 text-[11px] font-bold text-[#675de8]">
            {delta(data.pageViews, data.previousPageViews)} مقارنة بالفترة السابقة
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[20px] border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold">
            <Activity size={16} /> أكثر الصفحات زيارة
          </h2>
          {data.topPages.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا بيانات بعد في هذه الفترة.</p>
          ) : (
            <ul className="grid gap-2">
              {data.topPages.map((p) => (
                <li key={p.path} className="grid gap-1 text-xs">
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
                <li key={t.type} className="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5 text-xs">
                  <span className="font-bold">{TYPE_AR[t.type] || t.type}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {t.views.toLocaleString('ar-EG')} مشاهدة · {t.uniqueVisitors} زائر
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-[20px] border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-extrabold">أكثر الروايات مشاهدة</h2>
        {data.topNovels.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا زيارات لصفحات روايات في هذه الفترة.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.topNovels.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`/books/${n.slug}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2.5 text-xs transition hover:border-[#675de8]/40"
                >
                  <span className="min-w-0 truncate font-bold">{decodeURIComponent(n.slug)}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{n.views}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
