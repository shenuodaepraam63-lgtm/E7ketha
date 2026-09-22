import { Pool } from 'pg';
import { and, asc, desc, eq, gte, inArray, like, or, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
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
import { expandArabicQueryVariants, rankSearchRows } from './arabicSearch';

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  // Vercel + direct Postgres often waits the full connectionTimeout (~5s) then fails.
  // Prefer Supabase REST for reads unless FORCE_PG=1 (when pooler URL is confirmed).
  if (process.env.VERCEL && process.env.FORCE_PG !== '1') {
    return null;
  }
  if (!_db && ENV.databaseUrl) {
    try {
      _pool = new Pool({
        connectionString: ENV.databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: Number(process.env.DB_POOL_MAX ?? 2),
        connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 2500),
        idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 10000),
        maxUses: Number(process.env.DB_POOL_MAX_USES ?? 500),
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn('[Database] Failed to connect:', error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}

function requireDb() {
  return getDb().then((db) => {
    if (!db) throw new Error('Supabase database is not configured');
    return db;
  });
}

async function supabaseRest<T>(table: string, params: string) {
  if (!ENV.supabaseUrl || !ENV.supabasePublishableKey) throw new Error('Supabase REST is not configured');
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${table}?${params}`, { signal: AbortSignal.timeout(10000), headers: { apikey: ENV.supabaseSecretKey || ENV.supabasePublishableKey, Authorization: `Bearer ${ENV.supabaseSecretKey || ENV.supabasePublishableKey}` } });
  if (!response.ok) throw new Error(`Supabase REST ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function supabaseCount(table: string, filter = '') {
  if (!ENV.supabaseUrl || !ENV.supabasePublishableKey) throw new Error('Supabase REST is not configured');
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${table}?select=id${filter ? `&${filter}` : ''}`, {
    method: 'HEAD',
    headers: {
      apikey: ENV.supabaseSecretKey || ENV.supabasePublishableKey,
      Authorization: `Bearer ${ENV.supabaseSecretKey || ENV.supabasePublishableKey}`,
      Prefer: 'count=exact',
    },
  });
  if (!response.ok) throw new Error(`Supabase REST ${response.status}`);
  const range = response.headers.get('content-range') ?? '*/0';
  return Number(range.split('/')[1] || 0);
}

async function supabaseWrite<T>(table: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown, filter = '') {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) throw new Error('Supabase admin REST is not configured');
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${table}${filter ? `?${filter}` : ''}`, {
    method,
    headers: {
      apikey: ENV.supabaseSecretKey,
      Authorization: `Bearer ${ENV.supabaseSecretKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Supabase REST ${response.status}: ${await response.text()}`);
  const text = await response.text();
  return (text ? JSON.parse(text) : []) as T;
}

async function getNovelBySlugFromRest(slug: string) {
  const decoded = decodeURIComponent(slug).trim();
  if (/^\d+$/.test(decoded)) {
    const numericRows = await supabaseRest<any[]>('novels', `select=*&id=eq.${decoded}&limit=1`);
    if (numericRows[0]) {
      const row = numericRows[0];
      const authorsRows = await supabaseRest<any[]>('authors', `select=name,slug&id=eq.${row.authorId}&limit=1`);
      const author = authorsRows[0];
      return { id: row.id, slug: normalizeNovelSlug(row.slug, row.title), title: row.title, coverUrl: row.coverUrl, description: row.description, rightsNote: row.rightsNote, rating: row.rating, ratingCount: row.ratingCount, parts: row.parts, status: row.status, publicationYear: row.publicationYear, language: row.language, author: author?.name ?? 'مؤلف غير معروف', authorSlug: author?.slug ?? '', authorId: row.authorId, links: await listNovelLinks(Number(row.id)) };
    }
  }
  const candidates = Array.from(new Set([slug, decoded, normalizeNovelSlug(decoded)])).filter(Boolean);
  const rows = await supabaseRest<any[]>('novels', `select=id,slug,title,coverUrl,description,rightsNote,rating,ratingCount,parts,status,publicationYear,language,authorId&or=(${candidates.map((value) => `slug.eq.${encodeURIComponent(value)}`).join(',')})&limit=1`);
  const row = rows[0];
  if (!row) return null;
  const authorsRows = await supabaseRest<any[]>('authors', `select=name,slug&id=eq.${row.authorId}&limit=1`);
  const author = authorsRows[0];
  return { id: row.id, slug: normalizeNovelSlug(row.slug, row.title), title: row.title, coverUrl: row.coverUrl, description: row.description, rightsNote: row.rightsNote, rating: row.rating, ratingCount: row.ratingCount, parts: row.parts, status: row.status, publicationYear: row.publicationYear, language: row.language, author: author?.name ?? 'مؤلف غير معروف', authorSlug: author?.slug ?? '', authorId: row.authorId, links: await listNovelLinks(Number(row.id)) };
}

async function listNovelsFromRest(limit = 50) {
  const rows = await supabaseRest<any[]>('novels', `select=*&order=createdAt.desc&limit=${Math.min(Math.max(limit, 1), 100)}`);
  const authorIds = Array.from(new Set(rows.map((row) => row.authorId).filter(Boolean)));
  const authorsRows = authorIds.length ? await supabaseRest<any[]>('authors', `select=id,name,slug&id=in.(${authorIds.join(',')})`) : [];
  const authorsMap = new Map(authorsRows.map((author) => [String(author.id), author]));
  return rows.map((row) => ({ id: row.id, slug: normalizeNovelSlug(row.slug, row.title), title: row.title, coverUrl: row.coverUrl, description: row.description, rightsNote: row.rightsNote, rating: row.rating, ratingCount: row.ratingCount, parts: row.parts, status: row.status, publicationYear: row.publicationYear, author: authorsMap.get(String(row.authorId))?.name ?? 'مؤلف غير معروف', authorSlug: authorsMap.get(String(row.authorId))?.slug ?? '' }));
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error('User openId is required for upsert');
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ['name', 'email', 'loginMethod'] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet as any });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ openId: users.openId, role: users.role }).from(users);
}

export async function updateUserRole(openId: string, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.openId, openId)).returning();
  return row ?? null;
}

