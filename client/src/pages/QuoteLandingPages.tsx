import { BookOpen, Quote, UserRound } from 'lucide-react';
import { Link, useLocation, useRoute } from 'wouter';
import { Breadcrumbs, EmptyState, PageIntro } from '@/components/SiteShell';
import { AdSlot, AutoRelaxedAd, FeedAdSlot } from '@/components/AdSlot';
import { trpc } from '@/lib/trpc';

function QuoteGrid({ quotes }: { quotes: any[] }) {
  const [, navigate] = useLocation();

  const openQuote = (item: any) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const audio = new AudioContextClass();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(520, audio.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(760, audio.currentTime + 0.08);
        gain.gain.setValueAtTime(0.0001, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.045, audio.currentTime + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.1);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.11);
        window.setTimeout(() => void audio.close(), 180);
      }
    } catch {
      /* Audio is optional and may be blocked by the browser. */
    }
    navigate(`/quotes/${item.id}`);
  };

  if (!quotes.length)
    return (
      <EmptyState
        title="لا توجد اقتباسات منشورة"
        description="ستظهر الاقتباسات هنا بعد مراجعتها ونشرها من لوحة الإدارة."
      />
    );

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {quotes.map((item, index) => (
        <article
          key={item.id}
          role="link"
          tabIndex={0}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) return;
            openQuote(item);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openQuote(item);
            }
          }}
          className="quote-card group relative cursor-pointer overflow-hidden rounded-[24px] border border-border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#675de8]"
        >
          <div className="mb-5 flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-xl bg-[#f0eeff] text-[#675de8]">
              <Quote size={18} />
            </span>
            <Link
              href={`/quotes/${item.id}`}
              onClick={(event) => event.stopPropagation()}
              className="text-[11px] font-bold text-muted-foreground hover:text-[#675de8]"
            >
              #{String(index + 1).padStart(2, '0')}
            </Link>
          </div>
          <blockquote className="text-base font-extrabold leading-8">
            “{item.quote_text}”
          </blockquote>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4 text-xs">
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <UserRound size={13} />
              {item.author_slug ? (
                <Link
                  href={`/authors/${item.author_slug}`}
                  onClick={(event) => event.stopPropagation()}
                  className="font-bold text-[#675de8]"
                >
                  {item.author_name}
                </Link>
              ) : (
                item.author_name || item.speaker || 'القائل غير محدد'
              )}
            </span>
            {item.book_slug && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <BookOpen size={13} />
                  <Link
                    href={`/books/${item.book_slug}`}
                    onClick={(event) => event.stopPropagation()}
                    className="font-bold text-[#675de8]"
                  >
                    {item.book_title}
                  </Link>
                </span>
              </>
            )}
            {item.category && (
              <span className="rounded-full bg-muted px-2 py-1">
                {item.category}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

export function AuthorQuotesPage() {
  const [, params] = useRoute('/authors/:slug/quotes');
  const slug = params?.slug ?? '';
  const author = trpc.authors.bySlug.useQuery({ slug }, { enabled: Boolean(slug) });
  const quotes = trpc.quotes.byAuthor.useQuery({ slug }, { enabled: Boolean(slug) });
  const novels = trpc.novels.search.useQuery(
    { authorSlug: slug, sort: 'popular', limit: 50 },
    { enabled: Boolean(slug) }
  );

  if (author.isLoading)
    return (
      <div className="container py-20 text-center">
        جارٍ تحميل الصفحة...
      </div>
    );

  if (!author.data)
    return (
      <div className="container py-16">
        <EmptyState
          title="المؤلف غير موجود"
          description="تحقق من الرابط أو أضف المؤلف من لوحة الإدارة."
        />
      </div>
    );

  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['المؤلفون', author.data.name, 'اقتباساته']} />
      <PageIntro
        eyebrow="كاتب واقتباساته"
        title={`اقتباسات ${author.data.name}`}
        description={
          author.data.bio ||
          `مجموعة من الاقتباسات المنسوبة إلى ${author.data.name} من أعماله المنشورة.`
        }
      />
      <AdSlot
        slot="4836372120"
        format="horizontal"
        className="mx-auto max-w-4xl"
      />
      <AutoRelaxedAd className="mx-auto max-w-4xl" />
      <section className="mt-10">
        <h2 className="mb-5 text-xl font-extrabold">
          اقتباسات {author.data.name}
        </h2>
        <QuoteGrid quotes={quotes.data ?? []} />
      </section>
      <section className="mt-12">
        <h2 className="mb-5 text-xl font-extrabold">
          كتب وروايات {author.data.name}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(novels.data ?? []).map((book: any) => (
            <Link
              key={book.id}
              href={`/books/${book.slug}`}
              className="rounded-2xl border border-border bg-card p-4 font-extrabold transition hover:-translate-y-1 hover:border-[#675de8]"
            >
              <BookOpen className="mb-3 text-[#675de8]" size={20} />
              {book.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export function BookQuotesPage() {
  const [, params] = useRoute('/books/:slug/quotes');
  const slug = params?.slug ?? '';
  const book = trpc.novels.bySlug.useQuery({ slug }, { enabled: Boolean(slug) });
  const quotes = trpc.quotes.byBook.useQuery({ slug }, { enabled: Boolean(slug) });

  if (book.isLoading)
    return (
      <div className="container py-20 text-center">
        جارٍ تحميل الصفحة...
      </div>
    );

  if (!book.data)
    return (
      <div className="container py-16">
        <EmptyState
          title="الكتاب غير موجود"
          description="تحقق من الرابط أو أضف الكتاب من لوحة الإدارة."
        />
      </div>
    );

  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['الكتب', book.data.title, 'اقتباسات']} />
      <PageIntro
        eyebrow="اقتباسات الكتاب"
        title={`اقتباسات من ${book.data.title}`}
        description={
          book.data.description ||
          `اقرأ أجمل الاقتباسات من كتاب ${book.data.title}.`
        }
      />
      <AdSlot
        slot="4836372120"
        format="horizontal"
        className="mx-auto max-w-4xl"
      />
      <AutoRelaxedAd className="mx-auto max-w-4xl" />
      <div className="mt-5 flex flex-wrap gap-3 text-sm">
        {book.data.authorSlug && (
          <Link
            href={`/authors/${book.data.authorSlug}`}
            className="rounded-xl border border-border bg-card px-4 py-3 font-bold text-[#675de8]"
          >
            المؤلف: {book.data.author}
          </Link>
        )}
        <Link
          href={`/books/${slug}`}
          className="rounded-xl border border-border bg-card px-4 py-3 font-bold"
        >
          صفحة الكتاب
        </Link>
      </div>
      <section className="mt-10">
        <QuoteGrid quotes={quotes.data ?? []} />
      </section>
    </div>
  );
}

export function QuoteCategoryPage() {
  const [, params] = useRoute('/quotes/category/:slug');
  const slug = params?.slug ?? '';
  const category = decodeURIComponent(slug).replace(/-/g, ' ');
  const quotes = trpc.quotes.byCategory.useQuery({ category: slug }, { enabled: Boolean(slug) });

  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['الاقتباسات', category]} />
      <PageIntro
        eyebrow="تصنيف الاقتباسات"
        title={`اقتباسات ${category}`}
        description={`مجموعة مختارة من الاقتباسات المصنفة تحت ${category}.`}
      />
      <AdSlot
        slot="4836372120"
        format="horizontal"
        className="mx-auto max-w-4xl"
      />
      <AutoRelaxedAd className="mx-auto max-w-4xl" />
      <section className="mt-10">
        <QuoteGrid quotes={quotes.data ?? []} />
      </section>
    </div>
  );
}

export function QuoteCategoriesPage() {
  const categories = trpc.quotes.categories.useQuery();

  return (
    <div className="container py-10 md:py-16">
      <Breadcrumbs items={['اقتباسات الكتب', 'التصنيفات']} />
      <PageIntro
        eyebrow="اكتشف حسب الموضوع"
        title="تصنيفات الاقتباسات"
        description="تصفح الاقتباسات حسب الموضوع والمزاج والفكرة."
      />
      <AdSlot
        slot="4836372120"
        format="horizontal"
        className="mx-auto max-w-4xl"
      />
      <FeedAdSlot className="mx-auto max-w-4xl" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(categories.data ?? []).map((category) => (
          <Link
            key={category}
            href={`/quotes/category/${encodeURIComponent(category).replace(
              /%20/g,
              '-'
            )}`}
            className="rounded-2xl border border-border bg-card p-5 font-extrabold transition hover:-translate-y-1 hover:border-[#675de8]"
          >
            اقتباسات {category}
          </Link>
        ))}
      </div>
      {!categories.data?.length && (
        <div className="mt-10">
          <EmptyState
            title="لا توجد تصنيفات بعد"
            description="أضف تصنيفًا للاقتباس من لوحة الإدارة."
          />
        </div>
      )}
    </div>
  );
}

