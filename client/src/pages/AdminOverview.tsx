import {
  BarChart3,
  BookOpen,
  FileText,
  Loader2,
  Megaphone,
  Plus,
  Tags,
  Users,
  UserCog,
  WandSparkles,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';

type Section =
  | 'overview'
  | 'novels'
  | 'quotes'
  | 'articles'
  | 'authors'
  | 'genres'
  | 'users'
  | 'reports'
  | 'audit'
  | 'trash'
  | 'notifications'
  | 'messages'
  | 'ads';

export function AdminOverview({ onSelect }: { onSelect: (section: Section) => void }) {
  const summary = trpc.admin.summary.useQuery();
  const data = summary.data;

  if (summary.isLoading) {
    return (
      <div className="grid min-h-[360px] place-items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="animate-spin" /> جارٍ تحميل لوحة التحكم…
      </div>
    );
  }

  if (summary.isError) {
    return (
      <div className="grid min-h-[360px] place-items-center gap-3 text-center">
        <AlertCircle className="text-red-500" size={28} />
        <p className="text-sm font-bold text-red-600">تعذر تحميل ملخص المنصة</p>
        <p className="max-w-sm text-xs text-muted-foreground">{summary.error.message}</p>
        <button
          type="button"
          onClick={() => void summary.refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold"
        >
          <RefreshCw size={14} /> إعادة المحاولة
        </button>
      </div>
    );
  }

  const stats = [
    { label: 'الروايات', value: data?.novels ?? 0, icon: BookOpen, section: 'novels' as Section },
    { label: 'المؤلفون', value: data?.authors ?? 0, icon: Users, section: 'authors' as Section },
    { label: 'التصنيفات', value: data?.genres ?? 0, icon: Tags, section: 'genres' as Section },
    { label: 'الاقتباسات', value: data?.quotes ?? 0, icon: WandSparkles, section: 'quotes' as Section },
    { label: 'المقالات', value: data?.articles ?? 0, icon: FileText, section: 'articles' as Section },
    { label: 'المستخدمون', value: data?.users ?? 0, icon: UserCog, section: 'users' as Section },
  ];

  const quotePub = data?.publishedQuotes ?? 0;
  const quoteDraft = data?.draftQuotes ?? 0;
  const recentNovels = data?.recentNovels ?? [];
  const recentArticles = data?.recentArticles ?? [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold text-[#675de8]">لوحة التحكم</p>
          <h1 className="text-2xl font-extrabold md:text-3xl">أهلاً بك 👋</h1>
          <p className="mt-2 max-w-xl text-xs leading-6 text-muted-foreground">
            ملخص حالة محتوى E7ketha الآن — الأرقام من قاعدة البيانات مباشرة.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelect('novels')}
          className="inline-flex items-center gap-2 rounded-xl bg-[#675de8] px-4 py-2.5 text-xs font-extrabold text-white"
        >
          <Plus size={14} /> إضافة رواية
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onSelect(item.section)}
              className="rounded-[20px] border border-border bg-card p-5 text-right transition hover:-translate-y-0.5 hover:border-[#675de8]/35 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">{item.label}</span>
                <span className="grid size-9 place-items-center rounded-xl bg-[#efeeff] text-[#675de8]">
                  <Icon size={16} />
                </span>
              </div>
              <div className="mt-3 text-2xl font-extrabold tabular-nums">{item.value}</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[20px] border border-border bg-card p-5">
          <span className="text-[11px] text-muted-foreground">اقتباسات منشورة</span>
          <strong className="mt-2 block text-xl font-extrabold tabular-nums">{quotePub}</strong>
        </div>
        <div className="rounded-[20px] border border-border bg-card p-5">
          <span className="text-[11px] text-muted-foreground">مسودات اقتباسات</span>
          <strong className="mt-2 block text-xl font-extrabold tabular-nums">{quoteDraft}</strong>
        </div>
        <button
          type="button"
          onClick={() => onSelect('reports')}
          className="rounded-[20px] border border-border bg-card p-5 text-right transition hover:border-[#675de8]/35"
        >
          <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
            <BarChart3 size={14} /> التقارير
          </span>
          <strong className="mt-2 block text-sm font-extrabold">عرض التحليلات ←</strong>
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[20px] border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold">آخر الروايات</h2>
            <button type="button" onClick={() => onSelect('novels')} className="text-[11px] font-bold text-[#675de8]">
              الكل
            </button>
          </div>
          {recentNovels.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد روايات حديثة.</p>
          ) : (
            <ul className="grid gap-2">
              {recentNovels.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2.5 text-xs">
                  <span className="min-w-0 truncate font-bold">{n.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{n.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-[20px] border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-extrabold">آخر المقالات</h2>
            <button type="button" onClick={() => onSelect('articles')} className="text-[11px] font-bold text-[#675de8]">
              الكل
            </button>
          </div>
          {recentArticles.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد مقالات حديثة.</p>
          ) : (
            <ul className="grid gap-2">
              {recentArticles.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2.5 text-xs">
                  <span className="min-w-0 truncate font-bold">{a.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { label: 'اقتباسات', section: 'quotes' as Section, icon: WandSparkles },
            { label: 'إعلانات', section: 'ads' as Section, icon: Megaphone },
            { label: 'مستخدمون', section: 'users' as Section, icon: UserCog },
          ] as const
        ).map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.section}
              type="button"
              onClick={() => onSelect(a.section)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-[11px] font-bold"
            >
              <Icon size={14} className="text-[#675de8]" /> {a.label}
            </button>
          );
        })}
        <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-[11px] font-bold">
          عرض الموقع
        </Link>
      </div>
    </div>
  );
}
