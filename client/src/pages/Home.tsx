import { Link } from 'wouter';
import { ArrowUpLeft, Sparkles } from 'lucide-react';
import { SectionHeading, GenreCard, AuthorCard } from '@/components/ExploreCards';
import { NovelCard } from '@/components/NovelCard';
import { BrowseRecommendations } from '@/components/BrowseRecommendations';
import { toAuthor, toGenre, toNovel, coverFallback, optimizeCoverUrl } from '@/lib/data';
import { trpc } from '@/lib/trpc';

export default function Home() {
  const novelsQuery = trpc.novels.list.useQuery({ limit: 12 });
  const genresQuery = trpc.genres.list.useQuery();
  const authorsQuery = trpc.authors.list.useQuery();
  const novelsLoading = novelsQuery.isLoading;
  const novels = (novelsQuery.data ?? []).map(toNovel);
  const genres = (genresQuery.data ?? []).map(toGenre).slice(0, 8);
  const authors = (authorsQuery.data ?? []).map(toAuthor).slice(0, 6);
  const backgroundNovels = novels.filter((novel) => novel.cover || novel.coverUrl).slice(0, 18);
  const backgroundColumns = [0, 1, 2].map((column) => {
    const items = backgroundNovels.filter((_, index) => index % 3 === column);
    return items.length ? items : [novels[column % Math.max(novels.length, 1)]].filter(Boolean);
  });

  return (
    <div>
      <section className="relative min-h-[min(88vh,720px)] overflow-hidden border-b border-border/60 bg-[#070a16] text-white">
        <div className="hero-wallpaper pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="hero-wallpaper-grid">
            {backgroundColumns.map((column, columnIndex) => (
              <div key={columnIndex} className="hero-wallpaper-column" style={{ animationDelay: `${columnIndex * -4}s`, animationDuration: `${34 + columnIndex * 6}s` }}>
                {[...column, ...column].map((novel, index) => (
                  <img key={`${novel.id}-${index}`} src={optimizeCoverUrl(novel.coverUrl || novel.cover || coverFallback, 280)} alt="" className="hero-wallpaper-cover" loading={index < 3 ? 'eager' : 'lazy'} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#070a16]/50 via-[#070a16]/72 to-[#070a16]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(103,93,232,0.18),_transparent_60%)]" />
        <div className="container relative grid items-center gap-10 py-14 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="section-label mb-4 text-[#b7b1ff]">منصة اكتشاف الروايات العربية</div>
            <h1 className="text-4xl font-extrabold tracking-[-0.06em] md:text-6xl">
              كل رواية لها حكاية
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-8 text-white/70 md:text-base">
              اكتشف روايات عربية تستحق وقتك: أغلفة، ملخصات، تصنيفات، اقتباسات، وتوصيات ذكية — بدون استضافة ملفات.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/explore"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#675de8] px-5 text-xs font-extrabold text-white transition hover:bg-[#5a50d6]"
              >
                استكشف الروايات <ArrowUpLeft size={15} />
              </Link>
              <Link
                href="/quotes"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-xs font-extrabold text-white/90 transition hover:bg-white/10"
              >
                اقتباسات مختارة
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {(
                [
                  ['رعب', '/explore?q=رعب'],
                  ['فانتازيا', '/explore?q=فانتازيا'],
                  ['أحمد خالد توفيق', '/explore?q=أحمد خالد توفيق'],
                ] as const
              ).map(([label, href]) => (
                <Link
                  key={label}
                  href={href}
                  className="rounded-full border border-white/12 bg-white/[.06] px-3 py-1.5 text-[11px] font-semibold text-white/75 transition hover:bg-white/10"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
          {featured ? (
            <div className="relative mx-auto flex w-full max-w-[280px] justify-center md:max-w-[320px]">
              <Link href={`/books/${featured.slug}`} className="hero-featured-float group relative block w-[72%]">
                <div className="absolute -inset-6 rounded-[2rem] bg-[#675de8]/25 blur-2xl" />
                <div className="relative overflow-hidden rounded-[1.35rem] border border-white/15 bg-[#12172e] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)]">
                  <div className="absolute start-3 top-3 z-10 rounded-full bg-[#675de8] px-2.5 py-1 text-[10px] font-extrabold">مميزة اليوم</div>
                  <img src={optimizeCoverUrl(featured.coverUrl || featured.cover || coverFallback, 480)} alt={featured.title} className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-16">
                    <div className="line-clamp-2 text-sm font-extrabold">{featured.title}</div>
                    <div className="mt-1 truncate text-xs text-white/65">{featured.author}</div>
                  </div>
                </div>
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <main className="container py-14">
        <section>
          <SectionHeading
            eyebrow="الأكثر بحثًا"
            title="الروايات التي يتكلم عنها القرّاء"
            subtitle="نتائج حية من مكتبة رِواية."
            href="/explore"
          />
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
              : novels.map((novel, i) => (
                  <NovelCard key={novel.id} novel={novel} priority={i < 2} />
                ))}
          </div>
        </section>

        <BrowseRecommendations />

        {genres.length > 0 && (
          <section className="mt-20">
            <SectionHeading
              eyebrow="حسب المزاج"
              title="استكشف حسب مزاجك"
              subtitle="تصنيفات تساعدك تختار بسرعة."
              href="/explore"
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {genres.map((genre) => (
                <GenreCard key={genre.id} genre={genre} />
              ))}
            </div>
          </section>
        )}

        {authors.length > 0 && (
          <section className="mt-20">
            <SectionHeading
              eyebrow="كتّاب"
              title="مؤلفون يستحقون المتابعة"
              subtitle="تعرّف على أصوات مميزة في الرواية العربية."
              href="/authors"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {authors.map((author) => (
                <AuthorCard key={author.id} author={author} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-20 overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-[#171e42] to-[#2a2460] p-8 text-white md:p-12">
          <div className="relative grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold text-[#c4bfff]">
                <Sparkles size={14} /> اكتشف قراءتك
              </div>
              <h2 className="text-2xl font-extrabold md:text-3xl">حدّد مزاجك وابنِ قائمة تناسبك</h2>
              <p className="mt-3 max-w-lg text-sm leading-7 text-white/70">
                صفحة الاكتشاف الشخصية تجمع تفضيلاتك وتعرض روايات أقرب لذوقك.
              </p>
              <Link
                href="/discover"
                className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#eeeefe] px-5 text-xs font-extrabold text-[#171e42] transition hover:bg-white"
              >
                ابدأ الاكتشاف <ArrowUpLeft size={15} />
              </Link>
            </div>
          </div>
        </section>

        {novels.length > 0 && (
          <section className="mt-20">
            <SectionHeading title="لمحات سريعة" subtitle="من المكتبة الحالية" href="/explore" />
            <div className="grid gap-4 md:grid-cols-3">
              {novels.slice(0, 3).map((item) => (
                <Link
                  key={item.id}
                  href={`/books/${item.slug}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-[#675de8]/40"
                >
                  <img
                    src={optimizeCoverUrl(item.coverUrl || item.cover || coverFallback, 160)}
                    alt={item.title}
                    className="h-28 w-20 rounded-xl object-cover"
                  />
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-extrabold">{item.title}</h3>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{item.author}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
