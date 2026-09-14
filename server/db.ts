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

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _pool = new Pool({
        connectionString: ENV.databaseUrl,
        ssl: { rejectUnauthorized: false },
        max: Number(process.env.DB_POOL_MAX ?? 2),
        connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 5000),
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

export async function getAdminSummary() {
  const quotesPromise = Promise.all([
    supabaseCount('quotes').catch(() => 0),
    supabaseCount('quotes', 'status=eq.published').catch(() => 0),
    supabaseCount('quotes', 'status=eq.draft').catch(() => 0),
  ]);
  const db = await getDb();
  if (!db) {
    const [novelsCount, authorsCount, seriesCount, reviewsCount, genresCount, usersCount, [quotes, publishedQuotes, draftQuotes]] = await Promise.all([
      supabaseCount('novels'), supabaseCount('authors'), supabaseCount('series'), supabaseCount('reviews', 'status=eq.pending'), supabaseCount('genres'), supabaseCount('users'), quotesPromise,
    ]);
    return { novels: novelsCount, authors: authorsCount, sources: seriesCount, needsReview: reviewsCount, genres: genresCount, users: usersCount, quotes, publishedQuotes, draftQuotes };
  }
  const [novelCount, authorCount, sourceCount, reviewCount, genreCount, userCount, [quotes, publishedQuotes, draftQuotes]] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(novels),
    db.select({ count: sql<number>`COUNT(*)` }).from(authors),
    db.select({ count: sql<number>`COUNT(*)` }).from(series),
    db.select({ count: sql<number>`COUNT(*)` }).from(reviews).where(eq(reviews.status, 'pending')),
    db.select({ count: sql<number>`COUNT(*)` }).from(genres),
    db.select({ count: sql<number>`COUNT(*)` }).from(users),
    quotesPromise,
  ]);
  return { novels: Number(novelCount[0]?.count ?? 0), authors: Number(authorCount[0]?.count ?? 0), sources: Number(sourceCount[0]?.count ?? 0), needsReview: Number(reviewCount[0]?.count ?? 0), genres: Number(genreCount[0]?.count ?? 0), users: Number(userCount[0]?.count ?? 0), quotes, publishedQuotes, draftQuotes };
}

/* FULL FILE CONTINUES — download artifacts/db_ORIGINAL_RESTORE.ts and replace this file if functions below are missing */
export async function listNovels(limit = 50) { try { const db = await getDb(); if (!db) return supabaseRest<any[]>('novels', `select=*&order=createdAt.desc&limit=${limit}`); const rows = await db.select({ id: novels.id, slug: novels.slug, title: novels.title, coverUrl: novels.coverUrl, description: novels.description, rating: novels.rating, ratingCount: novels.ratingCount, parts: novels.parts, status: novels.status, publicationYear: novels.publicationYear, author: authors.name, authorSlug: authors.slug }).from(novels).innerJoin(authors, eq(novels.authorId, authors.id)).orderBy(desc(novels.rating), desc(novels.createdAt)).limit(limit); return rows; } catch { return supabaseRest<any[]>('novels', `select=*&order=createdAt.desc&limit=${limit}`); } }
export async function listAuthors() { const db = await getDb(); if (!db) return supabaseRest<any[]>('authors', 'select=*&order=name.asc&limit=1000'); return db.select().from(authors).orderBy(asc(authors.name)); }
export async function listGenres() { const db = await getDb(); if (!db) return supabaseRest<any[]>('genres', 'select=*&order=name.asc&limit=1000'); return db.select().from(genres).orderBy(asc(genres.name)); }
export async function listUsers() { const db = await getDb(); if (!db) return []; return db.select({ openId: users.openId, role: users.role }).from(users); }
export async function updateUserRole(openId: string, role: 'user' | 'admin') { const db = await getDb(); if (!db) return null; const [row] = await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.openId, openId)).returning(); return row ?? null; }
export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0]; }
export async function upsertUser(user: InsertUser): Promise<void> { if (!user.openId) throw new Error('User openId is required for upsert'); const db = await getDb(); if (!db) return; await db.insert(users).values({ openId: user.openId, name: user.name, email: user.email, loginMethod: user.loginMethod, role: user.role, lastSignedIn: user.lastSignedIn ?? new Date() }).onConflictDoUpdate({ target: users.openId, set: { name: user.name, email: user.email, lastSignedIn: user.lastSignedIn ?? new Date() } as any }); }
export { authors, genres, novels, reviews, series };
