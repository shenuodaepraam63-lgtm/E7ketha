import { Filter, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NovelCard, NovelListRow } from '@/components/NovelCard';
import { Breadcrumbs, EmptyState, PageIntro } from '@/components/SiteShell';
import { authors, genres, novels as staticNovels, type Novel } from '@/lib/data';
import { trpc } from '@/lib/trpc';

const statusOptions = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'completed', label: 'مكتملة' },
  { value: 'ongoing', label: 'مستمرة' },
  { value: 'standalone', label: 'منفردة' },
] as const;

const statusLabels: Record<string, string> = { completed: 'مكتملة', ongoing: 'مستمرة', standalone: 'منفردة' };
const sortOptions = [
  { value: 'popular', label: 'الأكثر شعبية' },
  { value: 'rating', label: 'الأعلى تقييمًا' },
  { value: 'newest', label: 'الأحدث' },
  { value: 'title', label: 'الاسم أبجديًا' },
] as const;

function toNovel(row: { id: number; slug: string; title: string; coverUrl: string | null; description: string | null; rating: number; parts: number; status: string; author: string; authorSlug: string }): Novel {
  const fallback = staticNovels.find((item) => item.slug === row.slug);
  return fallback ?? {
    id: String(row.id), slug: row.slug, title: row.title, author: row.author, authorSlug: row.authorSlug,
    cover: row.coverUrl ?? 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=700&q=88',
    genres: [], rating: row.rating / 100, parts: row.parts, status: statusLabels[row.status] ?? row.status,
    description: row.description ?? '', accent: '#7067ef',
  };
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label className="grid gap-2 text-xs font-bold"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none transition focus:border-[#8279ee]">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

export function ExplorePage() {
  const [sort, setSort] = useState<'popular' | 'rating' | 'newest' | 'title'>('popular');
  const searchInput = useMemo(() => ({ sort, limit: 50 }), [sort]);
  const query = trpc.novels.search.useQuery(searchInput);
  const result = query.data ? query.data.map(toNovel) : staticNovels;
  return <div className="container py-10 md:py-16"><Breadcrumbs items={['استكشف']} /><PageIntro eyebrow="اكتشف أكثر" title="كل الروايات في مكان واحد" description="تصفح مكتبة اكتشاف متجددة، مع بحث وفلاتر تساعدك تختار بثقة." /><div className="mb-8 flex flex-col justify-between gap-4 rounded-[20px] border border-border bg-card p-4 md:flex-row md:items-center"><div className="w-full md:max-w-sm"><GlobalSearch /></div><div className="flex items-center gap-2 overflow-x-auto text-xs"><span className="shrink-0 text-muted-foreground">رتّب حسب</span>{sortOptions.map((item) => <button key={item.value} onClick={() => setSort(item.value)} className={`shrink-0 rounded-lg px-3 py-2 font-bold ${sort === item.value ? 'bg-[#171e42] text-white dark:bg-[#eeeefe] dark:text-[#171e42]' : 'bg-muted text-muted-foreground'}`}>{item.label}</button>)}</div></div>{query.isLoading && <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={15} className="animate-spin" /> نبحث في مكتبة رِواية...</div>}<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{result.map((novel) => <NovelCard key={novel.id} novel={novel} />)}</div></div>;
}

export function SearchPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] ?? '');
  const query = params.get('q') ?? '';
  const [activeTab, setActiveTab] = useState('الكل');
  const [genreFilter, setGenreFilter] = useState('all');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minRating, setMinRating] = useState('0');
  const [sort, setSort] = useState<'popular' | 'rating' | 'newest' | 'title'>('popular');
  const [mobileFilters, setMobileFilters] = useState(false);
  const searchInput = useMemo(() => ({
    q: query || undefined,
    genreSlug: genreFilter === 'all' ? undefined : genreFilter,
    authorSlug: authorFilter === 'all' ? undefined : authorFilter,
    status: statusFilter === 'all' ? undefined : statusFilter as 'standalone' | 'completed' | 'ongoing',
    minRating: Number(minRating) || undefined,
    sort,
    limit: 50,
  }), [authorFilter, genreFilter, minRating, query, sort, statusFilter]);
  const resultQuery = trpc.novels.search.useQuery(searchInput);
  const facetQuery = trpc.novels.facets.useQuery();
  const filtered = (resultQuery.data ?? []).map(toNovel);
  const clearFilters = () => { setGenreFilter('all'); setAuthorFilter('all'); setStatusFilter('all'); setMinRating('0'); setSort('popular'); };
  const activeFilters = [genreFilter !== 'all', authorFilter !== 'all', statusFilter !== 'all', minRating !== '0'].filter(Boolean).length;
  return <div className="container py-10 md:py-16"><Breadcrumbs items={['نتائج البحث']} /><div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><PageIntro eyebrow="البحث المتقدم" title="اعثر على روايتك التالية" description={query ? `نتائج البحث عن «${query}»` : 'استخدم الكلمات والفلاتر للوصول إلى الرواية المناسبة بسرعة.'} /><div className="w-full lg:max-w-md"><GlobalSearch /></div></div><div className="mb-8 flex gap-2 overflow-x-auto border-b border-border pb-2">{['الكل', 'الروايات', 'المؤلفون', 'التصنيفات', 'السلاسل'].map((tab) => <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 border-b-2 px-4 pb-3 text-xs font-bold ${activeTab === tab ? 'border-[#7067ef] text-[#6158df]' : 'border-transparent text-muted-foreground'}`}>{tab}</button>)}</div><div className="grid gap-8 lg:grid-cols-[250px_1fr]"><aside className={`${mobileFilters ? 'block' : 'hidden'} rounded-[20px] border border-border bg-card p-5 lg:block`}><div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-extrabold">تصفية النتائج {activeFilters > 0 && <span className="mr-1 rounded-full bg-[#7067ef] px-2 py-0.5 text-[10px] text-white">{activeFilters}</span>}</h2><Filter size={16} className="text-[#7067ef]" /></div><div className="grid gap-4"><FilterSelect label="التصنيف" value={genreFilter} onChange={setGenreFilter} options={[{ value: 'all', label: 'كل التصنيفات' }, ...(facetQuery.data?.genres ?? genres).map((item) => ({ value: item.slug, label: item.name }))]} /><FilterSelect label="المؤلف" value={authorFilter} onChange={setAuthorFilter} options={[{ value: 'all', label: 'كل المؤلفين' }, ...(facetQuery.data?.authors ?? authors).map((item) => ({ value: item.slug, label: item.name }))]} /><FilterSelect label="الحالة" value={statusFilter} onChange={setStatusFilter} options={statusOptions.map((item) => ({ value: item.value, label: item.label }))} /><FilterSelect label="الحد الأدنى للتقييم" value={minRating} onChange={setMinRating} options={[{ value: '0', label: 'كل التقييمات' }, { value: '4', label: '4 نجوم فأعلى' }, { value: '4.5', label: '4.5 نجوم فأعلى' }]} /><FilterSelect label="الترتيب" value={sort} onChange={(value) => setSort(value as typeof sort)} options={sortOptions.map((item) => ({ value: item.value, label: item.label }))} /></div>{activeFilters > 0 && <button onClick={clearFilters} className="mt-5 flex items-center gap-2 text-xs font-bold text-[#675de8] hover:underline"><X size={14} /> مسح الفلاتر</button>}</aside><section><button onClick={() => setMobileFilters(!mobileFilters)} className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold lg:hidden"><SlidersHorizontal size={15} /> تصفية النتائج {activeFilters > 0 && `(${activeFilters})`}</button>{resultQuery.isLoading ? <div className="flex min-h-72 items-center justify-center rounded-[20px] border border-dashed border-border text-sm text-muted-foreground"><Loader2 size={18} className="ml-2 animate-spin" /> جارٍ البحث...</div> : filtered.length > 0 ? <div className="grid gap-4">{filtered.map((novel) => <NovelListRow key={novel.id} novel={novel} />)}</div> : <EmptyState title="لم نجد روايات مطابقة" description="جرّب كلمة مختلفة أو غيّر التصنيف والمؤلف والحالة." action="استكشف كل الروايات" href="/explore" />}<div className="mt-8 flex items-center justify-between text-xs text-muted-foreground"><span>عرض {filtered.length} نتيجة</span><Link href="/explore" className="font-bold text-[#675de8] hover:underline">استكشف كل الروايات</Link></div></section></div></div>;
}
