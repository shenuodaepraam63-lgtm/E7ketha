import { ArrowUpLeft, ChevronLeft, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NovelCard } from '@/components/NovelCard';
import { AuthorCard, GenreCard, SectionHeading } from '@/components/ExploreCards';
import { toAuthor, toGenre, toNovel, coverFallback } from '@/lib/data';
import { trpc } from '@/lib/trpc';
import { BrowseRecommendations } from '@/components/BrowseRecommendations';

export default function Home() {
  // Fire all public lists immediately so httpBatchLink packs them in one round-trip.
  const novelsQuery = trpc.novels.search.useQuery(
    { sort: 'popular', limit: 12 },
    { staleTime: 300_000, refetchOnMount: false },
  );
  const authorsQuery = trpc.authors.list.useQuery(undefined, { staleTime: 300_000, refetchOnMount: false });
  const genresQuery = trpc.genres.list.useQuery(undefined, { staleTime: 300_000, refetchOnMount: false });
  const seriesQuery = trpc.series.list.useQuery(undefined, { staleTime: 300_000, refetchOnMount: false });
  const novels = (novelsQuery.data ?? []).map(toNovel);
  const authors = (authorsQuery.data ?? []).slice(0, 5).map(toAuthor);
  const genres = (genresQuery.data ?? [])
    .map(toGenre)
    .filter((g) => (g.count ?? 0) > 0)
    .slice(0, 8);
  const seriesItems = seriesQuery.data ?? [];
  const novelsLoading = novelsQuery.isLoading && novels.length === 0;
  return (
    <div>
      <section className="relative z-20 overflow-visible bg-[#091027] text-white">
        <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_18%_30%,rgba(110,100,235,.28),transparent_42%),linear-gradient(110deg,#141d49_0%,#091027_70%)]" />
        <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(90deg,rgba(9,16,39,.08)_0%,rgba(9,16,39,.55)_47%,#091027_77%)]" />
        <div className="container relative z-30 py-14 md:py-20">
          <div className="max-w-[640px]">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5 text-[11px] font-semibold text-[#d8d5ff]">
              <Sparkles size={13} className="text-[#9f96ff]" /> محرك بحث للروايات العربية
            </div>
            <h1 className="max-w-[650px] text-[43px] font-extrabold leading-[1.18] sm:text-[58px]">
              اكتشف روايتك<br />
              <span className="bg-gradient-to-l from-[#c3bdff] via-[#8f86ff] to-[#ffcf9b] bg-clip-text text-transparent">القادمة.</span>
            </h1>
            <p className="mt-6 max-w-[490px] text-[15px] leading-8 text-white/62">
              رِواية تساعدك تفهم عالم الروايات العربية، وتلاقي ما يستحق وقتك — من الكلاسيكيات إلى الأعمال الحديثة.
            </p>
            <div className="relative z-40 mt-8">
              <GlobalSearch variant="hero" />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {[('رعب', '/explore?q=رعب'), ('فانتازيا', '/explore?q=فانتازيا'), ('أحمد خالد توفيق', '/explore?q=أحمد خالد توفيق')].map(([label, href]) => (
                <Link key={label} href={href} className="rounded-full border border-white/12 bg-white/[.06] px-3 py-1.5 text-[11px] font-semibold text-white/75 transition hover:bg-white/10">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="container py-14">
        <section>
          <SectionHeading eyebrow="الأكثر بحثًا" title="الروايات التي يتكلم عنها القرّاء" subtitle="نتائج حية من مكتبة رِواية." href="/explore" />
          <div className="scroll-rail -mx-1 px-1">
            {novelsLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-w-[148px] max-w-[148px] animate-pulse rounded-2xl bg-muted/60"
                  >
                    <div className="aspect-[2/3] rounded-2xl bg-muted" />
                    <div className="mt-2 h-3 w-3/4 rounded bg-muted" />
                    <div className="mt-1.5 h-2.5 w-1/2 rounded bg-muted/80" />
                  </div>
                ))
              : novels.map((novel) => <NovelCard key={novel.id} novel={novel} />)}
          </div>
        </section>
        {genres.length > 0 && (
        <section className="mt-20">
          <SectionHeading eyebrow="حسب المزاج" title="استكشف حسب مزاجك" subtitle="تصنيفات تساعدك تختار بسرعة." href="/explore" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {genres.map((genre) => (
              <GenreCard key={genre.id} genre={genre} />
            ))}
          </div>
        </section>
        )}
        {authors.length > 0 && (
        <section className="mt-20">
          <SectionHeading eyebrow="أصوات مؤثرة" title="مؤلفون يستحقون المتابعة" subtitle="تعرّف على أسماء صنعت ذائقة جيل كامل." href="/explore" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {authors.map((author) => (
              <AuthorCard key={author.id} author={author} />
            ))}
          </div>
        </section>
        )}
        <BrowseRecommendations />
        <section className="relative mt-20 overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1430] p-8 text-white md:p-12">
          <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#675de8]/25 blur-3xl" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <div className="section-label mb-3 text-[#9d95ff]">اكتشف أكثر</div>
              <h2 className="max-w-xl text-3xl font-extrabold md:text-4xl">لم تجد ما يناسبك بعد؟</h2>
              <p className="mt-3 text-sm leading-7 text-white/55">تصفّح التصنيفات أو ابحث بالاسم — وكل ما تفتحه يطوّر اقتراحاتك المحلية.</p>
            </div>
            <Link href="/discover" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#eeeefe] px-5 text-xs font-extrabold text-[#171e42] transition hover:bg-white">
              ابدأ الاكتشاف <ArrowUpLeft size={16} />
            </Link>
          </div>
        </section>
        {seriesItems.length > 0 && (
        <section className="mt-20">
          <SectionHeading eyebrow="رحلات من أكثر من جزء" title="السلاسل الأكثر متابعة" subtitle="رتّب قراءتك، جزءًا بعد جزء." />
          <div className="grid gap-4 md:grid-cols-3">
            {seriesItems.map((item) => (
              <Link key={item.slug} href={`/series/${item.slug}`} className="interactive group flex items-center gap-4 rounded-[20px] border border-border bg-card p-4">
                <img src={item.coverUrl || coverFallback} alt={item.title} className="h-28 w-20 rounded-xl object-cover" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-[#7168e8]">سلسلة</span>
                  <h3 className="mt-1 text-sm font-extrabold">{item.title}</h3>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{item.parts} أجزاء</span>
                    <span className="size-1 rounded-full bg-emerald-400" />
                    {item.status}
                  </div>
                </div>
                <ChevronLeft size={17} className="mr-auto text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
        )}
      </main>
    </div>
  );
}
