#!/usr/bin/env node
/** Injects withPublicCache around hot public list/search routes if missing. */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const routersPath = join(root, 'server', 'routers.ts');
const cachePath = join(root, 'server', 'publicCache.ts');

if (!existsSync(routersPath)) {
  console.warn('[patch-routers-cache] no routers.ts, skip');
  process.exit(0);
}
if (!existsSync(cachePath)) {
  console.warn('[patch-routers-cache] no publicCache.ts, skip');
  process.exit(0);
}

let t = readFileSync(routersPath, 'utf8');
if (t.includes('withPublicCache')) {
  console.log('[patch-routers-cache] already patched');
  process.exit(0);
}

if (!t.includes("from './_core/trpc'")) {
  console.warn('[patch-routers-cache] unexpected routers shape');
  process.exit(0);
}

t = t.replace(
  "import { adminProcedure, protectedProcedure, publicProcedure, router } from './_core/trpc';",
  "import { adminProcedure, protectedProcedure, publicProcedure, router } from './_core/trpc';\nimport { withPublicCache } from './publicCache';",
);

const oldBlock = `  novels: router({
    list: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional()).query(({ input }) => listNovels(input?.limit ?? 50)),
    search: publicProcedure.input(z.object({
      q: z.string().max(160).optional(),
      genreSlug: z.string().max(120).optional(),
      authorSlug: z.string().max(160).optional(),
      status: z.enum(['standalone', 'completed', 'ongoing']).optional(),
      minRating: z.number().min(0).max(5).optional(),
      sort: z.enum(['popular', 'rating', 'newest', 'title']).default('popular'),
      limit: z.number().int().min(1).max(100).default(50),
    })).query(({ input }) => searchNovels(input)),
    facets: publicProcedure.query(() => getSearchFacets()),
    bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getNovelBySlug(input.slug)),
  }),
  authors: router({ list: publicProcedure.query(() => listAuthors()), bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getAuthorBySlug(input.slug)) }),
  genres: router({ list: publicProcedure.query(() => listGenres()), bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getGenreBySlug(input.slug)) }),
  series: router({ list: publicProcedure.query(() => listSeries()), bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getSeriesBySlug(input.slug)) }),`;

const newBlock = `  novels: router({
    list: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional()).query(({ input }) =>
      withPublicCache(\`novels.list:\${input?.limit ?? 50}\`, 60_000, () => listNovels(input?.limit ?? 50)),
    ),
    search: publicProcedure.input(z.object({
      q: z.string().max(160).optional(),
      genreSlug: z.string().max(120).optional(),
      authorSlug: z.string().max(160).optional(),
      status: z.enum(['standalone', 'completed', 'ongoing']).optional(),
      minRating: z.number().min(0).max(5).optional(),
      sort: z.enum(['popular', 'rating', 'newest', 'title']).default('popular'),
      limit: z.number().int().min(1).max(100).default(50),
    })).query(({ input }) =>
      withPublicCache(
        \`novels.search:\${input.q ?? ''}:\${input.genreSlug ?? ''}:\${input.authorSlug ?? ''}:\${input.status ?? ''}:\${input.minRating ?? ''}:\${input.sort}:\${input.limit}\`,
        45_000,
        () => searchNovels(input),
      ),
    ),
    facets: publicProcedure.query(() => withPublicCache('novels.facets', 120_000, () => getSearchFacets())),
    bySlug: publicProcedure.input(novelSlugInput).query(({ input }) =>
      withPublicCache(\`novels.bySlug:\${input.slug}\`, 60_000, () => getNovelBySlug(input.slug)),
    ),
  }),
  authors: router({
    list: publicProcedure.query(() => withPublicCache('authors.list', 120_000, () => listAuthors())),
    bySlug: publicProcedure.input(novelSlugInput).query(({ input }) =>
      withPublicCache(\`authors.bySlug:\${input.slug}\`, 120_000, () => getAuthorBySlug(input.slug)),
    ),
  }),
  genres: router({
    list: publicProcedure.query(() => withPublicCache('genres.list', 120_000, () => listGenres())),
    bySlug: publicProcedure.input(novelSlugInput).query(({ input }) =>
      withPublicCache(\`genres.bySlug:\${input.slug}\`, 120_000, () => getGenreBySlug(input.slug)),
    ),
  }),
  series: router({
    list: publicProcedure.query(() => withPublicCache('series.list', 120_000, () => listSeries())),
    bySlug: publicProcedure.input(novelSlugInput).query(({ input }) =>
      withPublicCache(\`series.bySlug:\${input.slug}\`, 120_000, () => getSeriesBySlug(input.slug)),
    ),
  }),`;

if (!t.includes(oldBlock)) {
  console.warn('[patch-routers-cache] target block not found — skip');
  process.exit(0);
}
t = t.replace(oldBlock, newBlock);
writeFileSync(routersPath, t);
console.log('[patch-routers-cache] applied public cache wrappers');
