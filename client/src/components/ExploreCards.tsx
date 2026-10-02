import { ArrowUpLeft, BookOpen, ChevronLeft } from 'lucide-react';
import { Link } from 'wouter';
import type { Author } from '@/lib/data';

export function AuthorCard({ author }: { author: Author }) {
  return (
    <Link
      href={`/authors/${author.slug}`}
      className="interactive group flex min-w-[200px] sm:min-w-[245px] items-center gap-4 rounded-[20px] border border-border/80 bg-card p-4 shadow-[0_12px_30px_-28px_rgba(20,28,60,.6)]"
    >
      <img
        src={author.avatar}
        alt={`صورة ${author.name}`}
        width="64"
        height="64"
        loading="lazy"
        decoding="async"
        className="size-16 rounded-[18px] object-cover grayscale-[.15] transition duration-300 group-hover:grayscale-0"
      />
      <span className="min-w-0">
        <strong className="block truncate text-sm font-extrabold">{author.name}</strong>
        <span className="mt-1 block text-xs text-muted-foreground">{author.books} رواية</span>
        <span className="mt-2 block truncate text-[10px] text-[#7067ef]">{author.genres.join(' · ')}</span>
      </span>
      <ChevronLeft size={16} className="mr-auto shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1" />
    </Link>
  );
}

export function GenreCard({ genre }: { genre: { name: string; slug: string; count: number; icon: string; description: string; image?: string } }) {
  return (
    <Link href={`/genres/${genre.slug}`} className="genre-card group relative block w-[210px] min-w-[210px] overflow-hidden rounded-[22px] border border-border/80 bg-card sm:w-[250px] sm:min-w-[250px]">
      <div className="genre-card__image relative aspect-[1.35/1] overflow-hidden bg-muted">
        <img src={genre.image} alt={`تصنيف ${genre.name}`} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#10152e]/90 via-[#10152e]/15 to-transparent" />
        <span className="absolute start-3 top-3 grid size-9 place-items-center rounded-xl bg-white/90 text-base text-[#5d52dd] shadow-sm dark:bg-[#171b36]/90">{genre.icon}</span>
        <div className="absolute inset-x-4 bottom-3 text-white">
          <h3 className="text-base font-extrabold tracking-[-0.02em]">{genre.name}</h3>
          <span className="mt-1 block text-[11px] font-semibold text-white/70">{genre.count} رواية</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="line-clamp-1 text-xs text-muted-foreground">{genre.description}</p>
        <ArrowUpLeft size={15} className="shrink-0 text-[#7067ef] transition-transform group-hover:-translate-x-1" />
      </div>
    </Link>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  href,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="section-label mb-2">{eyebrow}</div>}
        <h2 className="text-2xl font-extrabold tracking-[-0.06em] md:text-[30px]">{title}</h2>
        {subtitle && <p className="mt-2 max-w-xl text-sm leading-7 text-muted-foreground">{subtitle}</p>}
      </div>
      {href && (
        <Link href={href} className="hidden items-center gap-1 text-xs font-bold text-[#6359df] transition-colors hover:text-[#4f45c8] sm:flex">
          عرض الكل <ChevronLeft size={15} />
        </Link>
      )}
    </div>
  );
}

export function BookStat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-[16px] border border-border bg-card p-4 shadow-[0_8px_24px_-20px_rgba(20,28,60,.35)]">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <strong className="text-xl font-extrabold">{value}</strong>
    </div>
  );
}

export function InfoChip({ children, tone = 'violet' }: { children: React.ReactNode; tone?: 'violet' | 'slate' | 'amber' }) {
  const tones = {
    violet: 'bg-[#f0eeff] text-[#5d52dd] dark:bg-[#24224c] dark:text-[#b6b0ff]',
    slate: 'bg-muted text-muted-foreground',
    amber: 'bg-[#fff6e8] text-[#a76819] dark:bg-[#3d2a17] dark:text-[#ffc875]',
  };
  return <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

export function TinyBookIcon() {
  return <BookOpen size={14} />;
}
