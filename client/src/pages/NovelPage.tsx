import { AlertTriangle, Download, ExternalLink, Heart, Info, Megaphone, MessageCircle, Scale, Share2, Star, UserRound } from 'lucide-react';
import { Link, useLocation, useRoute } from 'wouter';
import { useEffect } from 'react';
import { Breadcrumbs, EmptyState } from '@/components/SiteShell';
import { InfoChip, SectionHeading } from '@/components/ExploreCards';
import { NovelCard } from '@/components/NovelCard';
import { coverFallback, toNovel } from '@/lib/data';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { BookLoader } from '@/components/BookLoader';
import { ExternalLinksNotice } from '@/components/ExternalLinksNotice';

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
    setMeta('meta[property="og:url"]', 'property', `${window.location.origin}/books/${novel.id}`);
    setMeta('meta[property="og:image"]', 'property', novel.cover);
    setMeta('meta[name="twitter:title"]', 'name', `${novel.title} — ${novel.author}`);
    setMeta('meta[name="twitter:description"]', 'name', description);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
    canonical.href = `${window.location.origin}/books/${novel.id}`;
    let jsonLd = document.head.querySelector<HTMLScriptElement>('#book-structured-data');
    if (!jsonLd) { jsonLd = document.createElement('script'); jsonLd.id = 'book-structured-data'; jsonLd.type = 'application/ld+json'; document.head.appendChild(jsonLd); }
    jsonLd.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Book', name: novel.title, author: { '@type': 'Person', name: novel.author, url: `${window.location.origin}/authors/${novel.authorSlug}` }, description, image: novel.cover || undefined, inLanguage: novel.language || 'ar', url: `${window.location.origin}/books/${novel.id}` });
  }, [novel]);
  const utils = trpc.useUtils();
  const listQuery = trpc.readingList.list.useQuery(undefined, { enabled: Boolean(novel) });
  const add = trpc.readingList.add.useMutation({ onSuccess: () => { toast.success('أُضيفت إلى قائمة قراءتك'); void utils.readingList.list.invalidate(); }, onError: () => toast.error('سجّل الدخول أولًا لحفظ الروايات') });
  const remove = trpc.readingList.remove.useMutation({ onSuccess: () => { toast.success('أُزيلت من قائمتك'); void utils.readingList.list.invalidate(); } });
  const rate = trpc.ratings.set.useMutation({ onSuccess: () => toast.success('تم حفظ تقييمك'), onError: () => toast.error('سجّل الدخول أولًا لإضافة تقييم') });
  if (query.isLoading) return <BookLoader label="نقلب الصفحات ونفتح لك الرواية" />;
  if (!novel) return <div className="container py-16"><EmptyState title="الرواية غير موجودة" description="لم نعثر على هذه الرواية في قاعدة البيانات." action="استكشف الروايات" /></div>;
  const saved = Boolean(listQuery.data?.some((item) => item.slug === novel.slug));
  const share = async () => { if (navigator.share) await navigator.share({ title: novel.title, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); toast.success('تم نسخ الرابط'); } };
  return <div className="container py-10 md:py-14"><Breadcrumbs items={['الروايات', novel.title]} /><div className="mb-10 grid gap-10 lg:grid-cols-[285px_1fr] lg:gap-16"><div className="mx-auto w-full max-w-[260px] lg:mx-0"><a href={novel.cover || undefined} target="_blank" rel="noreferrer" aria-label={`فتح رابط صورة ${novel.title}`} className="group block"><img src={novel.cover || coverFallback} alt={`غلاف ${novel.title}`} onError={(event) => { event.currentTarget.src = coverFallback; }} className="aspect-[3/4.2] w-full rounded-[22px] object-cover shadow-xl transition duration-300 group-hover:scale-[1.015]" /><span className="mt-2 block text-center text-[10px] text-muted-foreground">اضغط لفتح رابط الصورة</span></a><div className="mt-5 flex gap-2"><button onClick={() => saved ? remove.mutate({ slug: novel.slug }) : add.mutate({ slug: novel.slug })} className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold"><Heart size={15} fill={saved ? 'currentColor' : 'none'} />{saved ? 'في قائمتك' : 'أضف لقائمتي'}</button><button onClick={share} className="grid size-11 place-items-center rounded-xl border" aria-label="مشاركة"><Share2 size={15} /></button></div></div><div><div className="mb-3 flex flex-wrap gap-2"><InfoChip>{novel.status}</InfoChip></div><h1 className="text-4xl font-extrabold tracking-[-.08em] md:text-6xl">{novel.title}</h1><Link href={`/authors/${novel.authorSlug}`} className="mt-3 inline-flex items-center gap-2 text-base font-semibold text-[#675de8]"><UserRound size={16} />{novel.author}</Link><Link href={`/books/${novel.slug}/quotes`} className="mt-3 mr-3 inline-flex rounded-xl border border-[#675de8]/30 px-3 py-2 text-xs font-bold text-[#675de8]">اقتباسات الكتاب</Link><div className="mt-6 flex items-center gap-3"><span className="flex items-center gap-2 rounded-xl bg-[#fff7ea] px-3 py-2 text-sm font-extrabold text-[#b9761e]"><Star size={17} fill="currentColor" />{novel.rating.toFixed(1)}</span><span className="text-xs text-muted-foreground">تقييم القراء من البيانات المحفوظة</span></div><div className="my-8 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="الأجزاء" value={String(novel.parts)} /><Stat label="اللغة" value={novel.language === 'ar' ? 'العربية' : novel.language ?? '—'} /><Stat label="السنة" value={novel.publicationYear ? String(novel.publicationYear) : '—'} /><Stat label="الحالة" value={novel.status} /></div><div className="rounded-[20px] border border-border bg-card p-5"><h2 className="mb-3 text-base font-extrabold">نبذة عن الرواية</h2><p className="text-sm leading-8 text-muted-foreground">{novel.description || 'لا يوجد وصف منشور لهذه الرواية بعد.'}</p></div>{(() => {
  if (!novel.rightsNote) return null;
  let type: 'warning' | 'announcement' | 'clarification' | 'rights' | 'info' = 'rights';
  let body = novel.rightsNote;
  try {
    const parsed = JSON.parse(novel.rightsNote);
    if (parsed && typeof parsed === 'object' && typeof parsed.body === 'string' && parsed.type) {
      type = parsed.type;
      body = parsed.body;
    }
  } catch { /* plain text */ }
  const styles = {
    warning: { box: 'border-red-300/50 bg-red-50/80 text-red-950 dark:border-red-500/30 dark:bg-red-950/25 dark:text-red-100', icon: AlertTriangle, label: 'تحذير', iconClass: 'text-red-600 dark:text-red-300' },
    announcement: { box: 'border-[#675de8]/35 bg-[#f0eeff]/90 text-[#2a2460] dark:border-[#675de8]/40 dark:bg-[#1a1740]/60 dark:text-[#d8d4ff]', icon: Megaphone, label: 'إعلان', iconClass: 'text-[#675de8]' },
    clarification: { box: 'border-sky-300/50 bg-sky-50/80 text-sky-950 dark:border-sky-500/30 dark:bg-sky-950/25 dark:text-sky-100', icon: MessageCircle, label: 'توضيح', iconClass: 'text-sky-600 dark:text-sky-300' },
    rights: { box: 'border-amber-300/40 bg-amber-50/70 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-100', icon: Scale, label: 'حقوق الملكية', iconClass: 'text-amber-600 dark:text-amber-300' },
    info: { box: 'border-emerald-300/40 bg-emerald-50/70 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-100', icon: Info, label: 'معلومة', iconClass: 'text-emerald-600 dark:text-emerald-300' },
  } as const;
  const style = styles[type] ?? styles.rights;
  const Icon = style.icon;
  return <div className={`mt-4 flex gap-3 rounded-2xl border p-4 text-sm leading-7 ${style.box}`} role="note"><Icon className={`mt-0.5 shrink-0 ${style.iconClass}`} size={18} aria-hidden="true" /><div><strong className="mb-1 block text-xs font-extrabold">{style.label}</strong><span>{body}</span></div></div>;
})()}{novel.links?.length ? <><div className="mt-4 rounded-[20px] border border-[#8279ee]/25 bg-gradient-to-br from-[#f8f7ff] to-[#fff8ee] p-5 dark:from-[#151936] dark:to-[#211b25]"><div className="mb-3 flex items-center justify-between"><h2 className="text-base font-extrabold">روابط الرواية</h2><span className="text-[10px] text-muted-foreground">قراءة وتحميل</span></div><div className="grid gap-3 sm:grid-cols-2">{novel.links.map((link, index) => <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer" className={`novel-link-button group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-extrabold ${link.type === 'download' ? 'border-[#c28228]/30 bg-[#fff7ea] text-[#9b6417]' : 'border-[#675de8]/30 bg-[#f0eeff] text-[#5548d1] dark:bg-[#24224c] dark:text-[#c8c4ff]'}`}><span>{link.label}</span>{link.type === 'download' ? <Download size={17} /> : <ExternalLink size={17} />}</a>)}</div></div><ExternalLinksNotice /></> : null}</div></div><section className="mb-12 rounded-[20px] border border-border bg-card p-5"><h2 className="mb-4 text-base font-extrabold">قيّم الرواية</h2><div className="flex gap-1">{[1, 2, 3, 4, 5].map((item) => <button key={item} onClick={() => rate.mutate({ slug: novel.slug, rating: item })} className="text-2xl text-[#c28228]" aria-label={`تقييم ${item}`}>★</button>)}</div></section><section><SectionHeading title="المزيد من الروايات" subtitle="اكتشف بقية مكتبة رِواية من قاعدة البيانات." href="/explore" /><NovelRecommendations currentSlug={novel.slug} /></section></div>;
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-[16px] border border-border p-4"><span className="block text-[10px] text-muted-foreground">{label}</span><strong className="mt-2 block text-lg">{value}</strong></div>; }
function NovelRecommendations({ currentSlug }: { currentSlug: string }) { const query = trpc.novels.search.useQuery({ sort: 'popular', limit: 5 }); const items = (query.data ?? []).filter((item) => item.slug !== currentSlug).slice(0, 4).map(toNovel); return <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">{items.map((item) => <NovelCard key={item.id} novel={item} />)}</div>; }
