import { Sparkles } from 'lucide-react';
import { Link } from 'wouter';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="𝐄𝟳𝐤𝐞𝐭𝐡𝐚 — الصفحة الرئيسية">
      <span className="relative grid size-10 place-items-center overflow-hidden rounded-[14px] bg-[#161d42] text-white shadow-[0_8px_22px_-10px_#5b4de8] transition-transform duration-200 group-hover:-rotate-3">
        <span className="absolute -right-1 -top-1 size-5 rounded-full bg-[#8b7cff]/70 blur-[7px]" />
        <Sparkles size={17} strokeWidth={1.7} className="relative" />
      </span>
      {!compact && <span className="text-[20px] font-extrabold tracking-[-.06em] text-[#111b42] dark:text-white">𝐄𝟳𝐤𝐞𝐭𝐡𝐚<span className="text-[#7067ef]">.</span></span>}
    </Link>
  );
}