export async function listNovels(limit = 50) {
  const db = await getDb();
  if (!db) return listNovelsFromRest(limit);
  try {
  const rows = await db.select({
    id: novels.id,
    slug: novels.slug,
    title: novels.title,
    coverUrl: novels.coverUrl,
    description: novels.description,
    rating: novels.rating,
    ratingCount: novels.ratingCount,
    parts: novels.parts,
    status: novels.status,
    publicationYear: novels.publicationYear,
    author: authors.name,
    authorSlug: authors.slug,
  }).from(novels).innerJoin(authors, eq(novels.authorId, authors.id)).orderBy(desc(novels.rating), desc(novels.createdAt)).limit(limit);
  return rows.map((row) => ({ ...row, slug: normalizeNovelSlug(row.slug, row.title) }));
  } catch (error) {
    console.warn('[Database] Falling back to Supabase REST for novels list:', error instanceof Error ? error.message : error);
    return listNovelsFromRest(limit);
  }
}

export type NovelSearchFilters = {
  q?: string;
  genreSlug?: string;
  authorSlug?: string;
  status?: 'standalone' | 'completed' | 'ongoing';
  minRating?: number;
  sort?: 'popular' | 'rating' | 'newest' | 'title';
  limit?: number;
};

export async function searchNovels(filters: NovelSearchFilters = {}) {
  const db = await getDb();
  if (!db) {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
    const query = filters.q?.trim();
    const params = new URLSearchParams({ select: '*', limit: String(limit) });
    if (filters.status) params.set('status', `eq.${filters.status}`);
    if (filters.minRating) params.set('rating', `gte.${Math.round(filters.minRating * 100)}`);
    if (query) {
      const variants = expandArabicQueryVariants(query);
      const parts = variants.flatMap((v) => {
        const safe = v.replace(/[(),*]/g, ' ').trim();
        if (!safe) return [];
        return [`title.ilike.*${safe}*`, `description.ilike.*${safe}*`, `slug.ilike.*${safe}*`];
      });
      // also match authors
      let authorIds: number[] = [];
      try {
        const ap = variants.flatMap((v) => {
          const safe = v.replace(/[(),*]/g, ' ').trim();
          return safe ? [`name.ilike.*${safe}*`, `slug.ilike.*${safe}*`] : [];
        });
        if (ap.length) {
          const authors = await supabaseRest<any[]>('authors', `select=id&or=(${ap.join(',')})&limit=40`);
          authorIds = (authors ?? []).map((a) => Number(a.id)).filter(Boolean);
        }
      } catch {}
      if (parts.length) params.set('or', `(${parts.join(',')})`);
      if (authorIds.length) {
        // fetch by author separately and merge below
      }
    }
    let rows = await supabaseRest<any[]>('novels', params.toString());
    if (query) {
      const variants = expandArabicQueryVariants(query);
      let authorIds: number[] = [];
      try {
        const ap = variants.flatMap((v) => {
          const safe = v.replace(/[(),*]/g, ' ').trim();
          return safe ? [`name.ilike.*${safe}*`, `slug.ilike.*${safe}*`] : [];
        });
        if (ap.length) {
          const authors = await supabaseRest<any[]>('authors', `select=id&or=(${ap.join(',')})&limit=40`);
          authorIds = (authors ?? []).map((a) => Number(a.id)).filter(Boolean);
        }
      } catch {}
      if (authorIds.length) {
        try {
          const byAuth = await supabaseRest<any[]>('novels', `select=*&authorId=in.(${authorIds.join(',')})&limit=100&order=ratingCount.desc`);
          const seen = new Set(rows.map((r) => String(r.id)));
          for (const r of byAuth ?? []) if (!seen.has(String(r.id))) rows.push(r);
        } catch {}
      }
      // enrich authors
      const ids = Array.from(new Set(rows.map((r) => r.authorId).filter(Boolean)));
      const authorsRows = ids.length ? await supabaseRest<any[]>('authors', `select=id,name,slug&id=in.(${ids.join(',')})`) : [];
      const amap = new Map(authorsRows.map((a) => [String(a.id), a]));
      rows = rows.map((row) => ({
        ...row,
        slug: normalizeNovelSlug(row.slug, row.title),
        author: amap.get(String(row.authorId))?.name ?? '',
        authorSlug: amap.get(String(row.authorId))?.slug ?? '',
      }));
      return rankSearchRows(rows, query).slice(0, limit);
    }
    return rows.map((row) => ({ ...row, slug: normalizeNovelSlug(row.slug, row.title), author: '', authorSlug: '' }));
  }
  const conditions = [];
  const query = filters.q?.trim();
  if (query) {
    const variants = expandArabicQueryVariants(query);
    const likes = variants.flatMap((v) => [
      like(novels.title, `%${v}%`),
      like(authors.name, `%${v}%`),
      like(novels.description, `%${v}%`),
    ]);
    if (likes.length) conditions.push(or(...likes));
  }
  if (filters.authorSlug) conditions.push(eq(authors.slug, filters.authorSlug));
  if (filters.status) conditions.push(eq(novels.status, filters.status));
  if (filters.minRating) conditions.push(gte(novels.rating, Math.round(filters.minRating * 100)));

  const selection = {
    id: novels.id,
    slug: novels.slug,
    title: novels.title,
    coverUrl: novels.coverUrl,
    description: novels.description,
    rating: novels.rating,
    ratingCount: novels.ratingCount,
    parts: novels.parts,
    status: novels.status,
    publicationYear: novels.publicationYear,
    author: authors.name,
    authorSlug: authors.slug,
  };
  const order = filters.sort === 'rating'
    ? desc(novels.rating)
    : filters.sort === 'newest'
      ? desc(novels.publicationYear)
      : filters.sort === 'title'
        ? asc(novels.title)
        : desc(novels.ratingCount);
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);

  if (filters.genreSlug) {
    conditions.push(eq(genres.slug, filters.genreSlug));
    return db.select(selection).from(novels)
      .innerJoin(authors, eq(novels.authorId, authors.id))
      .innerJoin(novelGenres, eq(novelGenres.novelId, novels.id))
      .innerJoin(genres, eq(novelGenres.genreId, genres.id))
      .where(and(...conditions))
      .orderBy(order)
      .limit(limit);
  }

  return db.select(selection).from(novels)
    .innerJoin(authors, eq(novels.authorId, authors.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(order)
    .limit(limit);
}

export async function getSearchFacets() {
  const db = await getDb();
  if (!db) {
    const [genreRows, authorRows] = await Promise.all([
      supabaseRest<any[]>('genres', 'select=slug,name&order=name.asc&limit=1000'),
      supabaseRest<any[]>('authors', 'select=slug,name&order=name.asc&limit=1000'),
    ]);
    return { genres: genreRows, authors: authorRows };
  }
  const [genreRows, authorRows] = await Promise.all([
    db.select({ slug: genres.slug, name: genres.name }).from(genres).orderBy(asc(genres.name)),
    db.select({ slug: authors.slug, name: authors.name }).from(authors).orderBy(asc(authors.name)),
  ]);
  return { genres: genreRows, authors: authorRows };
}

export async function listAuthors() {
  const db = await getDb();
  if (!db) return supabaseRest<any[]>('authors', 'select=*&order=name.asc&limit=1000');
  try {
    return await db.select().from(authors).orderBy(asc(authors.name));
  } catch (error) {
    console.warn('[Database] Falling back to Supabase REST for authors:', error instanceof Error ? error.message : error);
    return supabaseRest<any[]>('authors', 'select=*&order=name.asc&limit=1000');
  }
}

export async function getAuthorBySlug(slug: string) {
  try {
    const db = await requireDb();
    const result = await db.select().from(authors).where(eq(authors.slug, slug)).limit(1);
    return result[0] ?? null;
  } catch (error) {
    console.warn('[Database] Falling back to Supabase REST for author lookup:', error instanceof Error ? error.message : error);
    return (await listAuthors()).find((author) => author.slug === decodeURIComponent(slug).trim()) ?? null;
  }
}

export async function listGenres() {
  const db = await getDb();
  if (!db) return supabaseRest<any[]>('genres', 'select=*&order=name.asc&limit=1000');
  return db.select({ id: genres.id, slug: genres.slug, name: genres.name, description: genres.description, icon: genres.icon, novelCount: sql<number>`COUNT(DISTINCT ${novelGenres.novelId})` }).from(genres).leftJoin(novelGenres, eq(novelGenres.genreId, genres.id)).groupBy(genres.id).orderBy(asc(genres.name));
}

export async function getGenreBySlug(slug: string) {
  try {
    const db = await requireDb();
    const result = await db.select({ id: genres.id, slug: genres.slug, name: genres.name, description: genres.description, icon: genres.icon, novelCount: sql<number>`COUNT(DISTINCT ${novelGenres.novelId})` }).from(genres).leftJoin(novelGenres, eq(novelGenres.genreId, genres.id)).where(eq(genres.slug, slug)).groupBy(genres.id).limit(1);
    return result[0] ?? null;
  } catch (error) {
    console.warn('[Database] Falling back to Supabase REST for genre lookup:', error instanceof Error ? error.message : error);
    return (await listGenres()).find((genre) => genre.slug === decodeURIComponent(slug).trim()) ?? null;
  }
}

export async function listSeries() {
  const db = await getDb();
  if (!db) return supabaseRest<any[]>('series', 'select=*&order=title.asc&limit=1000');
  return db.select({ id: series.id, slug: series.slug, title: series.title, description: series.description, status: series.status, parts: sql<number>`COUNT(DISTINCT ${seriesBooks.novelId})`, coverUrl: sql<string | null>`MIN(${novels.coverUrl})` }).from(series).leftJoin(seriesBooks, eq(seriesBooks.seriesId, series.id)).leftJoin(novels, eq(seriesBooks.novelId, novels.id)).groupBy(series.id).orderBy(asc(series.title));
}

export async function getSeriesBySlug(slug: string) {
  try {
    const db = await requireDb();
    const rows = await db.select({ id: series.id, slug: series.slug, title: series.title, description: series.description, status: series.status, order: seriesBooks.order, bookTitle: novels.title, bookSlug: novels.slug, coverUrl: novels.coverUrl, author: authors.name }).from(series).leftJoin(seriesBooks, eq(seriesBooks.seriesId, series.id)).leftJoin(novels, eq(seriesBooks.novelId, novels.id)).leftJoin(authors, eq(novels.authorId, authors.id)).where(eq(series.slug, slug)).orderBy(asc(seriesBooks.order));
    if (!rows.length) return null;
    const first = rows[0];
    return { ...first, books: rows.filter((row) => row.bookSlug).map((row) => ({ title: row.bookTitle!, slug: row.bookSlug!, coverUrl: row.coverUrl, author: row.author })) };
  } catch (error) {
    console.warn('[Database] Falling back to Supabase REST for series lookup:', error instanceof Error ? error.message : error);
    const item = (await listSeries()).find((entry) => entry.slug === decodeURIComponent(slug).trim());
    return item ? { ...item, books: [] } : null;
  }
}

export async function getNovelBySlug(slug: string) {
  const decodedSlug = decodeURIComponent(slug).trim();
  const normalizedSlug = normalizeNovelSlug(decodedSlug);
  try {
  const db = await requireDb();
  const numericMatch = /^\d+$/.test(decodedSlug) ? sql`n.id = ${Number(decodedSlug)}` : sql`FALSE`;
  const result = await db.execute(sql`
    SELECT
      n.id, n.slug, n.title, n."coverUrl", n.description, n."rightsNote",
      n.rating, n."ratingCount", n.parts, n.status, n."publicationYear", n.language,
      a.name AS author, a.slug AS "authorSlug", a.id AS "authorId",
      COALESCE(
        json_agg(
          json_build_object('id', l.id, 'label', l.label, 'url', l.url, 'type', l.type, 'displayOrder', l."displayOrder")
          ORDER BY l."displayOrder" ASC
        ) FILTER (WHERE l.id IS NOT NULL),
        '[]'::json
      ) AS links
    FROM public."novels" n
    INNER JOIN public."authors" a ON a.id = n."authorId"
    LEFT JOIN public."novelLinks" l ON l."novelId" = n.id
    WHERE (${numericMatch} OR n.slug = ${slug} OR n.slug = ${decodedSlug} OR n.slug = ${normalizedSlug})
    GROUP BY n.id, a.id
    LIMIT 1
  `);
  const row = result.rows[0] as any;
  if (row) return { ...row, slug: normalizeNovelSlug(row.slug, row.title), links: row.links ?? [] };
  return getNovelBySlugFromRest(slug);
  } catch (error) {
    console.warn('[Database] Falling back to Supabase REST for novel lookup:', error instanceof Error ? error.message : error);
    return getNovelBySlugFromRest(slug);
  }
}

export async function getReadingList(userId: number) {
  const db = await requireDb();
  return db.select({
    id: readingListItems.id,
    status: readingListItems.status,
    createdAt: readingListItems.createdAt,
    updatedAt: readingListItems.updatedAt,
    novelId: novels.id,
    slug: novels.slug,
    title: novels.title,
    coverUrl: novels.coverUrl,
    description: novels.description,
    rating: novels.rating,
    parts: novels.parts,
    novelStatus: novels.status,
    author: authors.name,
    authorSlug: authors.slug,
  }).from(readingListItems).innerJoin(novels, eq(readingListItems.novelId, novels.id)).innerJoin(authors, eq(novels.authorId, authors.id)).where(eq(readingListItems.userId, userId)).orderBy(desc(readingListItems.updatedAt));
}

export async function addToReadingList(userId: number, novelId: number, status: 'want_to_read' | 'reading' | 'finished' = 'want_to_read') {
  const db = await requireDb();
  await db.insert(readingListItems).values({ userId, novelId, status }).onConflictDoUpdate({
    target: [readingListItems.userId, readingListItems.novelId],
    set: { status, updatedAt: new Date() },
  });
  return { success: true } as const;
}

export async function removeFromReadingList(userId: number, novelId: number) {
  const db = await requireDb();
  await db.delete(readingListItems).where(and(eq(readingListItems.userId, userId), eq(readingListItems.novelId, novelId)));
  return { success: true } as const;
}

export async function updateReadingStatus(userId: number, novelId: number, status: 'want_to_read' | 'reading' | 'finished') {
  const db = await requireDb();
  await db.update(readingListItems).set({ status, updatedAt: new Date() }).where(and(eq(readingListItems.userId, userId), eq(readingListItems.novelId, novelId)));
  return { success: true } as const;
}

export async function setRating(userId: number, novelId: number, rating: number) {
  const db = await requireDb();
  await db.insert(ratings).values({ userId, novelId, rating }).onConflictDoUpdate({
    target: [ratings.userId, ratings.novelId],
    set: { rating, updatedAt: new Date() },
  });
  const aggregate = await db.select({ average: sql<number>`COALESCE(AVG(${ratings.rating}), 0)`, count: sql<number>`COUNT(${ratings.id})` }).from(ratings).where(eq(ratings.novelId, novelId));
  await db.update(novels).set({ rating: Math.round(Number(aggregate[0]?.average ?? 0) * 100), ratingCount: Number(aggregate[0]?.count ?? 0), updatedAt: new Date() }).where(eq(novels.id, novelId));
  return { success: true, rating } as const;
}

export async function getMyRating(userId: number, novelId: number) {
  const db = await requireDb();
  const result = await db.select({ rating: ratings.rating }).from(ratings).where(and(eq(ratings.userId, userId), eq(ratings.novelId, novelId))).limit(1);
  return result[0]?.rating ?? null;
}

export async function getAdminSummary() {
  const db = await getDb();
  if (!db) {
    const [novelsCount, authorsCount, seriesCount, reviewsCount] = await Promise.all([
      supabaseCount('novels'), supabaseCount('authors'), supabaseCount('series'), supabaseCount('reviews', 'status=eq.pending'),
    ]);
    return { novels: novelsCount, authors: authorsCount, sources: seriesCount, needsReview: reviewsCount };
  }
  const [novelCount, authorCount, sourceCount, reviewCount] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(novels),
    db.select({ count: sql<number>`COUNT(*)` }).from(authors),
    db.select({ count: sql<number>`COUNT(*)` }).from(series),
    db.select({ count: sql<number>`COUNT(*)` }).from(reviews).where(eq(reviews.status, 'pending')),
  ]);
  return { novels: Number(novelCount[0]?.count ?? 0), authors: Number(authorCount[0]?.count ?? 0), sources: Number(sourceCount[0]?.count ?? 0), needsReview: Number(reviewCount[0]?.count ?? 0) };
}

