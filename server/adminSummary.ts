import { getAdminSummary, listAdminGenres, listUsers } from './db';
import { ENV } from './_core/env';

async function restCount(table: string, filter = ''): Promise<number> {
  if (!ENV.supabaseUrl || !ENV.supabasePublishableKey) return 0;
  try {
    const response = await fetch(
      `${ENV.supabaseUrl}/rest/v1/${table}?select=id${filter ? `&${filter}` : ''}`,
      {
        method: 'HEAD',
        headers: {
          apikey: ENV.supabaseSecretKey || ENV.supabasePublishableKey,
          Authorization: `Bearer ${ENV.supabaseSecretKey || ENV.supabasePublishableKey}`,
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

/** Extended admin overview metrics — real DB/REST counts only. */
export async function getEnhancedAdminSummary() {
  const base = await getAdminSummary();

  const [genresRows, usersRows, quotes, publishedQuotes, draftQuotes] = await Promise.all([
    listAdminGenres().catch(() => [] as unknown[]),
    listUsers().catch(() => [] as unknown[]),
    restCount('quotes'),
    restCount('quotes', 'status=eq.published'),
    restCount('quotes', 'status=eq.draft'),
  ]);

  return {
    ...base,
    genres: Array.isArray(genresRows) ? genresRows.length : 0,
    users: Array.isArray(usersRows) ? usersRows.length : 0,
    quotes,
    publishedQuotes,
    draftQuotes,
  };
}
