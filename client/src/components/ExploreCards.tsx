import { ArrowUpLeft, BookOpen, ChevronLeft } from 'lucide-react';
import { Link } from 'wouter';
import type { Author } from '@/lib/data';

export function AuthorCard({ author }: { author: Author }) {
  return <Link href={`/authors/${author.slug}`} className="interactive group flex min-w-[245px] items-center gap-4 rounded-[20px] border border-border/80 bg-card p-4 shadow-[0_12px_30px_-28px_rgba(20,28,60,.6)]">
    <img src={author.avatar} alt={`صورة ${author.name}`} width="64" height="64" loading="lazy" decoding="async" className="size-16 rounded-[18px] object-cover grayscale-[.15] transition duration-300 group-hover:grayscale-0" />
    <span className="min-w-0"><strong className="block truncate text-sm font-extrabold">{author.name}</strong><span className="mt-1 block text-xs text-muted-foreground">{author.books} رواية</span><span className="mt-2 block truncate text-[10px] text-[#7067ef]">{author.genres.join(' · ')}</span></span>
    <ChevronLeft size={16} className="mr-auto shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1" />
  </Link>;
}

export function GenreCard({ genre }: { genre: { name: string; slug: string; count: number; icon: string; description: string } }) {
  return <Link href={`/genres/${genre.slug}`} className="interactive group relative overflow-hidden rounded-[20px] border border-border/80 bg-card p-5">
    <span className="mb-7 grid size-10 place-items-center rounded-[14px] bg-[#f0eeff] text-lg text-[#5d52dd] dark:bg-[#24224c]">{genre.icon}</span>
    <h3 className="text-base font-extrabold">{genre.name}</h3>
    <p className="mt-1 text-xs leading-6 text-muted-foreground">{genre.description}</p>
    <span className="mt-4 flex items-center justify-between text-[11px] font-semibold text-muted-foreground"><span>{genre.count} رواية</span><ArrowUpLeft size={15} className="text-[#7067ef] transition-transform group-hover:-translate-x-1" /></span>
  </Link>;
}

export function SectionHeading({ eyebrow, title, subtitle, href }: { eyebrow?: string; title: string; subtitle?: string; href?: string }) {
  return <div className="mb-7 flex items-end justify-between gap-4"><div>{eyebrow && <div className="section-label mb-2">{eyebrow}</div>}<h2 className="text-2xl font-extrabold tracking-[-.06em] md:text-[30px]">{title}</h2>{subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}</div>{href && <Link href={href} className="hidden items-center gap-1 text-xs font-bold text-[#6359df] sm:flex">عرض الكل <ChevronLeft size={15} /></Link>}</div>;
}

export function BookStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="rounded-[16px] border border-border bg-card p-4"><div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">{icon}<span>{label}</span></div><strong className="text-xl font-extrabold">{value}</strong></div>;
}

export function InfoChip({ children, tone = 'violet' }: { children: React.ReactNode; tone?: 'violet' | 'slate' | 'amber' }) {
  const tones = { violet: 'bg-[#f0eeff] text-[#5d52dd] dark:bg-[#24224c] dark:text-[#b6b0ff]', slate: 'bg-muted text-muted-foreground', amber: 'bg-[#fff6e8] text-[#a76819] dark:bg-[#3d2a17] dark:text-[#ffc875]' };
  return <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

export function TinyBookIcon() { return <BookOpen size={14} />; }
