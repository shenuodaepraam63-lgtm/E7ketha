import { and, asc, desc, eq, gte, inArray, like, or, sql } from 'drizzle-orm';
import {
  authors,
  genres,
  InsertUser,
  novels,
  novelGenres,
  ratings,
  readingListItems,
  reviews,
  series,
  seriesBooks,
  users,
} from '../drizzle/schema';
import { ENV } from './_core/env';
import { getDb, requireDb, supabaseRest, supabaseCount, supabaseWrite } from './db-shared';

export async function createNovel(input: AdminNovelInput) {
  const db = await getDb();
  const { genreIds = [], links, ...novelInput } = input;
  const resolvedCoverUrl = await resolveCoverUrl(input.coverUrl);
  if (!db) {
    const rows = await supabaseWrite<any[]>('novels', 'POST', { ...novelInput, slug: normalizeNovelSlug(input.slug || input.title), coverUrl: resolvedCoverUrl, description: input.description || null });
    const row = rows[0];
    if (links) await replaceNovelLinks(Number(row.id), links);
    if (genreIds.length) await supabaseWrite('novelGenres', 'POST', genreIds.map((genreId) => ({ novelId: row.id, genreId })));
    return row;
  }
  const [row] = await db.insert(novels).values({ ...novelInput, slug: normalizeNovelSlug(input.slug || input.title), coverUrl: resolvedCoverUrl, description: input.description || null }).returning();
  if (links) await replaceNovelLinks(Number(row.id), links);
  if (genreIds.length) await db.insert(novelGenres).values(genreIds.map((genreId) => ({ novelId: row.id, genreId }))).onConflictDoNothing();
  return row;
}

export async function updateNovel(id: number, input: Partial<AdminNovelInput>) {
  const db = await getDb();
  const { genreIds, links, ...novelInput } = input;
  const resolvedCoverUrl = input.coverUrl === undefined ? undefined : await resolveCoverUrl(input.coverUrl);
  if (resolvedCoverUrl !== undefined) novelInput.coverUrl = resolvedCoverUrl ?? '';
  if (!db) {
    const normalizedInput = novelInput.slug ? { ...novelInput, slug: normalizeNovelSlug(novelInput.slug) } : novelInput;
    const rows = await supabaseWrite<any[]>('novels', 'PATCH', { ...normalizedInput, updatedAt: new Date().toISOString() }, `id=eq.${id}`);
    if (links) await replaceNovelLinks(id, links);
    if (genreIds) {
      await supabaseWrite('novelGenres', 'DELETE', undefined, `novelId=eq.${id}`);
      if (genreIds.length) await supabaseWrite('novelGenres', 'POST', genreIds.map((genreId) => ({ novelId: id, genreId })));
    }
    return rows[0] ?? null;
  }
  const normalizedInput = novelInput.slug ? { ...novelInput, slug: normalizeNovelSlug(novelInput.slug) } : novelInput;
  const [row] = await db.update(novels).set({ ...normalizedInput, updatedAt: new Date() }).where(eq(novels.id, id)).returning();
  if (!row) return null;
  if (links) await replaceNovelLinks(id, links);
  if (genreIds) {
    await db.delete(novelGenres).where(eq(novelGenres.novelId, id));
    if (genreIds.length) await db.insert(novelGenres).values(genreIds.map((genreId) => ({ novelId: id, genreId }))).onConflictDoNothing();
  }
  return row;
}

export async function deleteNovel(id: number) {
  const db = await getDb();
  if (!db) {
    await replaceNovelLinks(id);
    for (const [table, column] of [['novelGenres', 'novelId'], ['seriesBooks', 'novelId'], ['readingListItems', 'novelId'], ['ratings', 'novelId'], ['reviews', 'novelId']] as const) await supabaseWrite(table, 'DELETE', undefined, `${column}=eq.${id}`);
    await supabaseWrite('novels', 'DELETE', undefined, `id=eq.${id}`);
    return { success: true } as const;
  }
  await db.delete(novelGenres).where(eq(novelGenres.novelId, id));
  await db.delete(seriesBooks).where(eq(seriesBooks.novelId, id));
  await db.delete(readingListItems).where(eq(readingListItems.novelId, id));
  await db.delete(ratings).where(eq(ratings.novelId, id));
  await db.delete(reviews).where(eq(reviews.novelId, id));
  await db.delete(novels).where(eq(novels.id, id));
  return { success: true } as const;
}

export { authors, genres, novels, reviews, series };