export async function listAdminNovels() {
  const db = await getDb();
  if (!db) {
    const rows = await supabaseRest<any[]>('novels', 'select=id,slug,title,authorId,coverUrl,description,rightsNote,rating,ratingCount,parts,status,publicationYear,language,updatedAt&order=updatedAt.desc&limit=100');
    const linksByNovel = await listNovelLinksBatch(rows.map((row) => Number(row.id)));
    return rows.map((row) => ({ ...row, links: linksByNovel.get(Number(row.id)) ?? [] }));
  }
  const rows = await db.select({ id: novels.id, slug: novels.slug, title: novels.title, authorId: authors.id, author: authors.name, coverUrl: novels.coverUrl, description: novels.description, rightsNote: novels.rightsNote, rating: novels.rating, ratingCount: novels.ratingCount, parts: novels.parts, status: novels.status, publicationYear: novels.publicationYear, language: novels.language, updatedAt: novels.updatedAt }).from(novels).innerJoin(authors, eq(novels.authorId, authors.id)).orderBy(desc(novels.updatedAt)).limit(100);
  const linksByNovel = await listNovelLinksBatch(rows.map((row) => Number(row.id)));
  return rows.map((row) => ({ ...row, links: linksByNovel.get(Number(row.id)) ?? [] }));
}

