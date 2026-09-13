import { Heart, Share2, Star, UserRound } from 'lucide-react';
import { Link, useLocation, useRoute } from 'wouter';
import { useEffect } from 'react';
import { Breadcrumbs, EmptyState } from '@/components/SiteShell';
import { InfoChip, SectionHeading } from '@/components/ExploreCards';
import { NovelCard } from '@/components/NovelCard';
import { coverFallback, toNovel } from '@/lib/data';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { BookLoader } from '@/components/BookLoader';

export default function NovelPage() {
  const [location, navigate] = useLocation();
  const [, booksParams] = useRoute('/books/:slug');
  const [, novelParams] = useRoute('/novel/:slug');
  const [, novelsParams] = useRoute('/novels/:slug');
  const slug = booksParams?.slug ?? novelParams?.slug ?? novelsParams?.slug ?? decodeURIComponent(location.split('/').pop() ?? '');
  const query = trpc.novels.bySlug.useQuery({ slug }, { enabled: Boolean(slug) });
  const novel = query.data ? toNovel(query.data) : null;
  useEffect(() => { if (query.data?.slug && slug !== query.data.slug) navigate(`/books/${query.data.slug}`, { replace: true }); }, [navigate, query.data?.slug, slug]);
  const utils = trpc.useUtils();
  const listQuery = trpc.readingList.list.useQuery(undefined, { enabled: Boolean(novel) });
  const add = trpc.readingList.add.useMutation({ onSuccess: () => { toast.success('أُضيفت إلى قائمة قراءتك'); void utils.readingList.list.invalidate(); }, onError: () => toast.error('سجّل الدخول أولًا لحفظ الروايات') });
  const remove = trpc.readingList.remove.useMutation({ onSuccess: () => { toast.success('أُزيلت من قائمتك'); void utils.readingList.list.invalidate(); } });
  const rate = trpc.ratings.set.useMutation({ onSuccess: () => toast.success('تم حفظ تقييمك'), onError: () => toast.error('سجّل الدخول أولًا لإضافة تقييم') });
  if (query.isLoading) return <BookLoader label="نقلب الصفحات ونفتح لك الرواية" />;
  if (!novel) return <div className="container py-16"><EmptyState title="الرواية غير موجودة" description="لم نعثر على هذه الرواية في قاعدة البيانات." action="استكشف الروايات" /></div>;
  const saved = Boolean(listQuery.data?.some((item) => item.slug === novel.slug));
  const share = async () => { if (navigator.share) await navigator.share({ title: novel.title, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); toast.success('تم نسخ الرابط'); } };
  return <div className="container py-10 md:py-14"><Breadcrumbs items={['الروايات', novel.title]} /><div className="mb-10 grid gap-10 lg:grid-cols-[285px_1fr] lg:gap-16"><div className="mx-auto w-full max-w-[260px] lg:mx-0"><img src={novel.cover || coverFallback} alt={`غلاف ${novel.title}`} className="aspect-[3/4.2] w-full rounded-[22px] object-cover shadow-xl" /><div className="mt-5 flex gap-2"><button onClick={() => saved ? remove.mutate({ slug: novel.slug }) : add.mutate({ slug: novel.slug })} className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold"><Heart size={15} fill={saved ? 'currentColor' : 'none'} />{saved ? 'في قائمتك' : 'أضف لقائمتي'}</button><button onClick={share} className="grid size-11 place-items-center rounded-xl border" aria-label="مشاركة"><Share2 size={15} /></button></div></div><div><div className="mb-3 flex flex-wrap gap-2"><InfoChip>{novel.status}</InfoChip></div><h1 className="text-4xl font-extrabold tracking-[-.08em] md:text-6xl">{novel.title}</h1><Link href={`/authors/${novel.authorSlug}`} className="mt-3 inline-flex items-center gap-2 text-base font-semibold text-[#675de8]"><UserRound size={16} />{novel.author}</Link><div className="mt-6 flex items-center gap-3"><span className="flex items-center gap-2 rounded-xl bg-[#fff7ea] px-3 py-2 text-sm font-extrabold text-[#b9761e]"><Star size={17} fill="currentColor" />{novel.rating.toFixed(1)}</span><span className="text-xs text-muted-foreground">تقييم القراء من البيانات المحفوظة</span></div><div className="my-8 grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="الأجزاء" value={String(novel.parts)} /><Stat label="اللغة" value={novel.language === 'ar' ? 'العربية' : novel.language ?? '—'} /><Stat label="السنة" value={novel.publicationYear ? String(novel.publicationYear) : '—'} /><Stat label="الحالة" value={novel.status} /></div><div className="rounded-[20px] border border-border bg-card p-5"><h2 className="mb-3 text-base font-extrabold">نبذة عن الرواية</h2><p className="text-sm leading-8 text-muted-foreground">{novel.description || 'لا يوجد وصف منشور لهذه الرواية بعد.'}</p></div></div></div><section className="mb-12 rounded-[20px] border border-border bg-card p-5"><h2 className="mb-4 text-base font-extrabold">قيّم الرواية</h2><div className="flex gap-1">{[1, 2, 3, 4, 5].map((item) => <button key={item} onClick={() => rate.mutate({ slug: novel.slug, rating: item })} className="text-2xl text-[#c28228]" aria-label={`تقييم ${item}`}>★</button>)}</div></section><section><SectionHeading title="المزيد من الروايات" subtitle="اكتشف بقية مكتبة رِواية من قاعدة البيانات." href="/explore" /><NovelRecommendations currentSlug={novel.slug} /></section></div>;
}
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-[16px] border border-border p-4"><span className="block text-[10px] text-muted-foreground">{label}</span><strong className="mt-2 block text-lg">{value}</strong></div>; }
function NovelRecommendations({ currentSlug }: { currentSlug: string }) { const query = trpc.novels.search.useQuery({ sort: 'popular', limit: 5 }); const items = (query.data ?? []).filter((item) => item.slug !== currentSlug).slice(0, 4).map(toNovel); return <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">{items.map((item) => <NovelCard key={item.id} novel={item} />)}</div>; }
