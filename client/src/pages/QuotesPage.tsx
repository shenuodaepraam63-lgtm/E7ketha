import { ArrowLeft, ArrowRight, BookOpen, Quote, Loader2, Search, Share2 } from 'lucide-react';
import { Link, useRoute } from 'wouter';
import { useMemo, useState } from 'react';
import { PageIntro, Breadcrumbs, EmptyState } from '@/components/SiteShell';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function QuotesPage() {
  const [visibleCount, setVisibleCount] = useState(10);
  const query = trpc.quotes.list.useQuery({ limit: visibleCount, offset: 0 }, { placeholderData: (previous) => previous });
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => (query.data ?? []).filter((item) => `${item.quote_text} ${item.author_name ?? item.speaker ?? ''} ${item.book_title ?? ''} ${item.category ?? ''}`.toLowerCase().includes(search.toLowerCase().trim())), [query.data, search]);
  return <div className="container py-10 md:py-16">
    <Breadcrumbs items={['اقتباسات الكتب']} />
    <PageIntro eyebrow="بين السطور" title="اقتباسات الكتب" description="اكتشف اقتباسات عن الحياة والحب والنجاح والفلسفة من كتّاب وروايات مختلفة." /><div className="mb-8 flex flex-wrap items-center gap-3"><div className="flex min-w-[240px] flex-1 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"><Search size={18} className="text-[#675de8]" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="ابحث عن اقتباس أو كاتب أو كتاب..." /></div><Link href="/quotes/categories" className="rounded-2xl border border-[#675de8]/30 bg-[#f0eeff] px-4 py-3 text-xs font-extrabold text-[#675de8]">تصفح التصنيفات</Link></div>
    {query.isLoading ? <div className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="animate-spin" size={18} /> جارٍ تحميل الاقتباسات...</div> : <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {filtered.map((item, index) => <Link key={item.id} href={`/quotes/${item.id}`} className="group relative overflow-hidden rounded-[26px] border border-border bg-card p-6 shadow-[0_18px_50px_-38px_rgba(22,30,70,.5)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_58px_-34px_rgba(91,77,232,.35)]">
        <div className="mb-8 flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-[#f0eeff] text-[#675de8] dark:bg-[#24224c] dark:text-[#bcb7ff]"><Quote size={20} /></span><span className="text-[11px] font-bold text-muted-foreground">{String(index + 1).padStart(2, '0')}</span></div>
        <blockquote className="text-lg font-extrabold leading-9 tracking-[-.04em]">“{item.quote_text}”</blockquote>
        <div className="mt-8 flex items-center gap-3 border-t border-border pt-4"><BookOpen size={15} className="text-[#675de8]" /><div>{item.book_slug ? <Link href={`/books/${item.book_slug}`} onClick={(event) => event.stopPropagation()} className="block text-xs font-extrabold hover:text-[#675de8]">{item.book_title}</Link> : <p className="text-xs font-extrabold">{item.book_title || 'مصدر غير محدد'}</p>}{item.author_slug ? <Link href={`/authors/${item.author_slug}`} onClick={(event) => event.stopPropagation()} className="mt-1 block text-[10px] text-muted-foreground hover:text-[#675de8]">{item.author_name}</Link> : <p className="mt-1 text-[10px] text-muted-foreground">{item.author_name || item.speaker || 'القائل غير محدد'}</p>}{item.category && <p className="mt-1 text-[10px] text-muted-foreground">{item.category}</p>}</div></div>
      </Link>)}{!query.isLoading && (query.data?.length ?? 0) >= visibleCount && <button type="button" onClick={() => setVisibleCount((count) => count + 10)} className="mx-auto mt-2 rounded-xl border border-[#675de8]/30 bg-[#f0eeff] px-6 py-3 text-xs font-extrabold text-[#675de8] md:col-span-2 lg:col-span-3">{query.isFetching ? 'جارٍ التحميل...' : 'المزيد من الاقتباسات'}</button>}
    </div>}
    {!query.isLoading && !filtered.length && <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">لا توجد اقتباسات مطابقة.</div>}
    <div className="mt-12 rounded-[24px] bg-[#171e42] p-7 text-white md:flex md:items-center md:justify-between md:gap-8"><div><p className="text-xs font-bold text-[#c9c4ff]">اكتشف المزيد</p><h2 className="mt-2 text-xl font-extrabold">ابحث عن الرواية التي خرج منها اقتباسك المفضل.</h2></div><Link href="/explore" className="mt-5 inline-flex rounded-xl bg-[#eeeefe] px-5 py-3 text-xs font-extrabold text-[#171e42] md:mt-0">استكشف الروايات</Link></div>
  </div>;
}

export function QuotePage() {
  const [, params] = useRoute('/quotes/:id');
  const id = Number(params?.id);
  const query = trpc.quotes.byId.useQuery({ id }, { enabled: Number.isInteger(id) && id > 0 });
  const item = query.data;
  const share = async () => { if (navigator.share) await navigator.share({ title: 'اقتباس من رِواية', text: item?.quote_text, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); toast.success('تم نسخ الرابط'); } };
  const neighbors = trpc.quotes.neighbors.useQuery({ id }, { enabled: Number.isInteger(id) && id > 0, staleTime: 5 * 60 * 1000 });
  if (query.isLoading) return <div className="container py-20 text-center text-muted-foreground">جارٍ تحميل الاقتباس...</div>;
  if (!item) return <div className="container py-16"><EmptyState title="الاقتباس غير موجود" description="قد يكون الاقتباس غير منشور أو أُزيل من الأرشيف." action="تصفح الاقتباسات" /></div>;
  return <div className="container py-10 md:py-20"><Breadcrumbs items={['اقتباسات الكتب', item.book_title || 'اقتباس']} /><button type="button" onClick={() => window.history.back()} className="mb-5 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold"><ArrowRight size={15} /> رجوع للصفحة السابقة</button><article className="mx-auto max-w-3xl rounded-[30px] border border-border bg-card p-7 shadow-xl md:p-14"><Quote className="mb-8 text-[#675de8]" size={38} /><blockquote className="text-2xl font-extrabold leading-[2] md:text-4xl">“{item.quote_text}”</blockquote><div className="mt-10 border-t border-border pt-6">{item.author_slug ? <Link href={`/authors/${item.author_slug}`} className="font-extrabold text-[#675de8]">{item.author_name}</Link> : <p className="font-extrabold">{item.author_name || item.speaker || 'القائل غير محدد'}</p>}{item.book_slug ? <Link href={`/books/${item.book_slug}`} className="mt-2 block text-sm text-muted-foreground hover:text-[#675de8]">{item.book_title}</Link> : <p className="mt-2 text-sm text-muted-foreground">{item.book_title || 'مصدر غير محدد'}</p>}{item.category && <p className="mt-2 text-xs text-muted-foreground">{item.category}</p>}</div><div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">{neighbors.data?.previous ? <Link href={`/quotes/${neighbors.data.previous.id}`} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold"><ArrowRight size={15} /> السابق</Link> : <span />}{neighbors.data?.next ? <Link href={`/quotes/${neighbors.data.next.id}`} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold">التالي <ArrowLeft size={15} /></Link> : <span />}</div><button onClick={share} className="mt-8 inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold"><Share2 size={15} /> مشاركة الاقتباس</button></article></div>;
}