export async function listAdminAuthors() {
  const db = await getDb();
  if (!db) return supabaseRest<any[]>('authors', 'select=*&order=name.asc&limit=1000');
  return db.select().from(authors).orderBy(asc(authors.name));
}

export async function listAdminGenres() {
  const db = await getDb();
  if (!db) return supabaseRest<any[]>('genres', 'select=*&order=name.asc&limit=1000');
  return db.select({ id: genres.id, slug: genres.slug, name: genres.name, description: genres.description, icon: genres.icon, createdAt: genres.createdAt, novelCount: sql<number>`COUNT(DISTINCT ${novelGenres.novelId})` }).from(genres).leftJoin(novelGenres, eq(novelGenres.genreId, genres.id)).groupBy(genres.id).orderBy(asc(genres.name));
}

export async function createAuthor(input: { slug: string; name: string; bio?: string; avatarUrl?: string; bookCount?: number }) {
  const db = await getDb();
  if (!db) return (await supabaseWrite<any[]>('authors', 'POST', { ...input, bio: input.bio || null, avatarUrl: input.avatarUrl || null, bookCount: input.bookCount ?? 0 }))[0];
  const [row] = await db.insert(authors).values({ ...input, bio: input.bio || null, avatarUrl: input.avatarUrl || null, bookCount: input.bookCount ?? 0 }).returning();
  return row;
}

