import { ArrowLeft, Check, Sparkles, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { NovelCard } from '@/components/NovelCard';
import { toNovel } from '@/lib/data';
import {
  clearInterestProfile,
  formatFromLabel,
  getInterestProfile,
  hasInterestProfile,
  lengthFromLabel,
  saveInterestProfile,
  type InterestProfile,
} from '@/lib/interestProfile';
import { trpc } from '@/lib/trpc';

const FALLBACK_GENRES = [
  { slug: 'romance', name: 'رومانسي' },
  { slug: 'horror', name: 'رعب' },
  { slug: 'mystery', name: 'غموض' },
  { slug: 'fantasy', name: 'فانتازيا' },
  { slug: 'thriller', name: 'إثارة' },
  { slug: 'comedy', name: 'كوميدي' },
  { slug: 'drama', name: 'دراما' },
  { slug: 'psychological', name: 'نفسي' },
  { slug: 'historical', name: 'تاريخي' },
  { slug: 'sci-fi', name: 'خيال علمي' },
  { slug: 'adventure', name: 'مغامرة' },
];

const LENGTH_OPTS = ['قصيرة وخفيفة', 'متوسطة', 'أحب التفاصيل', 'لا يهم'];
const FORMAT_OPTS = ['رواية منفردة', 'سلسلة أعيش معها', 'لا يهم'];

function applyProfileFilters(rows: ReturnType<typeof toNovel>[], profile: InterestProfile) {
  return rows.filter((n) => {
    if (profile.format === 'standalone' && n.status !== 'standalone' && n.parts > 1) return false;
    if (profile.format === 'series' && n.parts <= 1 && n.status === 'standalone') return false;
    if (profile.length === 'short' && n.parts > 3) return false;
    if (profile.length === 'long' && n.parts < 2) return false;
    return true;
  });
}

function PersonalizedFeed({ profile, onEdit }: { profile: InterestProfile; onEdit: () => void }) {
  const g0 = profile.genreSlugs[0];
  const g1 = profile.genreSlugs[1];
  const g2 = profile.genreSlugs[2];

  const q0 = trpc.novels.search.useQuery(
    { genreSlug: g0, sort: 'popular', limit: 24 },
    { enabled: Boolean(g0), staleTime: 120_000 },
  );
  const q1 = trpc.novels.search.useQuery(
    { genreSlug: g1, sort: 'popular', limit: 16 },
    { enabled: Boolean(g1), staleTime: 120_000 },
  );
  const q2 = trpc.novels.search.useQuery(
    { genreSlug: g2, sort: 'rating', limit: 16 },
    { enabled: Boolean(g2), staleTime: 120_000 },
  );
  const popular = trpc.novels.search.useQuery({ sort: 'popular', limit: 20 }, { staleTime: 120_000 });

  const items = useMemo(() => {
    const weight = new Map(profile.genreSlugs.map((s, i) => [s, 3 - Math.min(i, 2)]));
    type Row = ReturnType<typeof toNovel> & { _score: number };
    const bySlug = new Map<string, Row>();

    const ingest = (raw: unknown[] | undefined, boost: number) => {
      for (const row of raw ?? []) {
        const novel = toNovel(row as Parameters<typeof toNovel>[0]);
        const prev = bySlug.get(novel.slug);
        const score =
          boost * 40 +
          Math.min(30, (novel.rating || 0) * 6) +
          (novel.publicationYear && novel.publicationYear >= 2018 ? 5 : 0);
        if (!prev || score > prev._score) bySlug.set(novel.slug, { ...novel, _score: score });
        else prev._score += boost * 10;
      }
    };

    ingest(q0.data as unknown[], weight.get(g0 ?? '') ?? 0);
    ingest(q1.data as unknown[], weight.get(g1 ?? '') ?? 0);
    ingest(q2.data as unknown[], weight.get(g2 ?? '') ?? 0);
    if (bySlug.size < 8) ingest(popular.data as unknown[], 0.4);

    let list = [...bySlug.values()].sort((a, b) => b._score - a._score);
    list = applyProfileFilters(list, profile);
    return list.slice(0, 16);
  }, [profile, q0.data, q1.data, q2.data, popular.data, g0, g1, g2]);

  const loading = q0.isLoading || (Boolean(g1) && q1.isLoading) || (Boolean(g2) && q2.isLoading);
  const names = profile.genreNames.length ? profile.genreNames : profile.genreSlugs;

  return (
    <div className="container py-12 md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold text-[#675de8]">
              <Sparkles size={14} /> صفحة اكتشاف شخصية
            </div>
            <h1 className="text-3xl font-extrabold md:text-4xl">مكتبتك حسب ذوقك</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              مبنية على الأنواع التي اخترتها
              {names.length ? `: ${names.slice(0, 5).join(' · ')}` : ''}. التفضيلات محفوظة على جهازك.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {names.slice(0, 8).map((n) => (
                <span
                  key={n}
                  className="rounded-full border border-[#675de8]/25 bg-[#efeeff] px-3 py-1 text-[11px] font-bold text-[#5548d1]"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onEdit} className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold">
              تعديل الاهتمامات
            </button>
            <Link href="/explore" className="rounded-xl bg-[#171e42] px-4 py-2.5 text-xs font-bold text-white">
              كل الروايات
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : items.length ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((novel) => (
              <NovelCard key={novel.id} novel={novel} />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            لا توجد روايات مطابقة لتفضيلاتك حاليًا. جرّب تعديل الاهتمامات أو تصفّح المكتبة.
          </p>
        )}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  const [mode, setMode] = useState<'boot' | 'onboarding' | 'feed'>('boot');
  const [selected, setSelected] = useState<Array<{ slug: string; name: string }>>([]);
  const [lengthLabel, setLengthLabel] = useState('لا يهم');
  const [formatLabel, setFormatLabel] = useState('لا يهم');
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  const genresQuery = trpc.genres.list.useQuery(undefined, { staleTime: 300_000 });
  const genreOptions = useMemo(() => {
    const fromApi = (genresQuery.data ?? []).map((g) => ({ slug: g.slug, name: g.name }));
    return fromApi.length >= 5 ? fromApi : FALLBACK_GENRES;
  }, [genresQuery.data]);

  useEffect(() => {
    if (hasInterestProfile()) setMode('feed');
    else setMode('onboarding');
  }, []);

  const toggleGenre = (g: { slug: string; name: string }) => {
    setSelected((prev) => {
      const exists = prev.some((x) => x.slug === g.slug);
      if (exists) return prev.filter((x) => x.slug !== g.slug);
      if (prev.length >= 8) return prev;
      return [...prev, g];
    });
  };

  const finish = () => {
    if (selected.length < 3) return;
    saveInterestProfile({
      genreSlugs: selected.map((s) => s.slug),
      genreNames: selected.map((s) => s.name),
      length: lengthFromLabel(lengthLabel),
      format: formatFromLabel(formatLabel),
    });
    setMode('feed');
  };

  const startEdit = () => {
    const p = getInterestProfile();
    const opts = genreOptions;
    setSelected(
      p.genreSlugs.map((slug, i) => ({
        slug,
        name: p.genreNames[i] || opts.find((o) => o.slug === slug)?.name || slug,
      })),
    );
    setPhase(0);
    setMode('onboarding');
  };

  if (mode === 'boot') {
    return (
      <div className="grid min-h-[40vh] place-items-center text-sm text-muted-foreground">جارٍ التحميل…</div>
    );
  }

  if (mode === 'feed') {
    return <PersonalizedFeed profile={getInterestProfile()} onEdit={startEdit} />;
  }

  return (
    <div className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <ArrowLeft size={15} /> العودة
          </Link>
          <span className="text-xs font-bold text-muted-foreground">{phase + 1} / 3</span>
        </div>

        <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-[#675de8] transition-all" style={{ width: `${((phase + 1) / 3) * 100}%` }} />
        </div>

        {phase === 0 && (
          <>
            <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold text-[#675de8]">
              <UserRound size={14} /> ملف اهتمامات القراءة
            </div>
            <h1 className="text-2xl font-extrabold md:text-4xl">إيه النوع اللي بتحبه؟ 📖</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              اختار <strong>3 أنواع على الأقل</strong> (حتى 8). هنبني لك صفحة اكتشاف شخصية من مكتبة رِواية.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {genreOptions.map((g) => {
                const on = selected.some((x) => x.slug === g.slug);
                return (
                  <button
                    key={g.slug}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-right text-sm font-bold transition ${
                      on
                        ? 'border-[#675de8] bg-[#efeeff] text-[#5548d1]'
                        : 'border-border bg-card hover:border-[#675de8]/40'
                    }`}
                  >
                    <span>{g.name}</span>
                    {on && <Check size={16} />}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">مختار: {selected.length}</p>
            <button
              type="button"
              disabled={selected.length < 3}
              onClick={() => setPhase(1)}
              className="mt-8 w-full rounded-2xl bg-[#675de8] py-3.5 text-sm font-extrabold text-white disabled:opacity-40"
            >
              التالي
            </button>
          </>
        )}

        {phase === 1 && (
          <>
            <h1 className="text-2xl font-extrabold md:text-3xl">الطول المناسب؟</h1>
            <div className="mt-8 grid gap-3">
              {LENGTH_OPTS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setLengthLabel(opt)}
                  className={`rounded-2xl border px-4 py-4 text-right text-sm font-bold ${
                    lengthLabel === opt ? 'border-[#675de8] bg-[#efeeff] text-[#5548d1]' : 'border-border'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <button type="button" onClick={() => setPhase(0)} className="flex-1 rounded-2xl border border-border py-3 text-sm font-bold">
                رجوع
              </button>
              <button type="button" onClick={() => setPhase(2)} className="flex-1 rounded-2xl bg-[#675de8] py-3 text-sm font-extrabold text-white">
                التالي
              </button>
            </div>
          </>
        )}

        {phase === 2 && (
          <>
            <h1 className="text-2xl font-extrabold md:text-3xl">منفردة ولا سلسلة؟</h1>
            <div className="mt-8 grid gap-3">
              {FORMAT_OPTS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setFormatLabel(opt)}
                  className={`rounded-2xl border px-4 py-4 text-right text-sm font-bold ${
                    formatLabel === opt ? 'border-[#675de8] bg-[#efeeff] text-[#5548d1]' : 'border-border'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <div className="mt-8 flex gap-3">
              <button type="button" onClick={() => setPhase(1)} className="flex-1 rounded-2xl border border-border py-3 text-sm font-bold">
                رجوع
              </button>
              <button type="button" onClick={finish} className="flex-1 rounded-2xl bg-[#675de8] py-3 text-sm font-extrabold text-white">
                بناء صفحتي
              </button>
            </div>
            {hasInterestProfile() && (
              <button
                type="button"
                onClick={() => {
                  clearInterestProfile();
                  setSelected([]);
                  setPhase(0);
                }}
                className="mt-4 w-full text-center text-[11px] text-muted-foreground underline"
              >
                مسح التفضيلات السابقة
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
