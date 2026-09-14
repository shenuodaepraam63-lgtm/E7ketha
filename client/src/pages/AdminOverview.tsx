import { BarChart3, BookOpen, FileClock, Loader2, Megaphone, Plus, Tags, Users, UserCog, WandSparkles } from 'lucide-react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';

type Section = 'overview' | 'novels' | 'quotes' | 'authors' | 'genres' | 'users' | 'reports' | 'audit' | 'trash' | 'notifications' | 'messages' | 'ads';

const fmt = (n: number | undefined) => (n ?? 0).toLocaleString('ar-EG');

export function AdminOverview({ onSelect }: { onSelect: (section: Section) => void }) {
  const summary = trpc.admin.summary.useQuery();
  const s = summary.data;

  const cards = [
    { label: 'الروايات', value: s?.novels, section: 'novels' as const, icon: BookOpen, hint: 'كل الكتب المنشورة' },
    { label: 'الاقتباسات', value: s?.quotes, section: 'quotes' as const, icon: WandSparkles, hint: s ? `${fmt((s as any).publishedQuotes)} منشور · ${fmt((s as any).draftQuotes)} مسودة` : '—' },
    { label: 'المؤلفون', value: s?.authors, section: 'authors' as const, icon: Users, hint: 'مرتبطون بالروايات' },
    { label: 'التصنيفات', value: (s as any)?.genres, section: 'genres' as const, icon: Tags, hint: 'أبواب الاستكشاف' },
    { label: 'المستخدمون', value: (s as any)?.users, section: 'users' as const, icon: UserCog, hint: 'حسابات مسجّلة' },
    { label: 'بانتظار المراجعة', value: s?.needsReview, section: 'reports' as const, icon: FileClock, hint: 'مراجعات معلّقة' },
  ];

  const chartItems = [
    { label: 'روايات', value: s?.novels ?? 0, color: '#675de8' },
    { label: 'اقتباسات', value: (s as any)?.quotes ?? 0, color: '#25d366' },
    { label: 'مؤلفون', value: s?.authors ?? 0, color: '#f59e0b' },
    { label: 'تصنيفات', value: (s as any)?.genres ?? 0, color: '#3b82f6' },
    { label: 'مستخدمون', value: (s as any)?.users ?? 0, color: '#ec4899' },
  ];
  const maxVal = Math.max(1, ...chartItems.map((i) => i.value));

  const actions = [
    { label: 'إضافة رواية', href: '/admin/novels/new', icon: Plus },
    { label: 'إدارة الاقتباسات', section: 'quotes' as const, icon: WandSparkles },
    { label: 'المؤلفون', section: 'authors' as const, icon: Users },
    { label: 'التقارير', section: 'reports' as const, icon: BarChart3 },
    { label: 'الإعلانات', section: 'ads' as const, icon: Megaphone },
  ];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">نظرة عامة</h1>
        <p className="mt-2 text-xs text-muted-foreground">ملخص حي من قاعدة البيانات — كل الأرقام حقيقية.</p>
      </div>

      {summary.isLoading ? (
        <div className="grid min-h-[200px] place-items-center"><Loader2 className="animate-spin text-[#675de8]" size={28} /></div>
      ) : summary.error ? (
        <div className="rounded-[20px] border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-200">
          تعذر تحميل الإحصائيات: {summary.error.message}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.label}
                  type="button"
                  onClick={() => onSelect(card.section)}
                  className="rounded-[20px] border border-border bg-card p-5 text-right transition hover:-translate-y-0.5 hover:border-[#8279ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#675de8]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs text-muted-foreground">{card.label}</span>
                      <strong className="mt-2 block text-3xl font-extrabold tracking-tight">{fmt(card.value as number | undefined)}</strong>
                      <span className="mt-2 block truncate text-[10px] text-muted-foreground">{card.hint}</span>
                    </div>
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#efeeff] text-[#675de8] dark:bg-[#24224c]">
                      <Icon size={18} aria-hidden />
                    </div>
                  </div>
                  <span className="mt-4 block text-[10px] font-bold text-[#675de8]">إدارة المحتوى ←</span>
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-[20px] border border-border bg-card p-5">
              <h2 className="text-sm font-extrabold">توزيع المحتوى</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">مقارنة سريعة للكيانات الرئيسية في المنصة</p>
              <div className="mt-5 grid gap-3">
                {chartItems.map((item) => (
                  <div key={item.label} className="grid grid-cols-[72px_1fr_48px] items-center gap-2 text-xs">
                    <span className="truncate text-muted-foreground">{item.label}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(4, (item.value / maxVal) * 100)}%`, backgroundColor: item.color }} />
                    </div>
                    <strong className="text-left tabular-nums">{fmt(item.value)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[20px] border border-border bg-card p-5">
              <h2 className="text-sm font-extrabold">إجراءات سريعة</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">اختصارات للإدارة اليومية</p>
              <div className="mt-4 grid gap-2">
                {actions.map((action) => {
                  const Icon = action.icon;
                  if ('href' in action && action.href) {
                    return (
                      <Link key={action.label} href={action.href} className="flex items-center gap-3 rounded-xl border border-border px-3 py-3 text-xs font-bold transition hover:border-[#8279ee] hover:bg-muted/40">
                        <Icon size={15} className="text-[#675de8]" />
                        {action.label}
                      </Link>
                    );
                  }
                  return (
                    <button key={action.label} type="button" onClick={() => action.section && onSelect(action.section)} className="flex items-center gap-3 rounded-xl border border-border px-3 py-3 text-right text-xs font-bold transition hover:border-[#8279ee] hover:bg-muted/40">
                      <Icon size={15} className="text-[#675de8]" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
