import { and, desc, eq, sql } from 'drizzle-orm';
import { novels, ratings, reviews, users } from '../drizzle/schema';
import { ENV } from './_core/env';
import { getDb, getNovelBySlug } from './db';

async function rest<T>(table: string, params: string, init?: RequestInit): Promise<T> {
  if (!ENV.supabaseUrl || !(ENV.supabaseSecretKey || ENV.supabasePublishableKey)) {
    throw new Error('Supabase is not configured');
  }
  const key = ENV.supabaseSecretKey || ENV.supabasePublishableKey;
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${table}?${params}`, {
    ...init,
    signal: AbortSignal.timeout(10000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Reviews API ${response.status}: ${await response.text()}`);
  const text = await response.text();
  return (text ? JSON.parse(text) : []) as T;
}

export type PublicReview = {
  id: number;
  body: string;
  rating: number | null;
  status: string;
  createdAt: string;
  userName: string | null;
};

/** Published reviews for a novel (public). */
export async function listNovelReviews(slug: string, limit = 30): Promise<PublicReview[]> {
  const novel = await getNovelBySlug(slug);
  if (!novel) return [];
  const db = await getDb();
  if (db) {
    try {
      const rows = await db
        .select({
          id: reviews.id,
          body: reviews.body,
          rating: reviews.rating,
          status: reviews.status,
          createdAt: reviews.createdAt,
          userName: users.name,
        })
        .from(reviews)
        .leftJoin(users, eq(reviews.userId, users.id))
        .where(and(eq(reviews.novelId, novel.id), eq(reviews.status, 'published')))
        .orderBy(desc(reviews.createdAt))
        .limit(Math.min(100, Math.max(1, limit)));
      return rows.map((row) => ({
        id: row.id,
        body: row.body,
        rating: row.rating,
        status: row.status,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
        userName: row.userName,
      }));
    } catch (error) {
      console.warn('[reviews] drizzle list failed, REST fallback', error);
    }
  }
  const rows = await rest<any[]>(
    'reviews',
    `select=id,body,rating,status,createdAt,userId&novelId=eq.${novel.id}&status=eq.published&order=createdAt.desc&limit=${Math.min(100, Math.max(1, limit))}`,
  );
  const userIds = Array.from(new Set(rows.map((r) => r.userId).filter(Boolean)));
  let nameMap = new Map<number, string | null>();
  if (userIds.length) {
    try {
      const userRows = await rest<any[]>('users', `select=id,name&id=in.(${userIds.join(',')})`);
      nameMap = new Map(userRows.map((u) => [Number(u.id), u.name ?? null]));
    } catch {
      /* ignore */
    }
  }
  return rows.map((row) => ({
    id: Number(row.id),
    body: row.body,
    rating: row.rating == null ? null : Number(row.rating),
    status: row.status,
    createdAt: row.createdAt,
    userName: nameMap.get(Number(row.userId)) ?? null,
  }));
}

export async function getMyReview(userId: number, slug: string) {
  const novel = await getNovelBySlug(slug);
  if (!novel) return null;
  const db = await getDb();
  if (db) {
    const rows = await db
      .select({
        id: reviews.id,
        body: reviews.body,
        rating: reviews.rating,
        status: reviews.status,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.novelId, novel.id)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      body: row.body,
      rating: row.rating,
      status: row.status,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
    };
  }
  const rows = await rest<any[]>(
    'reviews',
    `select=id,body,rating,status,createdAt&userId=eq.${userId}&novelId=eq.${novel.id}&limit=1`,
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    body: row.body,
    rating: row.rating == null ? null : Number(row.rating),
    status: row.status,
    createdAt: row.createdAt,
  };
}

/** Create or update the user's review; also syncs star rating aggregate. */
export async function upsertReview(userId: number, slug: string, input: { body: string; rating?: number }) {
  const body = input.body.trim();
  if (body.length < 20) throw new Error('الرأي يجب أن يكون 20 حرفًا على الأقل.');
  if (body.length > 4000) throw new Error('الرأي طويل جدًا (الحد 4000 حرف).');
  const rating = input.rating == null ? null : Math.min(5, Math.max(1, Math.round(input.rating)));
  const novel = await getNovelBySlug(slug);
  if (!novel) throw new Error('الرواية غير موجودة');

  const db = await getDb();
  if (db) {
    const existing = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.novelId, novel.id)))
      .limit(1);
    let row;
    if (existing[0]) {
      [row] = await db
        .update(reviews)
        .set({ body, rating, status: 'published', updatedAt: new Date() })
        .where(eq(reviews.id, existing[0].id))
        .returning();
    } else {
      [row] = await db
        .insert(reviews)
        .values({ userId, novelId: novel.id, body, rating, status: 'published' })
        .returning();
    }
    if (rating != null) {
      await db
        .insert(ratings)
        .values({ userId, novelId: novel.id, rating })
        .onConflictDoUpdate({
          target: [ratings.userId, ratings.novelId],
          set: { rating, updatedAt: new Date() },
        });
      const aggregate = await db
        .select({
          average: sql<number>`COALESCE(AVG(${ratings.rating}), 0)`,
          count: sql<number>`COUNT(${ratings.id})`,
        })
        .from(ratings)
        .where(eq(ratings.novelId, novel.id));
      await db
        .update(novels)
        .set({
          rating: Math.round(Number(aggregate[0]?.average ?? 0) * 100),
          ratingCount: Number(aggregate[0]?.count ?? 0),
          updatedAt: new Date(),
        })
        .where(eq(novels.id, novel.id));
    }
    return row;
  }

  const existing = await rest<any[]>(
    'reviews',
    `select=id&userId=eq.${userId}&novelId=eq.${novel.id}&limit=1`,
  );
  const payload = {
    userId,
    novelId: novel.id,
    body,
    rating,
    status: 'published',
    updatedAt: new Date().toISOString(),
  };
  let row;
  if (existing[0]) {
    const updated = await rest<any[]>(`reviews`, `id=eq.${existing[0].id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    row = updated[0];
  } else {
    const created = await rest<any[]>('reviews', '', {
      method: 'POST',
      body: JSON.stringify({ ...payload, createdAt: new Date().toISOString() }),
    });
    row = created[0];
  }
  if (rating != null) {
    try {
      await rest<any[]>('ratings', 'on_conflict=userId,novelId', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({
          userId,
          novelId: novel.id,
          rating,
          updatedAt: new Date().toISOString(),
        }),
      });
    } catch {
      /* aggregate may lag */
    }
  }
  return row;
}

export async function listPendingReviews(limit = 50) {
  const db = await getDb();
  if (db) {
    return db
      .select({
        id: reviews.id,
        body: reviews.body,
        rating: reviews.rating,
        status: reviews.status,
        createdAt: reviews.createdAt,
        novelId: reviews.novelId,
        userId: reviews.userId,
        userName: users.name,
        novelTitle: novels.title,
        novelSlug: novels.slug,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .leftJoin(novels, eq(reviews.novelId, novels.id))
      .where(eq(reviews.status, 'pending'))
      .orderBy(desc(reviews.createdAt))
      .limit(limit);
  }
  return rest<any[]>(
    'reviews',
    `select=*&status=eq.pending&order=createdAt.desc&limit=${limit}`,
  );
}

export async function moderateReview(id: number, status: 'published' | 'pending' | 'hidden') {
  const db = await getDb();
  if (db) {
    const [row] = await db
      .update(reviews)
      .set({ status, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return row ?? null;
  }
  const rows = await rest<any[]>(`reviews`, `id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, updatedAt: new Date().toISOString() }),
  });
  return rows[0] ?? null;
}