export async function updateAuthor(id: number, input: Partial<{ slug: string; name: string; bio: string | null; avatarUrl: string | null; bookCount: number }>) {
  const db = await getDb();
  if (!db) return (await supabaseWrite<any[]>('authors', 'PATCH', { ...input, updatedAt: new Date().toISOString() }, `id=eq.${id}`))[0] ?? null;
  const [row] = await db.update(authors).set({ ...input, updatedAt: new Date() }).where(eq(authors.id, id)).returning();
  return row ?? null;
}

export async function deleteAuthor(id: number) {
  const db = await getDb();
  if (!db) {
    const linked = await supabaseRest<any[]>('novels', `select=id&authorId=eq.${id}&limit=1`);
    if (linked.length) throw new Error('لا يمكن حذف مؤلف مرتبط بروايات. انقل الروايات إلى مؤلف آخر أولًا.');
    await supabaseWrite('authors', 'DELETE', undefined, `id=eq.${id}`);
    return { success: true } as const;
  }
  const linked = await db.select({ id: novels.id }).from(novels).where(eq(novels.authorId, id)).limit(1);
  if (linked.length) throw new Error('لا يمكن حذف مؤلف مرتبط بروايات. انقل الروايات إلى مؤلف آخر أولًا.');
  await db.delete(authors).where(eq(authors.id, id));
  return { success: true } as const;
}

