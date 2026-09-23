/**
 * Cover optimization + LCP priority on NovelCard / Home.
 */
import fs from "node:fs";

// data.ts
{
  const f = "client/src/lib/data.ts";
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes("optimizeCoverUrl")) {
    s = s.replace(
      /export const coverFallback = '[^']+';/,
      `export const coverFallback = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=400&q=75';

/** Resize/format covers for LCP — Cloudinary transforms or wsrv.nl for remote hosts. */
export function optimizeCoverUrl(src: string | null | undefined, width = 400): string {
  if (!src) return coverFallback;
  try {
    if (src.includes('res.cloudinary.com') && src.includes('/upload/')) {
      if (/\\/upload\\/[^/]*f_auto/.test(src) || src.includes('w_' + width)) return src;
      return src.replace('/upload/', \`/upload/f_auto,q_auto,w_\${width},c_limit/\`);
    }
    if (src.startsWith('http') && !src.includes('wsrv.nl')) {
      return \`https://wsrv.nl/?url=\${encodeURIComponent(src)}&w=\${width}&q=80&output=webp&we\`;
    }
  } catch { /* fallthrough */ }
  return src;
}
`,
    );
    s = s.replace(
      "cover: row.coverUrl ?? coverFallback",
      "cover: optimizeCoverUrl(row.coverUrl ?? coverFallback, 400)",
    );
    fs.writeFileSync(f, s);
    console.log("[patch-novel-perf] data.ts");
  }
}

// NovelCard
{
  const f = "client/src/components/NovelCard.tsx";
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes("optimizeCoverUrl")) {
    s = s.replace(
      "import { coverFallback, statusStyles } from '@/lib/data';",
      "import { coverFallback, optimizeCoverUrl, statusStyles } from '@/lib/data';",
    );
    s = s.replace(
      "export function NovelCard({ novel, compact = false }: { novel: Novel; compact?: boolean }) {",
      "export function NovelCard({ novel, compact = false, priority = false }: { novel: Novel; compact?: boolean; priority?: boolean }) {",
    );
    s = s.replace(/src=\{novel\.cover\}/g, "src={optimizeCoverUrl(novel.cover, 400)}");
    s = s.replace(
      'loading="lazy" decoding="async" className="h-full w-full object-cover',
      'loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" className="h-full w-full object-cover',
    );
    fs.writeFileSync(f, s);
    console.log("[patch-novel-perf] NovelCard.tsx");
  }
}

// Home
{
  const f = "client/src/pages/Home.tsx";
  let s = fs.readFileSync(f, "utf8");
  if (!s.includes("priority={i < 2}")) {
    s = s.replace(
      "import { toAuthor, toGenre, toNovel, coverFallback } from '@/lib/data';",
      "import { toAuthor, toGenre, toNovel, coverFallback, optimizeCoverUrl } from '@/lib/data';",
    );
    s = s.replace(
      "novels.map((novel) => <NovelCard key={novel.id} novel={novel} />)",
      "novels.map((novel, i) => <NovelCard key={novel.id} novel={novel} priority={i < 2} />)",
    );
    s = s.replace(/src=\{novel\.cover \|\| coverFallback\}/g, "src={optimizeCoverUrl(novel.cover || coverFallback, 280)}");
    s = s.replace(/src=\{item\.coverUrl \|\| coverFallback\}/g, "src={optimizeCoverUrl(item.coverUrl || coverFallback, 160)}");
    fs.writeFileSync(f, s);
    console.log("[patch-novel-perf] Home.tsx");
  }
}
