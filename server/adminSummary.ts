import { getAdminSummary, listAdminGenres, listUsers } from './db';
import { ENV } from './_core/env';

async function restCount(table: string, filter = ''): Promise<number> {
  if (!ENV.supabaseUrl || !(ENV.supabaseSecretKey || ENV.supabasePublishableKey)) return 0;
  try {
    const key = ENV.supabaseSecretKey || ENV.supabasePublishableKey;
    const response = await fetch(
      `${ENV.supabaseUrl}/rest/v1/${table}?select=id${filter ? `&${filter}` : ''}`,
      {
        method: 'HEAD',
        headers: {
          apikey: key!,
          Authorization: `Bearer ${key}`,
          Prefer: 'count=exact',
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) return 0;
    const range = response.headers.get('content-range') ?? '*/0';
    return Number(range.split('/')[1] || 0);
  } catch {
    return 0;
  }
}

async function restRows<T>(path: string): Promise<T[]> {
  if (!ENV.supabaseUrl || !(ENV.supabaseSecretKey || ENV.supabasePublishableKey)) return [];
  try {
    const key = ENV.supabaseSecretKey || ENV.supabasePublishableKey;
    const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    return (await response.json()) as T[];
  } catch {
    return [];
  }
}

/** Extended admin overview metrics — real DB/REST counts only. */
export async function getEnhancedAdminSummary() {
  const base = await getAdminSummary();

  const [genresRows, usersRows, quotes, publishedQuotes, draftQuotes, articles, recentNovels, recentArticles] =
    await Promise.all([
      listAdminGenres().catch(() => [] as unknown[]),
      listUsers().catch(() => [] as unknown[]),
      restCount('quotes'),
      restCount('quotes', 'status=eq.published'),
      restCount('quotes', 'status=eq.draft'),
      restCount('articles'),
      restRows<{ id: number; title: string; slug: string; status: string; updatedAt?: string }>(
        'novels?select=id,title,slug,status,updatedAt&order=updatedAt.desc&limit=6',
      ),
      restRows<{ id: number; title: string; slug: string; status: string; updatedAt?: string }>(
        'articles?select=id,title,slug,status,updatedAt&order=updatedAt.desc&limit=5',
      ),
    ]);

  return {
    ...base,
    genres: Array.isArray(genresRows) ? genresRows.length : 0,
    users: Array.isArray(usersRows) ? usersRows.length : 0,
    quotes,
    publishedQuotes,
    draftQuotes,
    articles,
    recentNovels: recentNovels ?? [],
    recentArticles: recentArticles ?? [],
  };
}