export async function createGenre(input: { slug: string; name: string; description?: string; icon?: string }) {
  const db = await getDb();
  if (!db) return (await supabaseWrite<any[]>('genres', 'POST', { ...input, description: input.description || null, icon: input.icon || '✦' }))[0];
  const [row] = await db.insert(genres).values({ ...input, description: input.description || null, icon: input.icon || '✦' }).returning();
  return row;
}

export async function updateGenre(id: number, input: Partial<{ slug: string; name: string; description: string | null; icon: string | null }>) {
  const db = await getDb();
  if (!db) return (await supabaseWrite<any[]>('genres', 'PATCH', input, `id=eq.${id}`))[0] ?? null;
  const [row] = await db.update(genres).set(input).where(eq(genres.id, id)).returning();
  return row ?? null;
}

export async function deleteGenre(id: number) {
  const db = await getDb();
  if (!db) {
    await supabaseWrite('novelGenres', 'DELETE', undefined, `genreId=eq.${id}`);
    await supabaseWrite('genres', 'DELETE', undefined, `id=eq.${id}`);
    return { success: true } as const;
  }
  await db.delete(novelGenres).where(eq(novelGenres.genreId, id));
  await db.delete(genres).where(eq(genres.id, id));
  return { success: true } as const;
}

export type NovelLinkInput = { label: string; url: string; type: 'read' | 'download' };
export type AdminNovelInput = { slug: string; title: string; authorId: number; coverUrl?: string; description?: string; rightsNote?: string; parts?: number; status?: 'standalone' | 'completed' | 'ongoing'; publicationYear?: number; language?: string; genreIds?: number[]; links?: NovelLinkInput[] };
async function listNovelLinks(novelId: number) { try { return await supabaseRest<any[]>('novelLinks', `select=id,label,url,type,displayOrder&novelId=eq.${novelId}&order=displayOrder.asc&limit=50`); } catch { return []; } }
async function listNovelLinksBatch(novelIds: number[]) {
  if (!novelIds.length) return new Map<number, any[]>();
  try {
    const rows = await supabaseRest<any[]>('novelLinks', `select=id,novelId,label,url,type,displayOrder&novelId=in.(${novelIds.join(',')})&order=displayOrder.asc&limit=2000`);
    const grouped = new Map<number, any[]>();
    for (const row of rows) { const id = Number(row.novelId); const list = grouped.get(id) ?? []; list.push(row); grouped.set(id, list); }
    return grouped;
  } catch { return new Map<number, any[]>(); }
}
async function replaceNovelLinks(novelId: number, links: NovelLinkInput[] = []) { await supabaseWrite('novelLinks', 'DELETE', undefined, `novelId=eq.${novelId}`); if (links.length) await supabaseWrite('novelLinks', 'POST', links.map((link, index) => ({ novelId, label: link.label, url: link.url, type: link.type, displayOrder: index }))); }

