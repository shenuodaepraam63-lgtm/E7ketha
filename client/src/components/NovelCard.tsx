import { Heart, Star, ArrowUpLeft } from 'lucide-react';
import { Link } from 'wouter';
import type { Novel } from '@/lib/data';
import { statusStyles } from '@/lib/data';
import { useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export function NovelCard({ novel, compact = false }: { novel: Novel; compact?: boolean }) {
  const [saved, setSaved] = useState(false);
  const utils = trpc.useUtils();
  const addToList = trpc.readingList.add.useMutation({
    onSuccess: () => {
      setSaved(true);
      toast.success('أُضيفت إلى قائمة قراءتك');
      void utils.readingList.list.invalidate();
    },
    onError: () => toast.error('سجّل الدخول أولًا لحفظ الروايات'),
  });
  const removeFromList = trpc.readingList.remove.useMutation({
    onSuccess: () => {
      setSaved(false);
      toast.success('أُزيلت من قائمتك');
      void utils.readingList.list.invalidate();
    },
    onError: () => toast.error('تعذر تحديث قائمتك الآن'),
  });
  const cardRef = useRef<HTMLElement>(null);
  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const card = cardRef.current;
    if (!card || event.pointerType === 'touch') return;
    const bounds = card.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    card.style.setProperty('--pointer-x', `${x}px`);
    card.style.setProperty('--pointer-y', `${y}px`);
    card.style.setProperty('--rotate-x', `${((y / bounds.height) - 0.5) * -4}deg`);
    card.style.setProperty('--rotate-y', `${((x / bounds.width) - 0.5) * 5}deg`);
  };
  const handlePointerLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--rotate-x', '0deg');
    card.style.setProperty('--rotate-y', '0deg');
  };
  return (
    <article ref={cardRef} onPointerMove={handlePointerMove} onPointerLeave={handlePointerLeave} className={`novel-card group relative ${compact ? 'min-w-[178px] max-w-[178px]' : ''}`}>
      <div className="novel-card__visual relative overflow-hidden rounded-[18px] bg-slate-200 dark:bg-slate-800">
        <Link href={`/books/${novel.slug}`} className="block" aria-label={`استكشف رواية ${novel.title}`}>
          <div className={`relative overflow-hidden ${compact ? 'aspect-[3/4.3]' : 'aspect-[3/4.35]'}`}>
            <img src={novel.cover} alt={`غلاف رواية ${novel.title}`} loading="lazy" className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.06]" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-transparent opacity-80" />
            <div className="novel-card__shine pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <span className="absolute bottom-3 right-3 text-[10px] font-semibold text-white/85">{novel.parts === 1 ? 'رواية منفردة' : `${novel.parts} أجزاء`}</span>
          </div>
        </Link>
        <button onClick={() => saved ? removeFromList.mutate({ slug: novel.slug }) : addToList.mutate({ slug: novel.slug, status: 'want_to_read' })} disabled={addToList.isPending || removeFromList.isPending} aria-label={saved ? 'إزالة من القائمة' : 'إضافة إلى قائمة القراءة'} className={`absolute left-3 top-3 grid size-9 place-items-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur transition hover:bg-black/45 disabled:opacity-60 ${saved ? 'text-rose-300' : ''}`}>
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="pt-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <Link href={`/books/${novel.slug}`} className="line-clamp-1 text-[15px] font-extrabold tracking-[-.03em] hover:text-[#675de8]">{novel.title}</Link>
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-[#bc7a25]"><Star size={12} fill="currentColor" />{novel.rating}</span>
        </div>
        <Link href={`/authors/${novel.authorSlug}`} className="block text-xs text-muted-foreground hover:text-[#675de8]">{novel.author}</Link>
        {!compact && <div className="mt-2 flex items-center gap-1.5"><span className="text-[10px] text-muted-foreground">{novel.genres.join(' · ')}</span><span className={`mr-auto rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusStyles[novel.status]}`}>{novel.status}</span></div>}
      </div>
    </article>
  );
}

export function NovelListRow({ novel }: { novel: Novel }) {
  return <Link href={`/books/${novel.slug}`} className="interactive group flex items-center gap-4 rounded-[18px] border border-border/80 bg-card p-3 shadow-[0_10px_28px_-24px_rgba(20,28,60,.5)]">
    <img src={novel.cover} alt={`غلاف ${novel.title}`} className="h-28 w-20 rounded-xl object-cover" />
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3"><h3 className="text-base font-extrabold">{novel.title}</h3><span className="flex shrink-0 items-center gap-1 text-xs font-bold text-[#bf7b22]"><Star size={13} fill="currentColor" />{novel.rating}</span></div>
      <p className="mt-1 text-xs text-muted-foreground">{novel.author} · {novel.genres.join(' · ')}</p>
      <p className="mt-3 line-clamp-2 text-xs leading-6 text-muted-foreground">{novel.description}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#675de8]">استكشف الرواية <ArrowUpLeft size={13} /></span>
    </div>
  </Link>;
}
