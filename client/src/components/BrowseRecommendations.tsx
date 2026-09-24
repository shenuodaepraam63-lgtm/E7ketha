import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowUpLeft, Sparkles } from 'lucide-react';
import { NovelCard } from '@/components/NovelCard';
import { toNovel } from '@/lib/data';
import { trpc } from '@/lib/trpc';
import { hasBrowseSignal, topGenreSlugs, viewedNovelSlugs } from '@/lib/browseRecs';

/**
 * Level-1 (anonymous) recommendations from localStorage browse history.
 * Fetches novels for top viewed genres and ranks them client-side.
 */
export function BrowseRecommendations() {
  const [ready, setReady] = useState(false);
  const [genreSlugs, setGenreSlugs] = useState<string[]>([]);
  const [exclude, setExclude] = useState<Set<string>>(new Set());

  useEffect(() => {
    setGenreSlugs(topGenreSlugs(3));
    setExclude(viewedNovelSlugs());
    setReady(true);
  }, []);

  const g0 = genreSlugs[0];
  const g1 = genreSlugs[1];
  const g2 = genreSlugs[2];

  const q0 = trpc.novels.search.useQuery(
    { genreSlug: g0, sort: 'popular', limit: 12 },
    { enabled: Boolean(g0), staleTime: 300_000 },
  );
  const q1 = trpc.novels.search.useQuery(
    { genreSlug: g1, sort: 'popular', limit: 12 },
    { enabled: Boolean(g1), staleTime: 300_000 },
  );
  const q2 = trpc.novels.search.useQuery(
    { genreSlug: g2, sort: 'popular', limit: 12 },
    { enabled: Boolean(g2), staleTime: 300_000 },
  );
  const popular = trpc.novels.search.useQuery(
    { sort: 'popular', limit: 16 },
    { enabled: ready && hasBrowseSignal(), staleTime: 300_000 },
  );

  const items = useMemo(() => {
    if (!ready || !hasBrowseSignal()) return [];
    const weight = new Map<string, number>();
    genreSlugs.forEach((slug, i) => weight.set(slug, 3 - i));

    type Row = ReturnType<typeof toNovel> & { _score: number };
    const bySlug = new Map<string, Row>();

    const ingest = (rows: unknown[] | undefined, genreBoost: number) => {
      for (const raw of rows ?? []) {
        const novel = toNovel(raw as Parameters<typeof toNovel>[0]);
        if (exclude.has(novel.slug)) continue;
        const prev = bySlug.get(novel.slug);
        const score =
          genreBoost * 40 +
          Math.min(30, (novel.rating || 0) * 6) +
          (novel.publicationYear && novel.publicationYear >= 2015 ? 5 : 0);
        if (!prev || score > prev._score) {
          bySlug.set(novel.slug, { ...novel, _score: score });
        } else {
          prev._score += genreBoost * 8;
        }
      }
    };

    ingest(q0.data as unknown[], weight.get(g0 ?? '') ?? 0);
    ingest(q1.data as unknown[], weight.get(g1 ?? '') ?? 0);
    ingest(q2.data as unknown[], weight.get(g2 ?? '') ?? 0);
    if (bySlug.size < 6) {
      ingest(popular.data as unknown[], 0.5);
    }

    return [...bySlug.values()]
      .sort((a, b) => b._score - a._score)
      .slice(0, 8);
  }, [ready, genreSlugs, exclude, q0.data, q1.data, q2.data, popular.data, g0, g1, g2]);

  if (!ready || !hasBrowseSignal() || items.length === 0) return null;

  const genreHint = genreSlugs.length
    ? `حسب التصنيفات التي تصفحتها`
    : `حسب الصفحات التي فتحتها`;

  return (
    <section className="mt-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold text-[#675de8]">
            <Sparkles size={14} /> بناءً على تصفحك
          </div>
          <h2 className="text-2xl font-extrabold md:text-3xl">روايات قد تعجبك</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            اقتراحات محلية على جهازك فقط — بدون تسجيل. {genreHint}.
          </p>
        </div>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 text-xs font-extrabold text-[#675de8] hover:underline"
        >
          استكشف المزيد <ArrowUpLeft size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((novel) => (
          <NovelCard key={novel.id} novel={novel} />
        ))}
      </div>
    </section>
  );
}
