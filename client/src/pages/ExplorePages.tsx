import { trackSearch, trackGenreView } from '@/lib/browseRecs';
import { Filter, Loader2, Search, SlidersHorizontal, Star, X, BookOpen, User, Hash } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NovelCard, NovelListRow } from '@/components/NovelCard';
import { Breadcrumbs, EmptyState, PageIntro } from '@/components/SiteShell';
import { toNovel, toAuthor, toGenre, coverFallback, formatCount } from '@/lib/data';
import { trpc } from '@/lib/trpc';

const statusOptions = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'completed', label: 'مكتملة' },
  { value: 'ongoing', label: 'مستمرة' },
  { value: 'standalone', label: 'منفردة' },
] as const;

const sortOptions = [
  { value: 'popular', label: 'الأكثر شعبية' },
  { value: 'rating', label: 'الأعلى تقييمًا' },
  { value: 'newest', label: 'الأحدث' },
  { value: 'title', label: 'الاسم أبجديًا' },
] as const;

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-2 text-xs font-bold">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold outline-none transition focus:border-[#8279ee]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ExplorePage() {
  const [sort, setSort] = useState<'popular' | 'rating' | 'newest' | 'title'>('popular');
  const searchInput = useMemo(() => ({ sort, limit: 50 }), [sort]);
  const query = trpc.novels.search.useQuery(searchInput);
  const result = (query.data ?? []).map(toNovel);
  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['استكشف']} />
      <PageIntro
        eyebrow="اكتشف أكثر"
        title="كل الروايات في مكان واحد"
        description="تصفح مكتبة اكتشاف متجددة، مع بحث وفلاتر تساعدك تختار بثقة."
      />
      <div className="mb-8 flex flex-col justify-between gap-4 rounded-[20px] border border-border bg-card p-4 md:flex-row md:items-center">
        <div className="w-full md:max-w-md lg:max-w-lg">
          <GlobalSearch />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <span className="shrink-0 text-muted-foreground">رتّب حسب</span>
          {sortOptions.map((item) => (
            <button
              key={item.value}
              onClick={() => setSort(item.value)}
              className={`shrink-0 rounded-lg px-3 py-2 font-bold ${
                sort === item.value
                  ? 'bg-[#171e42] text-white dark:bg-[#eeeefe] dark:text-[#171e42]'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {query.isLoading && (
        <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={15} className="animate-spin" /> نبحث في مكتبة رِواية...
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {result.map((novel) => (
          <NovelCard key={novel.id} novel={novel} />
        ))}
      </div>
    </div>
  );
}

export function SearchPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split('?')[1] ?? '');
  const query = params.get('q') ?? '';
  const [activeTab, setActiveTab] = useState<'novels' | 'authors' | 'genres'>('novels');
  const [genreFilter, setGenreFilter] = useState('all');
  useEffect(() => { if (genreFilter !== 'all') trackGenreView(genreFilter); }, [genreFilter]);
  const [authorFilter, setAuthorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minRating, setMinRating] = useState('0');
  const [sort, setSort] = useState<'popular' | 'rating' | 'newest' | 'title'>('popular');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [mobileFilters, setMobileFilters] = useState(false);

  const searchInput = useMemo(
    () => ({
      q: query || undefined,
      genreSlug: genreFilter === 'all' ? undefined : genreFilter,
      authorSlug: authorFilter === 'all' ? undefined : authorFilter,
      status: statusFilter === 'all' ? undefined : (statusFilter as 'standalone' | 'completed' | 'ongoing'),
      minRating: Number(minRating) || undefined,
      sort,
      limit: 60,
    }),
    [authorFilter, genreFilter, minRating, query, sort, statusFilter],
  );

  const resultQuery = trpc.novels.search.useQuery(searchInput);
  const facetQuery = trpc.novels.facets.useQuery();
  const authorsQuery = trpc.authors.list.useQuery(undefined, { staleTime: 300_000 });
  const genresQuery = trpc.genres.list.useQuery(undefined, { staleTime: 300_000 });

  const novels = (resultQuery.data ?? []).map(toNovel);
  const needle = query.trim().toLowerCase();
  const matchedAuthors = useMemo(() => {
    const list = (authorsQuery.data ?? []).map(toAuthor);
    if (!needle) return list.slice(0, 24);
    return list.filter((a) => a.name.toLowerCase().includes(needle) || a.slug.includes(needle)).slice(0, 40);
  }, [authorsQuery.data, needle]);
  const matchedGenres = useMemo(() => {
    const list = (genresQuery.data ?? []).map(toGenre);
    if (!needle) return list.slice(0, 24);
    return list.filter((g) => g.name.toLowerCase().includes(needle) || g.slug.includes(needle)).slice(0, 40);
  }, [genresQuery.data, needle]);

  const clearFilters = () => {
    setGenreFilter('all');
    setAuthorFilter('all');
    setStatusFilter('all');
    setMinRating('0');
    setSort('popular');
  };
  const activeFilters = [genreFilter !== 'all', authorFilter !== 'all', statusFilter !== 'all', minRating !== '0'].filter(
    Boolean,
  ).length;

  const tabs = [
    { id: 'novels' as const, label: 'الروايات', count: novels.length, icon: BookOpen },
    { id: 'authors' as const, label: 'المؤلفون', count: matchedAuthors.length, icon: User },
    { id: 'genres' as const, label: 'التصنيفات', count: matchedGenres.length, icon: Hash },
  ];

  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['محرك البحث']} />

      <div className="mb-10 rounded-[28px] border border-border bg-gradient-to-b from-[#f7f6ff] to-card p-6 shadow-[0_20px_50px_-40px_rgba(22,30,70,.45)] dark:from-[#1a1c38] dark:to-card md:p-10">
        <p className="text-center text-[11px] font-bold tracking-[.14em] text-[#675de8]">محرك بحث الروايات</p>
        <h1 className="mt-2 text-center text-2xl font-extrabold tracking-[-.04em] md:text-4xl">
          {query ? `نتائج البحث عن «${query}»` : 'ابحث عن روايتك القادمة'}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-7 text-muted-foreground">
          ابحث بالعنوان أو بجملة طبيعية مثل «رواية رعب نفسي قصيرة» — نفهم التصنيف والطول تلقائيًا.
        </p>
        <div className="mx-auto mt-7 max-w-2xl">
          <GlobalSearch hero={false} />
        </div>
        {query && (
          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            {resultQuery.isLoading
              ? 'جارٍ البحث...'
              : `وجدنا ${formatCount(novels.length)} رواية · ${formatCount(matchedAuthors.length)} مؤلف · ${formatCount(matchedGenres.length)} تصنيف`}
          </p>
        )}
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-4 pb-3 text-xs font-bold transition ${
              activeTab === tab.id
                ? 'border-[#7067ef] text-[#6158df]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{tab.count}</span>
          </button>
        ))}
      </div>

      {activeTab === 'novels' && (
        <div className="grid gap-8 lg:grid-cols-[220px_1fr] xl:grid-cols-[240px_1fr]">
          <aside className={`${mobileFilters ? 'block' : 'hidden'} rounded-[20px] border border-border bg-card p-4 lg:p-5 lg:block`}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-extrabold">
                تصفية النتائج{' '}
                {activeFilters > 0 && (
                  <span className="mr-1 rounded-full bg-[#7067ef] px-2 py-0.5 text-[10px] text-white">{activeFilters}</span>
                )}
              </h2>
              <Filter size={16} className="text-[#7067ef]" />
            </div>
            <div className="grid gap-4">
              <FilterSelect
                label="التصنيف"
                value={genreFilter}
                onChange={setGenreFilter}
                options={[
                  { value: 'all', label: 'كل التصنيفات' },
                  ...(facetQuery.data?.genres ?? []).map((item) => ({ value: item.slug, label: item.name })),
                ]}
              />
              <FilterSelect
                label="المؤلف"
                value={authorFilter}
                onChange={setAuthorFilter}
                options={[
                  { value: 'all', label: 'كل المؤلفين' },
                  ...(facetQuery.data?.authors ?? []).map((item) => ({ value: item.slug, label: item.name })),
                ]}
              />
              <FilterSelect
                label="الحالة"
                value={statusFilter}
                onChange={setStatusFilter}
                options={statusOptions.map((item) => ({ value: item.value, label: item.label }))}
              />
              <FilterSelect
                label="الحد الأدنى للتقييم"
                value={minRating}
                onChange={setMinRating}
                options={[
                  { value: '0', label: 'كل التقييمات' },
                  { value: '4', label: '4 نجوم فأعلى' },
                  { value: '4.5', label: '4.5 نجوم فأعلى' },
                ]}
              />
              <FilterSelect
                label="الترتيب"
                value={sort}
                onChange={(v) => setSort(v as typeof sort)}
                options={sortOptions.map((item) => ({ value: item.value, label: item.label }))}
              />
            </div>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="mt-5 flex items-center gap-2 text-xs font-bold text-[#675de8] hover:underline">
                <X size={14} /> مسح الفلاتر
              </button>
            )}
          </aside>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => setMobileFilters(!mobileFilters)}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold lg:hidden"
              >
                <SlidersHorizontal size={15} /> تصفية {activeFilters > 0 && `(${activeFilters})`}
              </button>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  className={`rounded-lg px-3 py-2 font-bold ${view === 'grid' ? 'bg-[#171e42] text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  شبكة
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={`rounded-lg px-3 py-2 font-bold ${view === 'list' ? 'bg-[#171e42] text-white' : 'bg-muted text-muted-foreground'}`}
                >
                  قائمة
                </button>
              </div>
            </div>

            {resultQuery.isLoading ? (
              <div className="flex min-h-72 items-center justify-center rounded-[20px] border border-dashed border-border text-sm text-muted-foreground">
                <Loader2 size={18} className="ml-2 animate-spin" /> جارٍ البحث في المكتبة...
              </div>
            ) : novels.length > 0 ? (
              view === 'grid' ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                  {novels.map((novel) => (
                    <NovelCard key={novel.id} novel={novel} />
                  ))}
                </div>
              ) : (
                <div className="grid gap-4">
                  {novels.map((novel) => (
                    <NovelListRow key={novel.id} novel={novel} />
                  ))}
                </div>
              )
            ) : (
              <EmptyState
                title="لم نجد روايات مطابقة"
                description="جرّب كلمة مختلفة أو غيّر التصنيف والمؤلف والحالة."
                action="استكشف كل الروايات"
                href="/explore"
              />
            )}

            <div className="mt-8 flex items-center justify-between text-xs text-muted-foreground">
              <span>عرض {formatCount(novels.length)} نتيجة</span>
              <Link href="/explore" className="font-bold text-[#675de8] hover:underline">
                استكشف كل الروايات
              </Link>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'authors' && (
        <div>
          {matchedAuthors.length === 0 ? (
            <EmptyState title="لا يوجد مؤلفون مطابقون" description="جرّب اسمًا آخر." action="استكشف الروايات" href="/explore" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matchedAuthors.map((author) => (
                <Link
                  key={author.slug}
                  href={`/authors/${author.slug}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-[#675de8]/40 hover:shadow-md"
                >
                  <span className="grid size-14 place-items-center rounded-2xl bg-[#f0eeff] text-lg font-extrabold text-[#675de8] dark:bg-[#24224c]">
                    {author.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm">{author.name}</strong>
                    <span className="mt-1 block text-[11px] text-muted-foreground">{formatCount(author.books)} رواية</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'genres' && (
        <div>
          {matchedGenres.length === 0 ? (
            <EmptyState title="لا توجد تصنيفات مطابقة" description="جرّب كلمة أخرى." action="استكشف الروايات" href="/explore" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matchedGenres.map((genre) => (
                <Link
                  key={genre.slug}
                  href={`/genres/${genre.slug}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-[#675de8]/40 hover:shadow-md"
                >
                  <span className="grid size-14 place-items-center rounded-2xl bg-muted text-2xl">{genre.icon || '✦'}</span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm">{genre.name}</strong>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {genre.count ? `${formatCount(genre.count)} رواية` : 'تصفح التصنيف'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
