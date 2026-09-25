/** Semantic search intent wiring into searchNovels. Idempotent. */
import fs from 'node:fs';

const dbFile = 'server/db.ts';
if (!fs.existsSync(dbFile)) process.exit(0);
let s = fs.readFileSync(dbFile, 'utf8');

if (!s.includes('parseSearchIntent')) {
  s = s.replace(
    "import { expandArabicQueryVariants, rankSearchRows } from './arabicSearch';",
    "import { expandArabicQueryVariants, rankSearchRows, parseSearchIntent } from './arabicSearch';",
  );
}

if (!s.includes('const intent = parseSearchIntent')) {
  s = s.replace(
    'export async function searchNovels(filters: NovelSearchFilters = {}) {\n  const db = await getDb();\n  if (!db) {\n    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);\n    const query = filters.q?.trim();',
    `export async function searchNovels(filters: NovelSearchFilters = {}) {
  const intent = parseSearchIntent(filters.q ?? '');
  const effectiveGenreSlug = filters.genreSlug || intent.genreSlugs[0];
  const effectiveStatus = filters.status || intent.preferStatus;
  const db = await getDb();
  if (!db) {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
    const query = (intent.residualQuery || filters.q || '').trim() || undefined;`,
  );
}

s = s.replace(
  "if (filters.status) params.set('status', `eq.${filters.status}`);",
  "if (effectiveStatus) params.set('status', `eq.${effectiveStatus}`);",
);

if (!s.includes('Semantic path: genre intent') && !s.includes('if (filters.q?.trim() || effectiveGenreSlug)')) {
  s = s.replace(
    `    return rows.map((row) => ({ ...row, slug: normalizeNovelSlug(row.slug, row.title), author: '', authorSlug: '' }));
  }
  const conditions = [];
  const query = filters.q?.trim();`,
    `    if (filters.q?.trim() || effectiveGenreSlug) {
      if (rows.length && !rows[0]?.author) {
        const ids = Array.from(new Set(rows.map((r) => r.authorId).filter(Boolean)));
        const authorsRows = ids.length ? await supabaseRest('authors', \`select=id,name,slug&id=in.(\${ids.join(',')})\`) : [];
        const amap = new Map(authorsRows.map((a) => [String(a.id), a]));
        rows = rows.map((row) => ({
          ...row,
          slug: normalizeNovelSlug(row.slug, row.title),
          author: amap.get(String(row.authorId))?.name ?? row.author ?? '',
          authorSlug: amap.get(String(row.authorId))?.slug ?? row.authorSlug ?? '',
        }));
      }
      if (effectiveGenreSlug) {
        try {
          const genres = await supabaseRest('genres', \`select=id,slug&slug=eq.\${encodeURIComponent(effectiveGenreSlug)}&limit=1\`);
          const gid = genres[0]?.id;
          if (gid) {
            const links = await supabaseRest('novelGenres', \`select=novelId&genreId=eq.\${gid}&limit=120\`);
            const allow = new Set(links.map((l) => Number(l.novelId)));
            if (allow.size) {
              const filtered = rows.filter((r) => allow.has(Number(r.id)));
              if (filtered.length) {
                rows = filtered.map((r) => ({ ...r, genreSlugs: [effectiveGenreSlug, ...(r.genreSlugs ?? [])] }));
              } else {
                const ids = Array.from(allow).slice(0, limit).join(',');
                if (ids) {
                  rows = await supabaseRest('novels', \`select=*&id=in.(\${ids})&limit=\${limit}\`);
                  const aids = Array.from(new Set(rows.map((r) => r.authorId).filter(Boolean)));
                  const authorsRows = aids.length ? await supabaseRest('authors', \`select=id,name,slug&id=in.(\${aids.join(',')})\`) : [];
                  const amap = new Map(authorsRows.map((a) => [String(a.id), a]));
                  rows = rows.map((row) => ({
                    ...row,
                    slug: normalizeNovelSlug(row.slug, row.title),
                    author: amap.get(String(row.authorId))?.name ?? '',
                    authorSlug: amap.get(String(row.authorId))?.slug ?? '',
                    genreSlugs: [effectiveGenreSlug],
                  }));
                }
              }
            }
          }
        } catch { /* ignore */ }
      }
      if (intent.maxParts) {
        const soft = rows.filter((r) => Number(r.parts ?? 1) <= intent.maxParts);
        if (soft.length) rows = soft;
      }
      return rankSearchRows(rows, filters.q ?? query ?? '', intent).slice(0, limit);
    }
    return rows.map((row) => ({ ...row, slug: normalizeNovelSlug(row.slug, row.title), author: '', authorSlug: '' }));
  }
  const conditions = [];
  const query = (intent.residualQuery || filters.q || '').trim();`,
  );
}

fs.writeFileSync(dbFile, s);
console.log('[patch-semantic-search] db');

const ep = 'client/src/pages/ExplorePages.tsx';
if (fs.existsSync(ep)) {
  let e = fs.readFileSync(ep, 'utf8');
  e = e.replace(
    'ابحث بالعنوان أو اسم المؤلف أو التصنيف — نتائج حية من مكتبة رِواية.',
    'ابحث بالعنوان أو بجملة طبيعية مثل «رواية رعب نفسي قصيرة» — نفهم التصنيف والطول تلقائيًا.',
  );
  fs.writeFileSync(ep, e);
  console.log('[patch-semantic-search] ExplorePages');
}
