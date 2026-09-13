import fs from 'node:fs';
const root = '/home/ubuntu/riwaya-discovery-supabase';
const dbPath = `${root}/server/db.ts`;
let db = fs.readFileSync(dbPath, 'utf8');
const marker = "export type NovelSearchFilters = {";
const helpers = `
async function listAuthorsFromRest() {
  return supabaseRest<any[]>('authors', 'select=*&order=name.asc');
}

async function getAuthorBySlugFromRest(slug: string) {
  const rows = await supabaseRest<any[]>('authors', \\`select=*&slug=eq.\\${encodeURIComponent(slug)}&limit=1\\`);
  return rows[0] ?? null;
}

async function listGenresFromRest() {
  const [genreRows, links] = await Promise.all([
    supabaseRest<any[]>('genres', 'select=id,slug,name,description,icon&order=name.asc'),
    supabaseRest<any[]>('novelGenres', 'select=genreId'),
  ]);
  const counts = new Map<string, number>();
  for (const link of links) counts.set(String(link.genreId), (counts.get(String(link.genreId)) ?? 0) + 1);
  return genreRows.map((row) => ({ ...row, novelCount: counts.get(String(row.id)) ?? 0 }));
}

async function getGenreBySlugFromRest(slug: string) {
  const rows = await supabaseRest<any[]>('genres', \\`select=id,slug,name,description,icon&slug=eq.\\${encodeURIComponent(slug)}&limit=1\\`);
  if (!rows[0]) return null;
  const links = await supabaseRest<any[]>('novelGenres', \\`select=novelId&genreId=eq.\\${rows[0].id}\\`);
  return { ...rows[0], novelCount: links.length };
}

async function listSeriesFromRest() {
  const [seriesRows, links, novelRows] = await Promise.all([
    supabaseRest<any[]>('series', 'select=*&order=title.asc'),
    supabaseRest<any[]>('seriesBooks', 'select=seriesId,novelId,order&order=order.asc'),
    supabaseRest<any[]>('novels', 'select=id,coverUrl'),
  ]);
  const covers = new Map(novelRows.map((row) => [String(row.id), row.coverUrl]));
  return seriesRows.map((row) => {
    const seriesLinks = links.filter((link) => String(link.seriesId) === String(row.id));
    return { ...row, parts: seriesLinks.length, coverUrl: seriesLinks.map((link) => covers.get(String(link.novelId))).find(Boolean) ?? null };
  });
}

async function getSeriesBySlugFromRest(slug: string) {
  const rows = await supabaseRest<any[]>('series', \\`select=*&slug=eq.\\${encodeURIComponent(slug)}&limit=1\\`);
  if (!rows[0]) return null;
  const links = await supabaseRest<any[]>('seriesBooks', \\`select=novelId,order&seriesId=eq.\\${rows[0].id}&order=order.asc\\`);
  const novelIds = links.map((link) => link.novelId).filter(Boolean);
  const novelsRows = novelIds.length ? await supabaseRest<any[]>('novels', \\`select=id,title,slug,coverUrl,authorId&id=in.(\\${novelIds.join(',')})\\`) : [];
  const authorIds = Array.from(new Set(novelsRows.map((novel) => novel.authorId).filter(Boolean)));
  const authorRows = authorIds.length ? await supabaseRest<any[]>('authors', \\`select=id,name&id=in.(\\${authorIds.join(',')})\\`) : [];
  const authorMap = new Map(authorRows.map((author) => [String(author.id), author.name]));
  const novelMap = new Map(novelsRows.map((novel) => [String(novel.id), novel]));
  return { ...rows[0], parts: links.length, coverUrl: novelsRows[0]?.coverUrl ?? null, books: links.map((link) => novelMap.get(String(link.novelId))).filter(Boolean).map((novel) => ({ title: novel.title, slug: normalizeNovelSlug(novel.slug, novel.title), coverUrl: novel.coverUrl, author: authorMap.get(String(novel.authorId)) ?? 'مؤلف غير معروف' })) };
}

async function getSearchFacetsFromRest() {
  const [genresRows, authorsRows] = await Promise.all([
    supabaseRest<any[]>('genres', 'select=slug,name&order=name.asc'),
    supabaseRest<any[]>('authors', 'select=slug,name&order=name.asc'),
  ]);
  return { genres: genresRows, authors: authorsRows };
}

async function searchNovelsFromRest(filters: NovelSearchFilters = {}) {
  const [novelRows, authorRows, links] = await Promise.all([
    supabaseRest<any[]>('novels', 'select=*&order=ratingCount.desc&limit=100'),
    supabaseRest<any[]>('authors', 'select=id,name,slug'),
    supabaseRest<any[]>('novelGenres', 'select=novelId,genreId'),
  ]);
  const authorMap = new Map(authorRows.map((author) => [String(author.id), author]));
  let rows = novelRows.map((row) => ({ ...row, author: authorMap.get(String(row.authorId))?.name ?? 'مؤلف غير معروف', authorSlug: authorMap.get(String(row.authorId))?.slug ?? '', slug: normalizeNovelSlug(row.slug, row.title) }));
  const q = filters.q?.trim().toLowerCase();
  if (q) rows = rows.filter((row) => [row.title, row.author, row.description].some((value) => String(value ?? '').toLowerCase().includes(q)));
  if (filters.authorSlug) rows = rows.filter((row) => row.authorSlug === filters.authorSlug);
  if (filters.status) rows = rows.filter((row) => row.status === filters.status);
  if (filters.minRating) rows = rows.filter((row) => Number(row.rating ?? 0) >= Math.round(filters.minRating * 100));
  if (filters.genreSlug) {
    const genreRows = await supabaseRest<any[]>('genres', \\`select=id&slug=eq.\\${encodeURIComponent(filters.genreSlug)}&limit=1\\`);
    const genreNovelIds = new Set(links.filter((link) => String(link.genreId) === String(genreRows[0]?.id)).map((link) => String(link.novelId)));
    rows = rows.filter((row) => genreNovelIds.has(String(row.id)));
  }
  if (filters.sort === 'rating') rows.sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0));
  if (filters.sort === 'newest') rows.sort((a, b) => Number(b.publicationYear ?? 0) - Number(a.publicationYear ?? 0));
  if (filters.sort === 'title') rows.sort((a, b) => String(a.title).localeCompare(String(b.title), 'ar'));
  return rows.slice(0, Math.min(Math.max(filters.limit ?? 50, 1), 100));
}

`;
if (!db.includes('async function listAuthorsFromRest()')) db = db.replace(marker, helpers + marker);
db = db.replace('export async function listNovels(limit = 50) {\n  const db = await requireDb();', 'export async function listNovels(limit = 50) {\n  const db = await getDb();\n  if (!db) return listNovelsFromRest(limit);');
db = db.replace('export async function searchNovels(filters: NovelSearchFilters = {}) {\n  const db = await requireDb();', 'export async function searchNovels(filters: NovelSearchFilters = {}) {\n  const db = await getDb();\n  if (!db) return searchNovelsFromRest(filters);');
db = db.replace('export async function getSearchFacets() {\n  const db = await requireDb();', 'export async function getSearchFacets() {\n  const db = await getDb();\n  if (!db) return getSearchFacetsFromRest();');
db = db.replace('export async function listAuthors() {\n  const db = await requireDb();', 'export async function listAuthors() {\n  const db = await getDb();\n  if (!db) return listAuthorsFromRest();');
db = db.replace('export async function getAuthorBySlug(slug: string) {\n  const db = await requireDb();', 'export async function getAuthorBySlug(slug: string) {\n  const db = await getDb();\n  if (!db) return getAuthorBySlugFromRest(slug);');
db = db.replace('export async function listGenres() {\n  const db = await requireDb();', 'export async function listGenres() {\n  const db = await getDb();\n  if (!db) return listGenresFromRest();');
db = db.replace('export async function getGenreBySlug(slug: string) {\n  const db = await requireDb();', 'export async function getGenreBySlug(slug: string) {\n  const db = await getDb();\n  if (!db) return getGenreBySlugFromRest(slug);');
db = db.replace('export async function listSeries() {\n  const db = await requireDb();', 'export async function listSeries() {\n  const db = await getDb();\n  if (!db) return listSeriesFromRest();');
db = db.replace('export async function getSeriesBySlug(slug: string) {\n  const db = await requireDb();', 'export async function getSeriesBySlug(slug: string) {\n  const db = await getDb();\n  if (!db) return getSeriesBySlugFromRest(slug);');
db = db.replace('export async function getNovelBySlug(slug: string) {\n  const db = await requireDb();', 'export async function getNovelBySlug(slug: string) {\n  const db = await getDb();\n  if (!db) return getNovelBySlugFromRest(slug);');
fs.writeFileSync(dbPath, db);

const envPath = `${root}/server/_core/env.ts`;
let env = fs.readFileSync(envPath, 'utf8');
if (!env.includes('function validPostgresUrl')) {
  env = env.replace('export const ENV = {', `function validPostgresUrl(value: string) {\n  try { return /^postgres(?:ql)?:\\/\\//i.test(value) && Boolean(new URL(value).hostname); } catch { return false; }\n}\nconst configuredDatabaseUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? '';\n\nexport const ENV = {`);
  env = env.replace('databaseUrl: process.env.SUPABASE_DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "",', 'databaseUrl: validPostgresUrl(configuredDatabaseUrl) ? configuredDatabaseUrl : "",');
}
fs.writeFileSync(envPath, env);
