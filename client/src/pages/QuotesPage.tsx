import { ArrowLeft, ArrowRight, BookOpen, Quote, Loader2, ChevronsLeft, ChevronsRight, Search, SlidersHorizontal } from 'lucide-react';
import { Link, useRoute } from 'wouter';
import { useEffect, useMemo, useState } from 'react';
import { PageIntro, Breadcrumbs, EmptyState } from '@/components/SiteShell';
import { AdSlot, AutoRelaxedAd, FeedAdSlot } from '@/components/AdSlot';
import { trpc } from '@/lib/trpc';
import { QuoteActions } from '@/components/QuoteActions';
import { toast } from 'sonner';

const PAGE_SIZE = 12;
type QuoteListItem = { id: number; quote_text: string; category: string | null; author_name: string | null; speaker: string | null; book_title: string | null; book_slug: string | null; author_slug: string | null };

function playQuoteOpenSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    gain.connect(context.destination);
    [220, 440, 660].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, now + 0.2);
      oscillator.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + 0.25);
    });
    window.setTimeout(() => void context.close(), 320);
  } catch { /* ignore */ }
}

function PaginationBar({
  page,
  totalPages,
  onPage,
  isFetching,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  isFetching: boolean;
}) {
  const [draft, setDraft] = useState(String(page));
  useEffect(() => setDraft(String(page)), [page]);

  const windowPages = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [page, totalPages]);

  const go = (p: number) => {
    const next = Math.min(totalPages, Math.max(1, p));
    if (next !== page) onPage(next);
  };

  return (
    <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
      <p className="text-xs text-muted-foreground">
        صفحة <strong className="text-foreground">{page}</strong> من <strong className="text-foreground">{totalPages}</strong>
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button type="button" disabled={page <= 1 || isFetching} onClick={() => go(1)} className="grid size-9 place-items-center rounded-xl border border-border disabled:opacity-40" aria-label="الأولى">
          <ChevronsRight size={16} />
        </button>
        <button type="button" disabled={page <= 1 || isFetching} onClick={() => go(page - 1)} className="grid size-9 place-items-center rounded-xl border border-border disabled:opacity-40" aria-label="السابقة">
          <ArrowRight size={16} />
        </button>
        {windowPages[0] > 1 && <span className="px-1 text-muted-foreground">…</span>}
        {windowPages.map((p) => (
          <button
            key={p}
            type="button"
            disabled={isFetching}
            onClick={() => go(p)}
            className={`min-w-9 rounded-xl px-2.5 py-2 text-xs font-extrabold transition ${p === page ? 'bg-[#171e42] text-white' : 'border border-border hover:border-[#675de8]/40'}`}
          >
            {p}
          </button>
        ))}
        {windowPages[windowPages.length - 1] < totalPages && <span className="px-1 text-muted-foreground">…</span>}
        <button type="button" disabled={page >= totalPages || isFetching} onClick={() => go(page + 1)} className="grid size-9 place-items-center rounded-xl border border-border disabled:opacity-40" aria-label="التالية">
          <ArrowLeft size={16} />
        </button>
        <button type="button" disabled={page >= totalPages || isFetching} onClick={() => go(totalPages)} className="grid size-9 place-items-center rounded-xl border border-border disabled:opacity-40" aria-label="الأخيرة">
          <ChevronsLeft size={16} />
        </button>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(draft);
          if (Number.isInteger(n)) go(n);
        }}
      >
        <label className="text-[11px] text-muted-foreground">انتقال لصفحة</label>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-16 rounded-xl border border-border bg-card px-2 py-2 text-center text-xs font-bold outline-none focus:border-[#675de8]"
        />
        <button type="submit" className="rounded-xl bg-[#171e42] px-3 py-2 text-[11px] font-extrabold text-white">
          اذهب
        </button>
      </form>
    </div>
  );
}

