import { ENV } from './_core/env';

/** Exact published (or all) quote count for pagination. */
export async function countQuotes(publicOnly = true) {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) {
    throw new Error('Supabase admin REST is not configured');
  }
  const filter = publicOnly ? 'status=eq.published&' : '';
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/quotes?${filter}select=id`, {
    method: 'HEAD',
    headers: {
      apikey: ENV.supabaseSecretKey,
      Authorization: `Bearer ${ENV.supabaseSecretKey}`,
      Prefer: 'count=exact',
    },
  });
  if (!response.ok) throw new Error(`Quotes count ${response.status}`);
  const range = response.headers.get('content-range') || response.headers.get('Content-Range') || '';
  const total = Number(range.split('/').pop());
  return Number.isFinite(total) && total >= 0 ? total : 0;
}
