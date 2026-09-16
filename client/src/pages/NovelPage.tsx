import { AlertTriangle, Download, ExternalLink, Heart, Info, Megaphone, MessageCircle, Scale, Share2, Star, UserRound } from 'lucide-react';
import { Link, useLocation, useRoute } from 'wouter';
import { useEffect } from 'react';
import { Breadcrumbs, EmptyState } from '@/components/SiteShell';
import { InfoChip, SectionHeading } from '@/components/ExploreCards';
import { NovelCard } from '@/components/NovelCard';
import { NovelReviews } from '@/components/NovelReviews';
import { coverFallback, toNovel } from '@/lib/data';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { BookLoader } from '@/components/BookLoader';
import { ExternalLinksNotice } from '@/components/ExternalLinksNotice';
import { AdSlot } from '@/components/AdSlot';

export default function NovelPage() {
  const [location, navigate] = useLocation();
  const [, booksParams] = useRoute('/books/:slug');
  const [, novelParams] = useRoute('/novel/:slug');
  const [, novelsParams] = useRoute('/novels/:slug');
  const slug = booksParams?.slug ?? novelParams?.slug ?? novelsParams?.slug ?? decodeURIComponent(location.split('/').pop() ?? '');
  const query = trpc.novels.bySlug.useQuery({ slug }, { enabled: Boolean(slug) });
  const novel = query.data ? toNovel(query.data) : null;
  useEffect(() => { if (query.data?.id && slug !== String(query.data.id)) navigate(`/books/${query.data.id}`, { replace: true }); }, [navigate, query.data?.id, slug]);
  useEffect(() => {
    if (!novel) return;
    const description = `${novel.title} للكاتب ${novel.author}. ${novel.description || `اكتشف تفاصيل الرواية وتقييم القراء ومعلوماتها على منصة رِواية.`}`.replace(/\s+/g, ' ').trim().slice(0, 160);
    document.title = `${novel.title} — ${novel.author} | رِواية`;
    const setMeta = (selector: string, attribute: 'name' | 'property', content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) { element = document.createElement('meta'); element.setAttribute(attribute, selector.match(/['"]([^'"]+)['"]/)?.[1] ?? ''); document.head.appendChild(element); }
      element.setAttribute('content', content);
    };
    setMeta('meta[name="description"]', 'name', description);
    setMeta('meta[property="og:title"]', 'property', `${novel.title} — ${novel.author}`);
    setMeta('meta[property="og:description"]', 'property', description);
    if (novel.cover) setMeta('meta[property="og:image"]', 'property', novel.cover);
  }, [novel]);
  if (query.isLoading) return <div className="container py-24"><BookLoader /></div>;
  if (!novel) return <div className="container py-16"><EmptyState title="الرواية غير موجودة" description="تحقق من الرابط أو ابحث من صفحة الاستكشاف." action="استكشف الروايات" href="/explore" /></div>;
  return <NovelDetails novel={novel} />;
}

