/**
 * Transform Home hero into Abjjad-style animated cover mosaic + featured float card.
 */
import fs from 'fs';

const path = 'client/src/pages/Home.tsx';
if (!fs.existsSync(path)) {
  console.log('[home-mosaic] no Home.tsx');
  process.exit(0);
}
let s = fs.readFileSync(path, 'utf8');
if (s.includes('hero-cover-mosaic')) {
  console.log('[home-mosaic] already applied');
  process.exit(0);
}

s = s.replace(
  'trpc.novels.list.useQuery({ limit: 12 })',
  'trpc.novels.list.useQuery({ limit: 24 })',
);

if (!s.includes('const mosaic =')) {
  s = s.replace(
    'const authors = (authorsQuery.data ?? []).map(toAuthor).slice(0, 6);',
    `const authors = (authorsQuery.data ?? []).map(toAuthor).slice(0, 6);
  const mosaic = novels.length ? [...novels, ...novels, ...novels].slice(0, 36) : [];
  const featured = novels[0];`,
  );
}

const oldHeroStart = `<section className="relative overflow-hidden border-b border-border/60 bg-[#0b1025] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(103,93,232,0.35),_transparent_55%)]" />
        <div className="container relative py-14 md:py-20">
          <div className="max-w-2xl">`;

const newHeroStart = `<section className="relative min-h-[min(92vh,780px)] overflow-hidden border-b border-border/60 bg-[#070a16] text-white">
        <div className="hero-cover-mosaic pointer-events-none absolute inset-0 opacity-[0.45]">
          <div className="absolute inset-0 grid grid-cols-4 gap-2 p-2 sm:grid-cols-6 md:grid-cols-8 md:gap-3 md:p-3">
            {(mosaic.length ? mosaic : Array.from({ length: 24 }).map((_, i) => ({ id: \`p-\${i}\`, coverUrl: coverFallback, title: '' }))).map((n, i) => (
              <div key={\`\${(n as any).id}-\${i}\`} className="aspect-[2/3] overflow-hidden rounded-lg md:rounded-xl">
                <img src={optimizeCoverUrl((n as any).coverUrl || (n as any).cover || coverFallback, 200)} alt="" className="h-full w-full object-cover" loading={i < 8 ? 'eager' : 'lazy'} decoding="async" />
              </div>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#070a16]/55 via-[#070a16]/78 to-[#070a16]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(103,93,232,0.22),_transparent_60%)]" />
        <div className="container relative grid items-center gap-10 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div className="max-w-xl">`;

if (s.includes(oldHeroStart)) {
  s = s.replace(oldHeroStart, newHeroStart);
} else {
  console.warn('[home-mosaic] hero start pattern not found');
}

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

if (s.includes(tagsEnd)) {
  s = s.replace(tagsEnd, tagsEndNew);
} else {
  console.warn('[home-mosaic] tags end pattern not found');
}

fs.writeFileSync(path, s);
console.log('[home-mosaic] applied');