export default function QuotesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const offset = (page - 1) * PAGE_SIZE;

  const query = trpc.quotes.list.useQuery(
    { limit: PAGE_SIZE, offset },
    {
      /* PATCH_QUOTES_PAGINATION */
      // Only the active page — no previous-page bleed into the grid.
      placeholderData: undefined,
      refetchOnMount: false,
      staleTime: 60_000,
    },
  );
  const countQuery = trpc.quotes.count.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const categories = trpc.quotes.categories.useQuery(undefined, { staleTime: 10 * 60 * 1000 });

  useEffect(() => {
    setPage(1);
  }, [search, category]);

  const raw = query.data as unknown;
  const items = (Array.isArray(raw) ? raw : ((raw as { items?: unknown[] })?.items ?? [])) as QuoteListItem[];
  const apiTotal = !Array.isArray(raw) && raw && typeof raw === 'object' && 'total' in raw
    ? Number((raw as { total: number }).total)
    : countQuery.data;

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (!category || item.category === category) &&
          `${item.quote_text} ${item.author_name ?? item.speaker ?? ''} ${item.book_title ?? ''} ${item.category ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase().trim()),
      ),
    [items, search, category],
  );

  const total = typeof apiTotal === 'number' && apiTotal > 0 ? apiTotal : Math.max(offset + items.length + (items.length >= PAGE_SIZE ? PAGE_SIZE : 0), offset + items.length);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const goPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const randomPage = () => {
    const next = Math.floor(Math.random() * totalPages) + 1;
    goPage(next);
    toast.success(`انتقلنا لمجموعة الصفحة ${next}`);
  };

  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['اقتباسات الكتب']} />
      <PageIntro
        eyebrow="بين السطور"
        title="اقتباسات عربية تستحق الحفظ"
        description="اكتشف اقتباسات مؤثرة عن الحب والحياة والفلسفة والقراءة من أشهر الروايات والكتّاب العرب — تصفّح بالصفحات بدل التحميل المتقطع."
      />

      <div className="mb-8 rounded-[26px] border border-border bg-card p-3 shadow-[0_18px_50px_-42px_rgba(22,30,70,.55)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[240px] flex-1 items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
            <Search size={18} className="text-[#675de8]" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              placeholder="ابحث في النص أو الكاتب أو الرواية..."
              aria-label="ابحث في الاقتباسات"
            />
          </div>
          <label className="flex items-center gap-2 rounded-2xl border border-border px-4 py-3 text-xs font-bold">
            <SlidersHorizontal size={15} className="text-[#675de8]" />
            <span className="sr-only">التصنيف</span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="bg-transparent outline-none"
            >
              <option value="">كل التصنيفات</option>
              {(categories.data ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <Link href="/quotes/categories" className="rounded-2xl bg-[#171e42] px-4 py-3 text-xs font-extrabold text-white">
            تصفح التصنيفات
          </Link>
          <button
            type="button"
            onClick={randomPage}
            disabled={query.isFetching}
            className="rounded-2xl border border-[#675de8]/30 bg-[#f0eeff] px-4 py-3 text-xs font-extrabold text-[#5548d1] dark:bg-[#24224c] dark:text-[#c8c4ff]"
          >
            مجموعة عشوائية
          </button>
        </div>
        <p className="px-2 pt-3 text-[11px] text-muted-foreground">
          {typeof apiTotal === 'number'
            ? `إجمالي ${apiTotal.toLocaleString('ar-EG')} اقتباس · ${PAGE_SIZE} في كل صفحة`
            : filtered.length
              ? `نعرض ${filtered.length} اقتباس في هذه الصفحة`
              : 'جرّب كلمة بحث أو تصنيفًا آخر'}
        </p>
      </div>

      <AdSlot slot="4836372120" format="horizontal" className="mx-auto max-w-4xl" />
      <FeedAdSlot className="mx-auto max-w-4xl" />

      {query.isLoading || (query.isFetching && !(Array.isArray(query.data) ? query.data : (query.data as { items?: unknown[] })?.items)?.length) ? (
        <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="animate-spin" size={18} /> جارٍ تحميل الاقتباسات...
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item, index) => (
              <Link
                key={item.id}
                href={`/quotes/${item.id}`}
                onClick={playQuoteOpenSound}
                className="quote-card group relative overflow-hidden rounded-[26px] border border-border bg-card p-6 shadow-[0_18px_50px_-38px_rgba(22,30,70,.5)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_58px_-34px_rgba(91,77,232,.35)]"
              >
                <div className="mb-8 flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-2xl bg-[#f0eeff] text-[#675de8] dark:bg-[#24224c] dark:text-[#bcb7ff]">
                    <Quote size={20} />
                  </span>
                  <span className="text-[11px] font-bold text-muted-foreground">
                    {String(offset + index + 1).padStart(2, '0')}
                  </span>
                </div>
                <blockquote className="text-lg font-extrabold leading-9 tracking-[-.04em]">“{item.quote_text}”</blockquote>
                <div className="mt-8 flex items-center gap-3 border-t border-border pt-4">
                  <BookOpen size={15} className="text-[#675de8]" />
                  <div>
                    {item.book_slug ? (
                      <Link href={`/books/${item.book_slug}`} onClick={(e) => e.stopPropagation()} className="block text-xs font-extrabold hover:text-[#675de8]">
                        {item.book_title}
                      </Link>
                    ) : (
                      <p className="text-xs font-extrabold">{item.book_title || 'مصدر غير محدد'}</p>
                    )}
                    {item.author_slug ? (
                      <Link href={`/authors/${item.author_slug}`} onClick={(e) => e.stopPropagation()} className="mt-1 block text-[10px] text-muted-foreground hover:text-[#675de8]">
                        {item.author_name}
                      </Link>
                    ) : (
                      <p className="mt-1 text-[10px] text-muted-foreground">{item.author_name || item.speaker || 'القائل غير محدد'}</p>
                    )}
                    {item.category && <p className="mt-1 text-[10px] text-muted-foreground">{item.category}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {!filtered.length && (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">لا توجد اقتباسات مطابقة.</div>
          )}

          <PaginationBar page={page} totalPages={totalPages} onPage={goPage} isFetching={query.isFetching} />
        </>
      )}

      <div className="mt-12 rounded-[24px] bg-[#171e42] p-7 text-white md:flex md:items-center md:justify-between md:gap-8">
        <div>
          <p className="text-xs font-bold text-[#c9c4ff]">اكتشف المزيد</p>
          <h2 className="mt-2 text-xl font-extrabold">ابحث عن الرواية التي خرج منها اقتباسك المفضل.</h2>
        </div>
        <Link href="/explore" className="mt-5 inline-flex rounded-xl bg-[#eeeefe] px-5 py-3 text-xs font-extrabold text-[#171e42] md:mt-0">
          استكشف الروايات
        </Link>
      </div>
    </div>
  );
}

export function QuotePage() {
  const [, params] = useRoute('/quotes/:id');
  const id = Number(params?.id);
  const query = trpc.quotes.byId.useQuery({ id }, { enabled: Number.isInteger(id) && id > 0 });
  const item = query.data;
  if (query.isLoading) return <div className="container py-20 text-center text-muted-foreground">جارٍ تحميل الاقتباس...</div>;
  if (!item) return <div className="container py-16"><EmptyState title="الاقتباس غير موجود" description="قد يكون الاقتباس غير منشور أو أُزيل من الأرشيف." action="تصفح الاقتباسات" /></div>;
  return (
    <div className="container py-10 md:py-20">
      <Breadcrumbs items={['اقتباسات الكتب', item.book_title || 'اقتباس']} />
      <article className="mx-auto max-w-3xl rounded-[30px] border border-border bg-card p-7 shadow-xl md:p-14">
        <Quote className="mb-8 text-[#675de8]" size={38} />
        <blockquote className="text-2xl font-extrabold leading-[2] md:text-4xl">“{item.quote_text}”</blockquote>
        <div className="mt-10 border-t border-border pt-6">
          <p className="font-extrabold">{item.author_name || item.speaker || 'القائل غير محدد'}</p>
          <p className="mt-2 text-sm text-muted-foreground">{item.book_title || 'مصدر غير محدد'}</p>
        </div>
        <QuoteActions quote={item} />
        <div className="mt-4">
          <Link href="/quotes" className="rounded-xl border border-border px-4 py-3 text-xs font-bold">تصفح كل الاقتباسات</Link>
        </div>
      </article>
      <AutoRelaxedAd className="mx-auto max-w-3xl" />
      <AdSlot slot="4836372120" format="horizontal" className="mx-auto max-w-3xl" />
    </div>
  );
}
