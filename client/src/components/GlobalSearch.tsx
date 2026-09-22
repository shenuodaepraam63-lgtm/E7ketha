import { ArrowUpLeft, BookOpen, Search, User, X, Hash } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { coverFallback } from '@/lib/data';

function normalizeArabic(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function GlobalSearch({ hero = false }: { hero?: boolean }) {
  const [, navigate] = useLocation();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const q = value.trim();
  const novelsQuery = trpc.novels.search.useQuery(
    { q: q || undefined, sort: 'popular', limit: 6 },
    { enabled: q.length > 1, staleTime: 30_000 },
  );
  const authorsQuery = trpc.authors.list.useQuery(undefined, {
    enabled: focused || q.length > 1,
    staleTime: 300_000,
  });
  const genresQuery = trpc.genres.list.useQuery(undefined, {
    enabled: focused || q.length > 1,
    staleTime: 300_000,
  });

  const novels = novelsQuery.data ?? [];
  const authors = useMemo(() => {
    if (!q) return (authorsQuery.data ?? []).slice(0, 4);
    const needle = q.toLowerCase();
    return (authorsQuery.data ?? [])
      .filter((a) => {
      const n = normalizeArabic(a.name);
      const s = normalizeArabic(a.slug);
      const qq = normalizeArabic(needle);
      return n.includes(qq) || s.includes(qq);
    })
      .slice(0, 4);
  }, [authorsQuery.data, q]);
  const genres = useMemo(() => {
    if (!q) return (genresQuery.data ?? []).slice(0, 4);
    const needle = q.toLowerCase();
    return (genresQuery.data ?? [])
      .filter((g) => {
      const n = normalizeArabic(g.name);
      const s = normalizeArabic(g.slug);
      const qq = normalizeArabic(needle);
      return n.includes(qq) || s.includes(qq);
    })
      .slice(0, 4);
  }, [genresQuery.data, q]);

  const hasAny = novels.length > 0 || authors.length > 0 || genres.length > 0;
  const showPanel = focused && (q.length > 1 || hasAny);

  const submit = (term = value) => {
    const t = term.trim();
    if (!t) return;
    setFocused(false);
    navigate(`/search?q=${encodeURIComponent(t)}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        rootRef.current?.querySelector('input')?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div ref={rootRef} className={`relative z-[60] ${hero ? 'w-full' : 'w-full max-w-[420px]'}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={`relative flex items-center gap-2 rounded-2xl border transition-all ${
          hero
            ? 'h-[64px] border-white/20 bg-white/[.1] px-3 text-white shadow-[0_18px_50px_-28px_rgba(0,0,0,.55)] backdrop-blur-md focus-within:border-[#b4acff]/80 focus-within:bg-white/[.14]'
            : 'h-12 border-border bg-card px-2.5 shadow-sm focus-within:border-[#8279ee] focus-within:ring-4 focus-within:ring-[#8f86f3]/12'
        }`}
      >
        <Search size={hero ? 20 : 17} className={`mr-1 shrink-0 ${hero ? 'text-[#c7c3ff]' : 'text-muted-foreground'}`} />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 180)}
          className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${
            hero ? 'placeholder:text-white/45' : 'placeholder:text-muted-foreground'
          }`}
          placeholder={hero ? 'ابحث عن رواية، مؤلف، أو تصنيف...' : 'ابحث عن رواية أو مؤلف...'}
          aria-label="محرك بحث الروايات"
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => setValue('')}
            className={`grid size-8 place-items-center rounded-lg ${hero ? 'text-white/60 hover:bg-white/10' : 'text-muted-foreground hover:bg-muted'}`}
            aria-label="مسح البحث"
          >
            <X size={15} />
          </button>
        )}
        <button
          type="submit"
          className={`shrink-0 rounded-xl px-4 py-2 text-xs font-extrabold transition ${
            hero
              ? 'bg-[#eeeefe] text-[#171e42] hover:bg-white'
              : 'bg-[#171e42] text-white hover:bg-[#252d5d] dark:bg-[#eeeefe] dark:text-[#171e42]'
          }`}
        >
          بــحـــث
        </button>
      </form>

      {showPanel && (
        <div className="absolute inset-x-0 top-[calc(100%+10px)] z-[70] max-h-[min(420px,calc(100vh-160px))] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-2 text-foreground shadow-[0_24px_60px_-20px_rgba(17,25,65,.4)]">
          {q.length > 1 && novelsQuery.isFetching && (
            <p className="px-3 py-2 text-[11px] text-muted-foreground">نبحث في المكتبة...</p>
          )}

          {novels.length > 0 && (
            <div className="mb-1">
              <div className="flex items-center gap-2 px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                <BookOpen size={12} /> روايات
              </div>
              {novels.map((novel) => (
                <button
                  key={novel.id}
                  type="button"
                  onMouseDown={() => navigate(`/books/${novel.slug}`)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-right hover:bg-muted"
                >
                  <img
                    src={novel.coverUrl ?? coverFallback}
                    alt=""
                    className="size-11 rounded-lg object-cover"
                    onError={(e) => {
                      if (e.currentTarget.src !== coverFallback) e.currentTarget.src = coverFallback;
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs">{novel.title}</strong>
                    <span className="block truncate text-[10px] text-muted-foreground">{novel.author}</span>
                  </span>
                  <ArrowUpLeft size={14} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {authors.length > 0 && (
            <div className="mb-1">
              <div className="flex items-center gap-2 px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                <User size={12} /> مؤلفون
              </div>
              {authors.map((author) => (
                <button
                  key={author.slug}
                  type="button"
                  onMouseDown={() => navigate(`/authors/${author.slug}`)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-right hover:bg-muted"
                >
                  <span className="grid size-10 place-items-center rounded-full bg-[#f0eeff] text-xs font-extrabold text-[#675de8] dark:bg-[#24224c]">
                    {author.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs">{author.name}</strong>
                    <span className="block text-[10px] text-muted-foreground">{author.bookCount} رواية</span>
                  </span>
                  <ArrowUpLeft size={14} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {genres.length > 0 && (
            <div className="mb-1">
              <div className="flex items-center gap-2 px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">
                <Hash size={12} /> تصنيفات
              </div>
              {genres.map((genre) => (
                <button
                  key={genre.slug}
                  type="button"
                  onMouseDown={() => navigate(`/genres/${genre.slug}`)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-right hover:bg-muted"
                >
                  <span className="grid size-10 place-items-center rounded-xl bg-muted text-sm">{genre.icon ?? '✦'}</span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-xs">{genre.name}</strong>
                    <span className="block text-[10px] text-muted-foreground">تصفح التصنيف</span>
                  </span>
                  <ArrowUpLeft size={14} className="text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {q.length > 1 && !novelsQuery.isFetching && !hasAny && (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              لا توجد نتائج مطابقة. جرّب كلمة أدق.
            </div>
          )}

          {q.length > 1 && (
            <button
              type="button"
              onMouseDown={() => submit(q)}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs font-extrabold text-[#675de8] hover:bg-muted"
            >
              <Search size={14} />
              عرض كل نتائج «{q}»
            </button>
          )}
        </div>
      )}
    </div>
  );
}