export default QuoteCategoriesPage;

// Keep the shared grid available to future quote-related pages without duplicating its markup.
export { QuoteGrid };

export function QuoteLandingLinks() { return <div className="flex flex-wrap gap-3"><Link href="/quotes" className="rounded-xl border px-4 py-2 text-sm font-bold">كل الاقتباسات</Link><Link href="/quotes/categories" className="rounded-xl border px-4 py-2 text-sm font-bold">التصنيفات</Link></div>; }

export const quotePageRoutes = { author: '/authors/:slug/quotes', book: '/books/:slug/quotes', category: '/quotes/category/:slug', categories: '/quotes/categories' };

export function QuotePageFooter() { return <footer className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground"><Link href="/quotes">العودة إلى كل الاقتباسات</Link></footer>; }

export function QuoteCategoryBadge({ category }: { category: string }) { return <Link href={`/quotes/category/${encodeURIComponent(category).replace(/%20/g, '-')}`} className="text-[#675de8]">{category}</Link>; }

export function QuoteAuthorBookLinks({ authorSlug, authorName, bookSlug, bookTitle }: { authorSlug?: string | null; authorName?: string | null; bookSlug?: string | null; bookTitle?: string | null }) { return <div className="flex flex-wrap gap-3 text-sm">{authorSlug && <Link href={`/authors/${authorSlug}`} className="text-[#675de8]">{authorName}</Link>}{bookSlug && <Link href={`/books/${bookSlug}`} className="text-[#675de8]">{bookTitle}</Link>}</div>; }
