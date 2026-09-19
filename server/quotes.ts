import { invokeLLM } from './_core/llm';
import { ENV } from './_core/env';
import { isIP } from 'node:net';

export type QuoteRecord = { id: number; quote_text: string; speaker: string | null; book_title: string | null; author_id?: number | null; novel_id: number | null; category: string | null; status: 'draft' | 'published'; source_url?: string | null; import_id?: number | null; position?: number; created_at: string; updated_at: string };

async function request<T>(path: string, init: RequestInit = {}) {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) throw new Error('Supabase admin REST is not configured');
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${path}`, { ...init, headers: { apikey: ENV.supabaseSecretKey, Authorization: `Bearer ${ENV.supabaseSecretKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers ?? {}) } });
  if (!response.ok) throw new Error(`Quotes API ${response.status}: ${await response.text()}`);
  const text = await response.text(); return (text ? JSON.parse(text) : []) as T;
}
let authorsCache: { expires: number; data: Array<{ id: number; name: string; slug: string }> } | null = null;
let booksCache: { expires: number; data: Array<{ id: number; title: string; slug: string; authorId: number }> } | null = null;

export async function listQuotes(publicOnly = false, limit = 200, offset = 0) {
  const requested = Math.min(10000, Math.max(1, limit));
  const pageSize = Math.min(1000, requested);
  const rows: QuoteRecord[] = [];
  for (let cursor = Math.max(0, offset); rows.length < requested; cursor += pageSize) {
    const page = await request<QuoteRecord[]>(`quotes?select=*&${publicOnly ? 'status=eq.published&' : ''}order=created_at.desc&limit=${Math.min(pageSize, requested - rows.length)}&offset=${cursor}`);
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return enrichQuotes(rows);
}
export async function getQuote(id: number) {
  const rows = await request<QuoteRecord[]>(`quotes?id=eq.${id}&status=eq.published&select=*&limit=1`);
  return (await enrichQuotes(rows))[0] ?? null;
}
