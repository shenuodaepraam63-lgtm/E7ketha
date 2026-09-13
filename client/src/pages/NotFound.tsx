import { ArrowUpLeft, Home, Search } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return <div className="container flex min-h-[calc(100vh-72px)] items-center justify-center py-16"><div className="max-w-lg text-center"><div className="mx-auto mb-7 grid size-20 place-items-center rounded-[26px] bg-[#eceaff] text-3xl font-extrabold text-[#675de8] dark:bg-[#25264e]">404</div><div className="section-label mb-3">الصفحة غير موجودة</div><h1 className="text-3xl font-extrabold tracking-[-.07em] md:text-4xl">الرواية دي اختفت من الرف</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">لكن ممكن نساعدك تكتشف رواية تانية بدلها.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/" className="flex items-center gap-2 rounded-xl bg-[#171e42] px-5 py-3 text-xs font-bold text-white dark:bg-[#eeeefe] dark:text-[#171e42]">العودة للرئيسية <Home size={15} /></Link><Link href="/search" className="flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-xs font-bold">ابحث عن رواية <Search size={15} /></Link></div></div></div>;
}
