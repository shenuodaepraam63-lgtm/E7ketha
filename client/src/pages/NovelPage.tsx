import { AlertTriangle, Download, ExternalLink, Heart, Info, Megaphone, MessageCircle, Scale, Share2, Star, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { NovelCard } from '@/components/NovelCard';
import { NovelReviews } from '@/components/NovelReviews';
import { ExternalLinksNotice } from '@/components/ExternalLinksNotice';
import { SiteShell } from '@/components/SiteShell';
import { trpc } from '@/lib/trpc';
import { toNovel } from '@/lib/novel';
import { Breadcrumbs, InfoChip, SectionHeading, Stat } from '@/components/Brand';

const coverFallback = 'https://placehold.co/400x560/1a1a2e/e8c48a?text=رواية';

export default function NovelPage() {
  const slug = typeof window !== 'undefined' ? decodeURIComponent(window.location.pathname.split('/').filter(Boolean).pop() || '') : '';
  const query = trpc.novels.bySlug.useQuery({ slug }, { enabled: Boolean(slug) });
  const novel = query.data ? toNovel(query.data as any) : null;

  if (query.isLoading) return <SiteShell><div className="container py-20 text-center text-muted-foreground">جاري التحميل…</div></SiteShell>;
  if (!novel) return <SiteShell><div className="container py-20 text-center">الرواية غير موجودة</div></SiteShell>;

  return (
    <SiteShell>
      <NovelContent novel={novel} />
    </SiteShell>
  );
}

function NovelContent({ novel }: { novel: ReturnType<typeof toNovel> }) {
  const utils = trpc.useUtils();
  const listQuery = trpc.readingList.list.useQuery(undefined, { enabled: Boolean(novel) });
  const add = trpc.readingList.add.useMutation({ onSuccess: () => { toast.success('أُضيفت إلى قائمة قراءتك'); void utils.readingList.list.invalidate(); }, onError: () => toast.error('سجّل الدخول أولًا لحفظ الروايات') });
  const remove = trpc.readingList.remove.useMutation({ onSuccess: () => { toast.success('أُزيلت من قائمتك'); void utils.readingList.list.invalidate(); } });
  const saved = (listQuery.data ?? []).some((item: any) => item.slug === novel.slug);
  const share = () => {
    if (navigator.share) void navigator.share({ title: novel.title, url: window.location.href });
    else { void navigator.clipboard.writeText(window.location.href); toast.success('تم نسخ الرابط'); }
  };

  return <div className="container py-10 md:py-14"><Breadcrumbs items={['الروايات', novel.title]} /><div className="mb-10 grid gap-10 lg:grid-cols-[285px_1fr] lg:gap-16"><div className="mx-auto w-full max-w-[260px] lg:mx-0"><a href={novel.cover || undefined} target="_blank" rel="noreferrer" aria-label={`فتح رابط صورة ${novel.title}`} className="group block"><img src={novel.cover || coverFallback} alt={`غلاف ${novel.title}`} onError={(event) => { event.currentTarget.src = coverFallback; }} className="aspect-[3/4.2] w-full rounded-[22px] object-cover shadow-xl transition duration-300 group-hover:scale-[1.015]" /><span className="mt-2 block text-center text-[10px] text-muted-foreground">اضغط لفتح رابط الصورة</span></a><div className="mt-5 flex gap-2"><button onClick={() => saved ? remove.mutate({ slug: novel.slug }) : add.mutate({ slug: novel.slug })} className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold"><Heart size={15} fill={saved ? 'currentColor' : 'none'} />{saved ? 'في قائمتك' : 'أضف لقائمتي'}</button><button onClick={share} className="grid size-11 place-items-center rounded-xl border" aria-label="مشاركة"><Share2 size={15} /></button></div></div><div><div className="mb-3 flex flex-wrap gap-2"><InfoChip>{novel.status}</InfoChip></div><h1 className="text-4xl font-extrabold tracking-[-.08em] md:text-5xl">{novel.title}</h1><p className="mt-2 text-sm text-muted-foreground"><UserRound size={14} className="inline-block me-1" />{novel.author}</p><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="التقييم" value={novel.rating ? (Number(novel.rating) > 10 ? (Number(novel.rating) / 100).toFixed(1) : String(novel.rating)) : '—'} /><Stat label="الأجزاء" value={String(novel.parts)} /><Stat label="اللغة" value={novel.language === 'ar' ? 'العربية' : novel.language ?? '—'} /><Stat label="السنة" value={novel.publicationYear ? String(novel.publicationYear) : '—'} /></div><div className="mt-6 rounded-[20px] border border-border bg-card p-5"><h2 className="mb-3 text-base font-extrabold">نبذة عن الرواية</h2><p className="text-sm leading-8 text-muted-foreground">{novel.description || 'لا يوجد وصف منشور لهذه الرواية بعد.'}</p></div>{novel.rightsNote ? <div className="mt-4 rounded-[20px] border border-amber-500/30 bg-amber-50/50 p-4 text-sm dark:bg-amber-950/20">{novel.rightsNote}</div> : null}{novel.links?.length ? <><div className="mt-4 rounded-[20px] border border-[#8279ee]/25 bg-gradient-to-br from-[#f8f7ff] to-[#fff8ee] p-5 dark:from-[#151936] dark:to-[#211b25]"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-extrabold">روابط الرواية</h2><span className="text-[10px] text-muted-foreground">قراءة وتحميل</span></div><div className="grid gap-3 sm:grid-cols-2">{novel.links.map((link: any, index: number) => <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer" className={`novel-link-button group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-extrabold ${link.type === 'download' ? 'border-[#c28228]/30 bg-[#fff7ea] text-[#9b6417]' : 'border-[#675de8]/30 bg-[#f0eeff] text-[#5548d1] dark:bg-[#24224c] dark:text-[#c8c4ff]'}`}><span>{link.label}</span>{link.type === 'download' ? <Download size={17} /> : <ExternalLink size={17} />}</a>)}</div></div><ExternalLinksNotice /></> : null}</div></div><NovelReviews slug={novel.slug} avgRating={Number(novel.rating) || 0} ratingCount={Number(novel.ratingCount) || 0} /><section><SectionHeading title="المزيد من الروايات" subtitle="اكتشف بقية مكتبة رِواية من قاعدة البيانات." href="/explore" /><NovelRecommendations currentSlug={novel.slug} /></section></div>;
}

function NovelRecommendations({ currentSlug }: { currentSlug: string }) {
  const query = trpc.novels.search.useQuery({ sort: 'popular', limit: 5 });
  const items = (query.data ?? []).filter((item: any) => item.slug !== currentSlug).slice(0, 4).map(toNovel);
  return <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">{items.map((item) => <NovelCard key={item.id} novel={item} />)}</div>;
}
