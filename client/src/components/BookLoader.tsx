import { BookOpen } from 'lucide-react';

export function BookLoader({ label = 'لحظات ونفتح لك الصفحة' }: { label?: string }) {
  return <div className="flex min-h-[180px] flex-col items-center justify-center gap-4 text-center" aria-live="polite"><div className="relative grid size-16 place-items-center rounded-2xl bg-[#efeeff] text-[#675de8] shadow-[0_12px_30px_-15px_rgba(103,93,232,.7)]"><BookOpen size={28} className="book-loader" /><span className="absolute inset-0 rounded-2xl border-2 border-[#a49df7]/40" /></div><p className="text-sm font-semibold text-muted-foreground">{label}</p></div>;
}
