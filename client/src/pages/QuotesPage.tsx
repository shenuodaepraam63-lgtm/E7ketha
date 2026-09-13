import { BookOpen, Quote } from 'lucide-react';
import { Link } from 'wouter';
import { PageIntro, Breadcrumbs } from '@/components/SiteShell';

const quotes = [
  { text: 'ليست القراءة هروبًا من الحياة، بل عودة إليها بعيون جديدة.', book: 'رِواية', author: 'اقتباس مختار' },
  { text: 'كل كتاب نقرأه يترك فينا نافذة صغيرة تطل على عالم لم نعرفه من قبل.', book: 'مساحات القراءة', author: 'اقتباس مختار' },
  { text: 'الأماكن التي نحبها في الكتب تظل معنا حتى بعد أن نغلق صفحاتها.', book: 'أثر الحكايات', author: 'اقتباس مختار' },
  { text: 'حين نعثر على الرواية المناسبة، يصبح الوقت الذي نقضيه معها وقتًا مستعادًا.', book: 'الرواية القادمة', author: 'اقتباس مختار' },
  { text: 'في كل حكاية شخصية تشبهنا، حتى لو لم نلتقِ بها في الحياة.', book: 'عالم من الشخصيات', author: 'اقتباس مختار' },
  { text: 'الكتاب الجيد لا يخبرك ماذا تفكر، بل يمنحك مساحة لتفكر بشكل أعمق.', book: 'بين السطور', author: 'اقتباس مختار' },
];

export default function QuotesPage() {
  return <div className="container py-10 md:py-16">
    <Breadcrumbs items={['اقتباسات الكتب']} />
    <PageIntro eyebrow="بين السطور" title="اقتباسات الكتب" description="كلمات قصيرة من عوالم كبيرة؛ احتفظ بالاقتباس الذي يشبهك وشاركه مع من يحب القراءة." />
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {quotes.map((quote, index) => <article key={`${quote.book}-${index}`} className="group relative overflow-hidden rounded-[26px] border border-border bg-card p-6 shadow-[0_18px_50px_-38px_rgba(22,30,70,.5)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_58px_-34px_rgba(91,77,232,.35)]">
        <div className="mb-8 flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl bg-[#f0eeff] text-[#675de8] dark:bg-[#24224c] dark:text-[#bcb7ff]"><Quote size={20} /></span><span className="text-[11px] font-bold text-muted-foreground">0{index + 1}</span></div>
        <blockquote className="text-lg font-extrabold leading-9 tracking-[-.04em]">“{quote.text}”</blockquote>
        <div className="mt-8 flex items-center gap-3 border-t border-border pt-4"><BookOpen size={15} className="text-[#675de8]" /><div><p className="text-xs font-extrabold">{quote.book}</p><p className="mt-1 text-[10px] text-muted-foreground">{quote.author}</p></div></div>
      </article>)}
    </div>
    <div className="mt-12 rounded-[24px] bg-[#171e42] p-7 text-white md:flex md:items-center md:justify-between md:gap-8"><div><p className="text-xs font-bold text-[#c9c4ff]">اكتشف المزيد</p><h2 className="mt-2 text-xl font-extrabold">ابحث عن الرواية التي خرج منها اقتباسك المفضل.</h2></div><Link href="/explore" className="mt-5 inline-flex rounded-xl bg-[#eeeefe] px-5 py-3 text-xs font-extrabold text-[#171e42] md:mt-0">استكشف الروايات</Link></div>
  </div>;
}