function normalizeNovelSlug(value: string, fallbackTitle?: string): string {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes('/')) return normalizeNovelSlug(fallbackTitle || 'novel');
  return trimmed.replace(/^\/+|\/+$/g, '').replace(/\s+/g, '-').replace(/[?#%]/g, '').slice(0, 160) || normalizeNovelSlug(fallbackTitle || 'novel');
}

export async function resolveCoverUrl(value?: string | null) {
  const url = value?.trim();
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    const archiveMatch = parsedUrl.hostname.endsWith('archive.org') ? parsedUrl.pathname.match(/^\/details\/([^/]+)/) : null;
    if (archiveMatch?.[1]) {
      const metadataResponse = await fetch(`https://archive.org/metadata/${encodeURIComponent(archiveMatch[1])}`, { signal: AbortSignal.timeout(7000) });
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json() as { files?: Array<{ name?: string; format?: string }> };
        const imageFiles = (metadata.files ?? []).filter((file) => {
          const name = (file.name ?? '').toLowerCase();
          const format = (file.format ?? '').toLowerCase();
          return /\.(jpe?g|png|webp|gif|avif)$/i.test(name) || /image\/(jpeg|png|webp|gif|avif)/i.test(format);
        });
        const selected = imageFiles.find((file) => /cover|front|title/i.test(file.name ?? '')) ?? imageFiles[0];
        if (selected?.name) return `https://archive.org/download/${encodeURIComponent(archiveMatch[1])}/${selected.name.split('/').map(encodeURIComponent).join('/')}`;
      }
    }
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(7000), headers: { Accept: 'image/*, text/html;q=0.9' } });
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.startsWith('image/')) return response.url || url;
    if (contentType.includes('text/html')) {
      const html = await response.text();
      const match = html.match(/<meta[^>]+(?:property|name)=[\"'](?:og:image|twitter:image)[\"'][^>]+content=[\"']([^\"']+)[\"']/i) ?? html.match(/<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+(?:property|name)=[\"'](?:og:image|twitter:image)[\"']/i);
      if (match?.[1]) return new URL(match[1], response.url || url).toString();
      const imageSource = html.match(/<img[^>]+(?:src|data-src)=[\"']([^\"']+)[\"']/i)?.[1];
      if (imageSource) return new URL(imageSource, response.url || url).toString();
    }
  } catch { /* نحتفظ بالرابط الأصلي إذا كان الموقع يمنع الفحص */ }
  return url;
}

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
  const { genreIds, links, ...novelInput } = input
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
