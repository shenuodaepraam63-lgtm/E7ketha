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
export async function listSavedQuotes(userId: number) {
  const saved = await request<Array<{ quote_id: number; created_at: string }>>(`saved_quotes?user_id=eq.${userId}&select=quote_id,created_at&order=created_at.desc&limit=500`);
  if (!saved.length) return [];
  const ids = saved.map((row) => row.quote_id).join(',');
  const quotes = await enrichQuotes(await request<QuoteRecord[]>(`quotes?id=in.(${ids})&status=eq.published&select=*&limit=500`));
  const order = new Map(saved.map((row, index) => [row.quote_id, index]));
  return quotes.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
export async function isQuoteSaved(userId: number, quoteId: number) {
  const rows = await request<Array<{ id: number }>>(`saved_quotes?user_id=eq.${userId}&quote_id=eq.${quoteId}&select=id&limit=1`);
  return Boolean(rows[0]);
}
export async function saveQuote(userId: number, quoteId: number) {
  await request('saved_quotes', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' }, body: JSON.stringify({ user_id: userId, quote_id: quoteId }) });
  return { success: true } as const;
}
export async function unsaveQuote(userId: number, quoteId: number) {
  await request(`saved_quotes?user_id=eq.${userId}&quote_id=eq.${quoteId}`, { method: 'DELETE' });
  return { success: true } as const;
}
export async function getQuoteNeighbors(id: number) { const current = await request<Array<{ id: number; created_at: string }>>(`quotes?id=eq.${id}&status=eq.published&select=id,created_at&limit=1`); const row = current[0]; if (!row) return { previous: null, next: null }; const timestamp = encodeURIComponent(row.created_at); const [previous, next] = await Promise.all([request<Array<{ id: number }>>(`quotes?status=eq.published&created_at=gt.${timestamp}&select=id&order=created_at.asc&limit=1`), request<Array<{ id: number }>>(`quotes?status=eq.published&created_at=lt.${timestamp}&select=id&order=created_at.desc&limit=1`)]); return { previous: previous[0] ?? null, next: next[0] ?? null }; }
export async function listQuotesByAuthor(slug: string) { return (await listQuotes(true, 10000)).filter((quote) => quote.author_slug === slug); }
export async function listQuotesByBook(slug: string) { return (await listQuotes(true, 10000)).filter((quote) => quote.book_slug === slug); }
export async function listQuotesByCategory(category: string) { const wanted = comparable(decodeURIComponent(category).replace(/-/g, ' ')); return (await listQuotes(true, 10000)).filter((quote) => quote.category && comparable(quote.category) === wanted); }
export async function listQuoteCategories() { return Array.from(new Set((await listQuotes(true, 10000)).map((quote) => quote.category).filter((category): category is string => Boolean(category?.trim())))).sort((a, b) => a.localeCompare(b, 'ar')); }
async function enrichQuotes(rows: QuoteRecord[]) { const authorIds = Array.from(new Set(rows.map((row) => row.author_id).filter((id): id is number => Number.isInteger(id)))); const bookIds = Array.from(new Set(rows.map((row) => row.novel_id).filter((id): id is number => Number.isInteger(id)))); const [authors, books] = await Promise.all([authorIds.length === rows.length ? request<Array<{ id: number; name: string; slug: string }>>(`authors?select=id,name,slug&id=in.(${authorIds.join(',')})`) : listQuoteAuthors(), bookIds.length === rows.length ? request<Array<{ id: number; title: string; slug: string; authorId: number }>>(`novels?select=id,title,slug,authorId&id=in.(${bookIds.join(',')})`) : listQuoteBooks()]); return rows.map((row) => { const author = authors.find((item) => item.id === row.author_id) ?? matchEntity(row.speaker, authors); const book = books.find((item) => item.id === row.novel_id) ?? matchEntity(row.book_title, books); return { ...row, quote_text: cleanImportedQuote(row.quote_text), author_id: author?.id ?? row.author_id ?? null, author_name: author?.name ?? row.speaker, author_slug: author?.slug ?? null, book_id: book?.id ?? row.novel_id ?? null, book_title: book?.title ?? row.book_title, book_slug: book?.slug ?? null }; }); }
export async function createQuote(input: Omit<QuoteRecord, 'id' | 'created_at' | 'updated_at'>) { return (await request<QuoteRecord[]>('quotes', { method: 'POST', body: JSON.stringify(input) }))[0]; }
export async function updateQuote(id: number, input: Partial<Omit<QuoteRecord, 'id' | 'created_at' | 'updated_at'>>) { return (await request<QuoteRecord[]>(`quotes?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ ...input, updated_at: new Date().toISOString() }) }))[0]; }
export async function deleteQuote(id: number) { await request(`quotes?id=eq.${id}`, { method: 'DELETE' }); return { success: true } as const; }
export async function createQuoteImport(input: { source_url: string; author?: string; book?: string; instructions?: string; quote_count: number }) { return (await request<Array<{ id: number }>>('quote_imports', { method: 'POST', body: JSON.stringify(input) }))[0]; }
export async function listQuoteImports() { return request<Array<{ id: number; source_url: string; author: string | null; book: string | null; instructions: string | null; quote_count: number; created_at: string }>>('quote_imports?select=*&order=created_at.desc&limit=50');
}
export async function existingQuoteTexts() {
  const rows: Array<{ quote_text: string }> = [];
  for (let offset = 0; offset < 10000; offset += 1000) {
    const page = await request<Array<{ quote_text: string }>>(`quotes?select=quote_text&order=id.asc&limit=1000&offset=${offset}`);
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}
export async function listQuoteAuthors() { if (authorsCache && authorsCache.expires > Date.now()) return authorsCache.data; const data = await request<Array<{ id: number; name: string; slug: string }>>('authors?select=id,name,slug&limit=500'); authorsCache = { data, expires: Date.now() + 5 * 60 * 1000 }; return data; }
export async function listQuoteBooks() { if (booksCache && booksCache.expires > Date.now()) return booksCache.data; const data = await request<Array<{ id: number; title: string; slug: string; authorId: number }>>('novels?select=id,title,slug,authorId&limit=1000'); booksCache = { data, expires: Date.now() + 5 * 60 * 1000 }; return data; }
function cleanImportedQuote(value: string) { return (value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function comparable(value: string) { return cleanImportedQuote(value).toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\u0600-\u06ffa-z0-9]+/gi, ''); }
export function matchEntity<T extends { name?: string; title?: string }>(value: string | null | undefined, entities: T[]) { const wanted = comparable(value ?? ''); if (!wanted) return null; return entities.find((entity) => comparable(entity.name ?? entity.title ?? '') === wanted) ?? null; }
export async function removeExistingSimilarQuotes<T extends { quote_text: string }>(quotes: T[]) { return { quotes, duplicateCount: 0 }; }
export async function findDuplicateQuotes() { return { threshold: 0.95, groups: [], removeCount: 0 }; }
export async function deleteDuplicateQuotes(ids: number[]) { return { deleted: 0 }; }
export async function scanTelegramChannel() { return { sourceUrl: '', pageUrl: '', channel: '', pagesScanned: 0, postsScanned: 0, quotes: [], nextBefore: null, done: true }; }
export async function previewQuotesFromUrl(input: { url: string }) { return { sourceUrl: input.url, author: '', book: '', quotes: [] }; }
export async function improveQuote(input: { quote: string }) { return { quote: input.quote, speaker: '', book: '', category: '', note: '' }; }
