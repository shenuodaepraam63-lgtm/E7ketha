import { useEffect, useState } from 'react';
import { ArrowUpLeft, ChevronLeft, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { GlobalSearch } from '@/components/GlobalSearch';
import { NovelCard } from '@/components/NovelCard';
import { AuthorCard, GenreCard, SectionHeading } from '@/components/ExploreCards';
import { toAuthor, toGenre, toNovel, coverFallback } from '@/lib/data';
import { trpc } from '@/lib/trpc';

export default function Home() {
  const [loadSecondary, setLoadSecondary] = useState(false);
  useEffect(() => {
    const load = () => setLoadSecondary(true);
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(load, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const id = globalThis.setTimeout(load, 1200);
    return () => globalThis.clearTimeout(id);
  }, []);
  const novelsQuery = trpc.novels.search.useQuery({ sort: 'popular', limit: 12 });
  const authorsQuery = trpc.authors.list.useQuery(undefined, { enabled: loadSecondary, staleTime: 300_000 });
  const genresQuery = trpc.genres.list.useQuery(undefined, { enabled: loadSecondary, staleTime: 300_000 });
  const seriesQuery = trpc.series.list.useQuery(undefined, { enabled: loadSecondary, staleTime: 300_000 });
  const novels = (novelsQuery.data ?? []).map(toNovel);
  const authors = (authorsQuery.data ?? []).slice(0, 5).map(toAuthor);
  const genres = (genresQuery.data ?? []).slice(0, 8).map(toGenre);
  return (
    <div>
      <section className="relative z-20 overflow-visible bg-[#091027] text-white">
        <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(circle_at_18%_30%,rgba(110,100,235,.28),transparent_42%),linear-gradient(110deg,#141d49_0%,#091027_70%)]" />
        <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(90deg,rgba(9,16,39,.08)_0%,rgba(9,16,39,.55)_47%,#091027_77%)]" />
        <div className="container relative z-30 grid min-h-[570px] items-center py-20 md:min-h-[620px] md:grid-cols-[1fr_1.15fr] md:py-24">
          <div className="order-1 max-w-[590px] md:order-2">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.07] px-3 py-1.5 text-[11px] font-semibold text-[#d8d5ff]">
              <Sparkles size={13} className="text-[#9f96ff]" /> مساحة أهدأ لاكتشاف ما يستحق القراءة
            </div>
            <h1 className="max-w-[650px] text-[43px] font-extrabold leading-[1.18] sm:text-[58px]">
              اكتشف روايتك<br />
              <span className="bg-gradient-to-l from-[#c3bdff] via-[#8f86ff] to-[#ffcf9b] bg-clip-text text-transparent">القادمة.</span>
            </h1>
            <p className="mt-6 max-w-[490px] text-base leading-8 text-white/65">ابحث واستكشف مكتبة رواية الحية من أول فكرة لحد آخر صفحة.</p>
            <div className="relative z-[60] mt-9 max-w-[610px]">
              <GlobalSearch hero />
            </div>
          </div>
        </div>
      </section>
      <main className="relative z-0 container py-16 md:py-20">
        <section>
          <SectionHeading eyebrow="الأكثر بحثًا" title="الروايات التي يتكلم عنها القرّاء" subtitle="نتائج حية من مكتبة رِواية." href="/explore" />
          <div className="scroll-rail -mx-1 px-1">
            {novels.map((novel) => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>
        </section>
        <section className="mt-20">
          <SectionHeading eyebrow="حسب المزاج" title="استكشف حسب مزاجك" subtitle="اختار الباب اللي يشدك." />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {genres.map((genre) => (
              <GenreCard key={genre.slug} genre={genre} />
            ))}
          </div>
        </section>
        <section className="mt-20">
          <SectionHeading eyebrow="أصوات تستحق المتابعة" title="مؤلفون يستحقون الاكتشاف" subtitle="تعرف على أصحاب العوالم التي لا تُنسى." />
          <div className="scroll-rail -mx-1 px-1">
            {authors.map((author) => (
              <AuthorCard key={author.slug} author={author} />
            ))}
          </div>
        </section>
        <section className="relative mt-24 overflow-hidden rounded-[28px] bg-[#121a3b] px-6 py-12 text-white md:px-14 md:py-16">
          <div className="pointer-events-none absolute -left-20 top-0 size-72 rounded-full bg-[#5b4de8]/20 blur-3xl" />
          <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <div className="section-label mb-3 text-[#9d95ff]">مقترحات على مقاسك</div>
              <h2 className="max-w-xl text-3xl font-extrabold md:text-4xl">ربما تعجبك هذه الروايات</h2>
              <p className="mt-3 text-sm leading-7 text-white/55">اختيارات مشابهة لما تبحث عنه.</p>
            </div>
            <Link href="/discover" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#eeeefe] px-5 text-xs font-extrabold text-[#171e42] transition hover:bg-white">
              ابدأ الاكتشاف <ArrowUpLeft size={16} />
            </Link>
          </div>
          <div className="relative mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {novels.slice(5, 9).map((novel) => (
              <Link key={novel.id} href={`/books/${novel.slug}`} className="group overflow-hidden rounded-2xl border border-white/10">
                <img src={novel.cover || coverFallback} alt={`غلاف ${novel.title}`} className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105" />
              </Link>
            ))}
          </div>
        </section>
        <section className="mt-20">
          <SectionHeading eyebrow="رحلات من أكثر من جزء" title="السلاسل الأكثر متابعة" subtitle="رتّب قراءتك، جزءًا بعد جزء." />
          <div className="grid gap-4 md:grid-cols-3">
            {(seriesQuery.data ?? []).map((item) => (
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
      </main>
    </div>
  );
}
