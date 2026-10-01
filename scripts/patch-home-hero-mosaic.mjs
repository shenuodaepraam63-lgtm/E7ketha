/**
 * Home hero: single atmospheric wallpaper (user-chosen image) + optional featured novel card.
 * Replaces any previous cover-mosaic grid.
 */
import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
if (!fs.existsSync(path)) {
  console.log('[home-hero] no Home.tsx');
  process.exit(0);
}
let s = fs.readFileSync(path, 'utf8');

const HERO_BG =
  'https://elabasi.com/wp-content/uploads/2026/01/%D8%B1%D9%88%D8%A7%D9%8A%D8%A7%D8%AA-%D8%B9%D8%A7%D9%84%D9%85%D9%8A%D8%A9.jpeg';

// Already on wallpaper style
if (s.includes('hero-wallpaper') && s.includes(HERO_BG)) {
  console.log('[home-hero] wallpaper already applied');
  process.exit(0);
}

// Ensure list limit for featured card
s = s.replace(
  /trpc\.novels\.list\.useQuery\(\{\s*limit:\s*\d+\s*\}\)/,
  'trpc.novels.list.useQuery({ limit: 12 })',
);

// Normalize featured var (drop mosaic)
if (s.includes('const mosaic =')) {
  s = s.replace(
    /const mosaic = novels\.length \? \[\.\.\.novels, \.\.\.novels, \.\.\.novels\]\.slice\(0, 36\) : \[\];\n\s*const featured = novels\[0\];/,
    'const featured = novels[0];',
  );
} else if (!s.includes('const featured =')) {
  s = s.replace(
    'const authors = (authorsQuery.data ?? []).map(toAuthor).slice(0, 6);',
    `const authors = (authorsQuery.data ?? []).map(toAuthor).slice(0, 6);
  const featured = novels[0];`,
  );
}

const wallpaperBlock = `<section className="relative min-h-[min(88vh,720px)] overflow-hidden border-b border-border/60 bg-[#070a16] text-white">
        <div className="hero-wallpaper pointer-events-none absolute inset-0">
          <img
            src="${HERO_BG}"
            alt=""
            className="hero-wallpaper-img h-full w-full object-cover"
            fetchPriority="high"
            decoding="async"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#070a16]/50 via-[#070a16]/72 to-[#070a16]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(103,93,232,0.18),_transparent_60%)]" />
        <div className="container relative grid items-center gap-10 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div className="max-w-xl">`;

// Replace mosaic hero start if present
const mosaicStartRe =
  /<section className="relative min-h-\[min\(92vh,780px\)\][\s\S]*?<div className="max-w-xl">/;
const oldSimpleStart = `<section className="relative overflow-hidden border-b border-border/60 bg-[#0b1025] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(103,93,232,0.35),_transparent_55%)]" />
        <div className="container relative py-14 md:py-20">
          <div className="max-w-2xl">`;

if (mosaicStartRe.test(s)) {
  s = s.replace(mosaicStartRe, wallpaperBlock);
} else if (s.includes(oldSimpleStart)) {
  s = s.replace(oldSimpleStart, wallpaperBlock);
} else if (!s.includes('hero-wallpaper')) {
  console.warn('[home-hero] could not find hero start to replace');
}

// Ensure featured card after tags (if missing)
if (!s.includes('hero-featured-float') && s.includes('featured')) {
  const tagsEnd = `              ))}
            </div>
          </div>
        </div>
      </section>`;
  const tagsEndNew = `              ))}
            </div>
          </div>
          {featured ? (
            <div className="relative mx-auto flex w-full max-w-[280px] justify-center md:max-w-[320px]">
              <Link href={\`/books/\${featured.slug}\`} className="hero-featured-float group relative block w-[72%]">
                <div className="absolute -inset-6 rounded-[2rem] bg-[#675de8]/25 blur-2xl" />
                <div className="relative overflow-hidden rounded-[1.35rem] border border-white/15 bg-[#12172e] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)]">
                  <div className="absolute start-3 top-3 z-10 rounded-full bg-[#675de8] px-2.5 py-1 text-[10px] font-extrabold">مميزة اليوم</div>
                  <img src={optimizeCoverUrl(featured.coverUrl || featured.cover || coverFallback, 480)} alt={featured.title} className="aspect-[2/3] w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-16">
                    <div className="line-clamp-2 text-sm font-extrabold">{featured.title}</div>
                    <div className="mt-1 truncate text-xs text-white/65">{featured.author}</div>
                  </div>
                </div>
              </Link>
            </div>
          ) : null}
        </div>
      </section>`;
  if (s.includes(tagsEnd)) s = s.replace(tagsEnd, tagsEndNew);
}

fs.writeFileSync(path, s);
console.log('[home-hero] wallpaper applied');
