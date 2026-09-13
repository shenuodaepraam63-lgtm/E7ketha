import { ArrowUpLeft, Clock3, Search, Sparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { novels, searchSuggestions } from '@/lib/data';
import { trpc } from '@/lib/trpc';

export function GlobalSearch({ hero = false }: { hero?: boolean }) {
  const [, navigate] = useLocation();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const searchInput = useMemo(() => ({ q: value.trim() || undefined, sort: 'popular' as const, limit: 3 }), [value]);
  const quickSearch = trpc.novels.search.useQuery(searchInput, { enabled: value.trim().length > 1, staleTime: 30_000 });
  const results = value.trim() ? (quickSearch.data ?? novels.filter((novel) => `${novel.title} ${novel.author} ${novel.genres.join(' ')}`.includes(value.trim())).slice(0, 3)) : [];
  const submit = (term = value) => { if (term.trim()) navigate(`/search?q=${encodeURIComponent(term.trim())}`); };
  return <div className={`relative ${hero ? 'w-full' : 'w-full max-w-[310px]'}`}>
    <form onSubmit={(event) => { event.preventDefault(); submit(); }} className={`relative flex items-center gap-3 rounded-[15px] border transition-all ${hero ? 'h-[62px] border-white/15 bg-white/[.08] px-5 text-white backdrop-blur-md focus-within:border-[#a9a1ff]/70 focus-within:bg-white/[.12]' : 'h-11 border-border bg-card px-3 focus-within:border-[#8279ee]'} ${focused ? 'ring-4 ring-[#8f86f3]/10' : ''}`}>
      <Search size={hero ? 20 : 17} className={hero ? 'text-[#c7c3ff]' : 'text-muted-foreground'} />
      <input value={value} onChange={(event) => setValue(event.target.value)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 160)} className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-current ${hero ? 'placeholder:text-white/45' : 'placeholder:text-muted-foreground'}`} placeholder={hero ? 'ابحث عن رواية، مؤلف، تصنيف أو موضوع...' : 'ابحث عن رواية أو مؤلف...'} aria-label="ابحث في رِواية" />
      {value && <button type="button" onClick={() => setValue('')} className="text-current/60 hover:text-current" aria-label="مسح البحث"><X size={16} /></button>}
      {hero && <kbd className="hidden rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[10px] text-white/50 md:block">⌘ K</kbd>}
    </form>
    {focused && <div className="absolute inset-x-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-[18px] border border-border bg-card p-2 text-foreground shadow-[0_20px_50px_-20px_rgba(17,25,65,.35)]">
      {results.length > 0 ? <div><div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground">الروايات</div>{results.map((novel) => { const cover = 'coverUrl' in novel ? novel.coverUrl : novel.cover; return <button key={novel.id} onMouseDown={() => navigate(`/books/${novel.slug}`)} className="flex w-full items-center gap-3 rounded-xl p-2 text-right hover:bg-muted"><img src={cover ?? '/favicon.ico'} className="size-9 rounded-lg object-cover" alt="" /><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{novel.title}</strong><span className="block truncate text-[10px] text-muted-foreground">{novel.author}</span></span><ArrowUpLeft size={14} className="text-muted-foreground" /></button>; })}</div> : <div><div className="flex items-center gap-2 px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.13em] text-muted-foreground"><Clock3 size={12} /> اقتراحات شائعة</div>{searchSuggestions.map((suggestion) => <button key={suggestion} onMouseDown={() => { setValue(suggestion); submit(suggestion); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-xs text-muted-foreground hover:bg-muted hover:text-foreground"><Sparkles size={14} className="text-[#756cf0]" />{suggestion}</button>)}</div>}
    </div>}
  </div>;
}