function NovelDetails({ novel }: { novel: ReturnType<typeof toNovel> }) {
  const utils = trpc.useUtils();
  const listQuery = trpc.readingList.list.useQuery(undefined, { enabled: Boolean(novel) });
  const add = trpc.readingList.add.useMutation({ onSuccess: () => { toast.success('أُضيفت إلى قائمة قراءتك'); void utils.readingList.list.invalidate(); }, onError: () => toast.error('سجّل الدخول أولًا لحفظ الروايات') });
  const remove = trpc.readingList.remove.useMutation({ onSuccess: () => { toast.success('أُزيلت من قائمتك'); void utils.readingList.list.invalidate(); } });
  const saved = (listQuery.data ?? []).some((item: { slug: string }) => item.slug === novel.slug);
  const share = () => {
    if (navigator.share) void navigator.share({ title: novel.title, url: window.location.href });
    else { void navigator.clipboard.writeText(window.location.href); toast.success('تم نسخ الرابط'); }
  };
  return <div className="container py-10 md:py-14"><Breadcrumbs items={['الروايات', novel.title]} /><div className="mb-10 grid gap-10 lg:grid-cols-[285px_1fr] lg:gap-16"><div className="mx-auto w-full max-w-[260px] lg:mx-0"><a href={novel.cover || undefined} target="_blank" rel="noreferrer" aria-label={`فتح رابط صورة ${novel.title}`} className="group block"><img src={novel.cover || coverFallback} alt={`غلاف ${novel.title}`} onError={(event) => { event.currentTarget.src = coverFallback; }} className="aspect-[3/4.2] w-full rounded-[22px] object-cover shadow-xl transition duration-300 group-hover:scale-[1.015]" /><span className="mt-2 block text-center text-[10px] text-muted-foreground">اضغط لفتح رابط الصورة</span></a><div className="mt-5 flex gap-2"><button onClick={() => saved ? remove.mutate({ slug: novel.slug }) : add.mutate({ slug: novel.slug })} className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold"><Heart size={15} fill={saved ? 'currentColor' : 'none'} />{saved ? 'في قائمتك' : 'أضف لقائمتي'}</button><button onClick={share} className="grid size-11 place-items-center rounded-xl border" aria-label="مشاركة"><Share2 size={15} /></button></div></div><div><div className="mb-3 flex flex-wrap gap-2"><InfoChip>{novel.status}</InfoChip></div><h1 className="text-4xl font-extrabold tracking-[-.08em] md:text-5xl">{novel.title}</h1><p className="mt-3 text-sm text-muted-foreground"><Link href={`/authors/${novel.authorSlug}`} className="inline-flex items-center gap-1 font-bold text-foreground hover:text-[#675de8]"><UserRound size={14} />{novel.author}</Link></p><div className="mt-6 flex items-center gap-3"><span className="flex items-center gap-2 rounded-xl bg-[#fff7ea] px-3 py-2 text-sm font-extrabold text-[#b9761e]"><Star size={17} fill="currentColor" />{novel.rating.toFixed(1)}</span><span className="text-xs text-muted-foreground">تقييم القراء من البيانات المحفوظة</span></div><div className="my-8 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="الأجزاء" value={String(novel.parts)} /><Stat label="اللغة" value={novel.language === 'ar' ? 'العربية' : novel.language ?? '—'} /><Stat label="السنة" value={novel.publicationYear ? String(novel.publicationYear) : '—'} /><Stat label="الحالة" value={novel.status} /></div><div className="rounded-[20px] border border-border bg-card p-5"><h2 className="mb-3 text-base font-extrabold">نبذة عن الرواية</h2><p className="text-sm leading-8 text-muted-foreground">{novel.description || 'لا يوجد وصف منشور لهذه الرواية بعد.'}</p></div>{novel.rightsNote ? (() => {
    let type = 'rights';
    let body = novel.rightsNote;
    try {
      const parsed = JSON.parse(novel.rightsNote);
      if (parsed && typeof parsed === 'object' && parsed.body) { type = parsed.type || 'rights'; body = parsed.body; }
    } catch { /* plain text */ }
    const styles: Record<string, { box: string; icon: typeof AlertTriangle; label: string }> = {
      warning: { box: 'border-red-500/30 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-100', icon: AlertTriangle, label: 'تحذير' },
      announcement: { box: 'border-amber-500/30 bg-amber-50 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100', icon: Megaphone, label: 'إعلان' },
      clarification: { box: 'border-sky-500/30 bg-sky-50 text-sky-950 dark:bg-sky-950/30 dark:text-sky-100', icon: MessageCircle, label: 'توضيح' },
      info: { box: 'border-emerald-500/30 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100', icon: Info, label: 'معلومة' },
      rights: { box: 'border-violet-500/30 bg-violet-50 text-violet-950 dark:bg-violet-950/30 dark:text-violet-100', icon: Scale, label: 'حقوق' },
    };
    const style = styles[type] ?? styles.rights;
    const Icon = style.icon;
    return <div className={`mt-4 rounded-[20px] border p-4 text-sm ${style.box}`}><div className="mb-1 flex items-center gap-2 font-extrabold"><Icon size={16} />{style.label}</div><p className="leading-7">{body}</p></div>;
  })() : null}{novel.links?.length ? <><div className="mt-4 rounded-[20px] border border-[#8279ee]/25 bg-gradient-to-br from-[#f8f7ff] to-[#fff8ee] p-5 dark:from-[#151936] dark:to-[#211b25]"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-extrabold">روابط الرواية</h2><span className="text-[10px] text-muted-foreground">قراءة وتحميل</span></div><div className="grid gap-3 sm:grid-cols-2">{novel.links.map((link, index) => <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer" className={`novel-link-button group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-extrabold ${link.type === 'download' ? 'border-[#c28228]/30 bg-[#fff7ea] text-[#9b6417]' : 'border-[#675de8]/30 bg-[#f0eeff] text-[#5548d1] dark:bg-[#24224c] dark:text-[#c8c4ff]'}`}><span>{link.label}</span>{link.type === 'download' ? <Download size={17} /> : <ExternalLink size={17} />}</a>)}</div></div><ExternalLinksNotice /></> : null}</div></div><NovelReviews slug={novel.slug} avgRating={Number(novel.rating) || 0} ratingCount={0} /><section><SectionHeading title="المزيد من الروايات" subtitle="اكتشف بقية مكتبة رِواية من قاعدة البيانات." href="/explore" /><NovelRecommendations currentSlug={novel.slug} /></section></div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-border bg-card px-3 py-3 text-center"><div className="text-[10px] text-muted-foreground">{label}</div><div className="mt-1 text-sm font-extrabold">{value}</div></div>;
}

function NovelRecommendations({ currentSlug }: { currentSlug: string }) {
  const query = trpc.novels.search.useQuery({ sort: 'popular', limit: 5 });
  const items = (query.data ?? []).filter((item) => item.slug !== currentSlug).slice(0, 4).map(toNovel);
  return <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">{items.map((item) => <NovelCard key={item.id} novel={item} />)}</div>;
}
