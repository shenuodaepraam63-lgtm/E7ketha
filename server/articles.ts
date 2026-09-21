import { ENV } from './_core/env';

export type ArticleStatus = 'draft' | 'published' | 'archived';

export type Article = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverUrl: string | null;
  status: ArticleStatus;
  authorName: string | null;
  authorUserId: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  tags: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ArticleInput = {
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  coverUrl?: string | null;
  status?: ArticleStatus;
  authorName?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  tags?: string | null;
  publishedAt?: string | null;
};

async function rest<T>(pathAndQuery: string, init?: RequestInit): Promise<T> {
  if (!ENV.supabaseUrl || !(ENV.supabaseSecretKey || ENV.supabasePublishableKey)) {
    throw new Error('Supabase is not configured');
  }
  const key = ENV.supabaseSecretKey || ENV.supabasePublishableKey!;
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${pathAndQuery}`, {
    ...init,
    signal: AbortSignal.timeout(15000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Articles API ${response.status}: ${await response.text()}`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : []) as T;
}

function mapRow(row: any): Article {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    title: String(row.title),
    excerpt: row.excerpt ?? null,
    content: String(row.content ?? ''),
    coverUrl: row.coverUrl ?? null,
    status: (row.status as ArticleStatus) || 'draft',
    authorName: row.authorName ?? null,
    authorUserId: row.authorUserId == null ? null : Number(row.authorUserId),
    seoTitle: row.seoTitle ?? null,
    seoDescription: row.seoDescription ?? null,
    tags: row.tags ?? null,
    publishedAt: row.publishedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9\-]/gi, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180) || `article-${Date.now()}`;
}

export async function listPublishedArticles(limit = 24, offset = 0) {
  const rows = await rest<any[]>(
    `articles?select=*&status=eq.published&order=publishedAt.desc.nullslast&order=createdAt.desc&limit=${Math.min(100, Math.max(1, limit))}&offset=${Math.max(0, offset)}`,
  );
  return rows.map(mapRow);
}

export async function getPublishedArticleBySlug(slug: string) {
  const rows = await rest<any[]>(
    `articles?select=*&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`,
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function listAdminArticles() {
  const rows = await rest<any[]>(`articles?select=*&order=updatedAt.desc&limit=200`);
  return rows.map(mapRow);
}

export async function getAdminArticle(id: number) {
  const rows = await rest<any[]>(`articles?select=*&id=eq.${id}&limit=1`);
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createArticle(input: ArticleInput, authorUserId?: number) {
  const status = input.status ?? 'draft';
  const payload = {
    slug: input.slug || slugify(input.title),
    title: input.title,
    excerpt: input.excerpt ?? null,
    content: input.content,
    coverUrl: input.coverUrl ?? null,
    status,
    authorName: input.authorName ?? null,
    authorUserId: authorUserId ?? null,
    seoTitle: input.seoTitle ?? null,
    seoDescription: input.seoDescription ?? null,
    tags: input.tags ?? null,
    publishedAt: status === 'published' ? input.publishedAt || new Date().toISOString() : input.publishedAt ?? null,
    updatedAt: new Date().toISOString(),
  };
  const rows = await rest<any[]>('articles', { method: 'POST', body: JSON.stringify(payload) });
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function updateArticle(id: number, input: Partial<ArticleInput>) {
  const existing = await getAdminArticle(id);
  if (!existing) throw new Error('المقال غير موجود');
  const status = input.status ?? existing.status;
  const payload: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (input.slug !== undefined) payload.slug = input.slug;
  if (input.title !== undefined) payload.title = input.title;
  if (input.excerpt !== undefined) payload.excerpt = input.excerpt;
  if (input.content !== undefined) payload.content = input.content;
  if (input.coverUrl !== undefined) payload.coverUrl = input.coverUrl;
  if (input.status !== undefined) payload.status = input.status;
  if (input.authorName !== undefined) payload.authorName = input.authorName;
  if (input.seoTitle !== undefined) payload.seoTitle = input.seoTitle;
  if (input.seoDescription !== undefined) payload.seoDescription = input.seoDescription;
  if (input.tags !== undefined) payload.tags = input.tags;
  if (status === 'published' && !existing.publishedAt) {
    payload.publishedAt = input.publishedAt || new Date().toISOString();
  } else if (input.publishedAt !== undefined) {
    payload.publishedAt = input.publishedAt;
  }
  const rows = await rest<any[]>(`articles?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  return rows[0] ? mapRow(rows[0]) : existing;
}

export async function deleteArticle(id: number) {
  await rest<any[]>(`articles?id=eq.${id}`, { method: 'DELETE' });
  return { ok: true as const };
}

export async function publishArticle(id: number) {
  return updateArticle(id, { status: 'published', publishedAt: new Date().toISOString() });
}

export async function unpublishArticle(id: number) {
  return updateArticle(id, { status: 'draft' });
}
