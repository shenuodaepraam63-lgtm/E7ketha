import { BarChart3, BookOpen, FileClock, Loader2, Megaphone, Plus, Tags, Users, UserCog, WandSparkles } from 'lucide-react';
import { Link } from 'wouter';
import { trpc } from '@/lib/trpc';

type Section = 'overview' | 'novels' | 'quotes' | 'authors' | 'genres' | 'users' | 'reports' | 'audit' | 'trash' | 'notifications' | 'messages' | 'ads';

export function AdminOverview({ onSelect }: { onSelect: (section: Section) => void }) {
  const summary = trpc.admin.summary.useQuery();
  const data = summary.data;

  const stats = [
    { label: 'الروايات', value: data?.novels ?? 0, icon: BookOpen },
    { label: 'المؤلفون', value: data?.authors ?? 0, icon: Users },
    { label: 'التصنيفات', value: data?.genres ?? 0, icon: Tags },
    { label: 'الاقتباسات', value: data?.quotes ?? 0, icon: WandSparkles },
    { label: 'المستخدمون', value: data?.users ?? 0, icon: UserCog },
    { label: 'التقارير', value: data?.reports ?? 0, icon: BarChart3 },
  ];

  const chartItems = data?.chart ?? [];
  const maxVal = Math.max(1, ...chartItems.map((i) => i.value));

  const actions = [
    { label: 'إضافة رواية', href: '/novels/new', icon: Plus },
    { label: 'إدارة الاقتباسات', section: 'quotes' as const, icon: WandSparkles },
    { label: 'المؤلفون', section: 'authors' as const, icon: Users },
    { label: 'التقارير', section: 'reports' as const, icon: BarChart3 },
  ];

  if (summary.isLoading) {
    return <div className="grid min-h-[360px] place-items-center text-sm text-muted-foreground"><Loader2 className="animate-spin" /> جارٍ التحميل...</div>;
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-extrabold">نظرة عامة</h1>
        <p className="mt-2 text-xs text-muted-foreground">ملخص سريع لمحتوى المنصة والوصول السريع لأهم الإجراءات.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[20px] border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">{item.label}</span>
                <span className="grid size-9 place-items-center rounded-xl bg-[#efeeff] text-[#675de8]"><Icon size={16} /></span>
              </div>
              <div className="mt-3 text-2xl font-extrabold">{item.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          if ('href' in action && action.href) {
            return (
              <Link key={action.label} href={action.href} className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-4 text-sm font-bold transition hover:border-[#675de8]/40">
                <span className="grid size-10 place-items-center rounded-xl bg-[#171e42] text-white"><Icon size={16} /></span>
                {action.label}
              </Link>
            );
          }
          return (
            <button key={action.label} type="button" onClick={() => action.section && onSelect(action.section)} className="flex items-center gap-3 rounded-[18px] border border-border bg-card p-4 text-sm font-bold transition hover:border-[#675de8]/40">
              <span className="grid size-10 place-items-center rounded-xl bg-[#171e42] text-white"><Icon size={16} /></span>
              {action.label}
            </button>
          );
        })}
      </div>

      {chartItems.length > 0 && (
        <div className="rounded-[20px] border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-extrabold"><FileClock size={16} /> نشاط حديث</div>
          <div className="grid gap-2">
            {chartItems.map((item) => (
              <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
                <div>
                  <div className="mb-1 font-bold">{item.label}</div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-[#675de8]" style={{ width: `${Math.round((item.value / maxVal) * 100)}%` }} />
                  </div>
                </div>
                <span className="font-extrabold text-[#675de8]">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
