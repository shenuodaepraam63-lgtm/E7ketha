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
  const rows = await request<QuoteRecord[]>(`quotes?select=*&${publicOnly ? 'status=eq.published&' : ''}order=created_at.desc&limit=${Math.min(500, Math.max(1, limit))}&offset=${Math.max(0, offset)}`); return enrichQuotes(rows);
}
export async function getQuote(id: number) {
  const rows = await request<QuoteRecord[]>(`quotes?id=eq.${id}&status=eq.published&select=*&limit=1`);
  return (await enrichQuotes(rows))[0] ?? null;
}
export async function getQuoteNeighbors(id: number) { const current = await request<Array<{ id: number; created_at: string }>>(`quotes?id=eq.${id}&status=eq.published&select=id,created_at&limit=1`); const row = current[0]; if (!row) return { previous: null, next: null }; const timestamp = encodeURIComponent(row.created_at); const [previous, next] = await Promise.all([request<Array<{ id: number }>>(`quotes?status=eq.published&created_at=gt.${timestamp}&select=id&order=created_at.asc&limit=1`), request<Array<{ id: number }>>(`quotes?status=eq.published&created_at=lt.${timestamp}&select=id&order=created_at.desc&limit=1`)]); return { previous: previous[0] ?? null, next: next[0] ?? null }; }
export async function listQuotesByAuthor(slug: string) { return (await listQuotes(true)).filter((quote) => quote.author_slug === slug); }
export async function listQuotesByBook(slug: string) { return (await listQuotes(true)).filter((quote) => quote.book_slug === slug); }
export async function listQuotesByCategory(category: string) { const wanted = comparable(category.replace(/-/g, ' ')); return (await listQuotes(true)).filter((quote) => quote.category && comparable(quote.category) === wanted); }
export async function listQuoteCategories() { return Array.from(new Set((await listQuotes(true)).map((quote) => quote.category).filter((category): category is string => Boolean(category?.trim())))); }
async function enrichQuotes(rows: QuoteRecord[]) { const authorIds = Array.from(new Set(rows.map((row) => row.author_id).filter((id): id is number => Number.isInteger(id)))); const bookIds = Array.from(new Set(rows.map((row) => row.novel_id).filter((id): id is number => Number.isInteger(id)))); const [authors, books] = await Promise.all([authorIds.length === rows.length ? request<Array<{ id: number; name: string; slug: string }>>(`authors?select=id,name,slug&id=in.(${authorIds.join(',')})`) : listQuoteAuthors(), bookIds.length === rows.length ? request<Array<{ id: number; title: string; slug: string; authorId: number }>>(`novels?select=id,title,slug,authorId&id=in.(${bookIds.join(',')})`) : listQuoteBooks()]); return rows.map((row) => { const author = authors.find((item) => item.id === row.author_id) ?? matchEntity(row.speaker, authors); const book = books.find((item) => item.id === row.novel_id) ?? matchEntity(row.book_title, books); return { ...row, quote_text: cleanImportedQuote(row.quote_text), author_id: author?.id ?? row.author_id ?? null, author_name: author?.name ?? row.speaker, author_slug: author?.slug ?? null, book_id: book?.id ?? row.novel_id ?? null, book_title: book?.title ?? row.book_title, book_slug: book?.slug ?? null }; }); }
export async function createQuote(input: Omit<QuoteRecord, 'id' | 'created_at' | 'updated_at'>) { return (await request<QuoteRecord[]>('quotes', { method: 'POST', body: JSON.stringify(input) }))[0]; }
export async function updateQuote(id: number, input: Partial<Omit<QuoteRecord, 'id' | 'created_at' | 'updated_at'>>) { return (await request<QuoteRecord[]>(`quotes?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ ...input, updated_at: new Date().toISOString() }) }))[0]; }
export async function deleteQuote(id: number) { await request(`quotes?id=eq.${id}`, { method: 'DELETE' }); return { success: true } as const; }
export async function createQuoteImport(input: { source_url: string; author?: string; book?: string; instructions?: string; quote_count: number }) { return (await request<Array<{ id: number }>>('quote_imports', { method: 'POST', body: JSON.stringify(input) }))[0]; }
export async function listQuoteImports() { return request<Array<{ id: number; source_url: string; author: string | null; book: string | null; instructions: string | null; quote_count: number; created_at: string }>>('quote_imports?select=*&order=created_at.desc&limit=50'); }
export async function existingQuoteTexts() { return request<Array<{ quote_text: string }>>('quotes?select=quote_text&limit=5000'); }
export async function listQuoteAuthors() { if (authorsCache && authorsCache.expires > Date.now()) return authorsCache.data; const data = await request<Array<{ id: number; name: string; slug: string }>>('authors?select=id,name,slug&limit=500'); authorsCache = { data, expires: Date.now() + 5 * 60 * 1000 }; return data; }
export async function listQuoteBooks() { if (booksCache && booksCache.expires > Date.now()) return booksCache.data; const data = await request<Array<{ id: number; title: string; slug: string; authorId: number }>>('novels?select=id,title,slug,authorId&limit=1000'); booksCache = { data, expires: Date.now() + 5 * 60 * 1000 }; return data; }

function decodeHtml(value: string) { return value.replace(/&nbsp;/gi, ' ').replace(/&rlm;|&lrm;|&zwj;|&zwnj;/gi, '').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&ldquo;|&rdquo;|&laquo;|&raquo;/gi, '"').replace(/&lsquo;|&rsquo;|&sbquo;/gi, "'").replace(/&mdash;|&ndash;/gi, '—').replace(/&hellip;/gi, '…').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec))); }
function cleanText(value: string) { return decodeHtml(value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()).replace(/^\s*[“"«]|[”"»]\s*$/g, '').trim(); }
function cleanImportedQuote(value: string) { const text = cleanText(value).replace(/^tags\s*:\s*.+$/i, '').trim(); return text.replace(/\s+(?:—|–|―|-{2,})\s+[^\n]{1,180},\s*[^\n,]{1,180}\s*$/, '').replace(/^[\s“"«]+|[\s”"»]+$/g, '').trim(); }
function comparable(value: string) { return cleanImportedQuote(value).toLowerCase().replace(/[ًٌٍَُِّْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\u0600-\u06ff\w\d]+/g, ''); }
function filterByLanguage(value: string, language: 'ar' | 'en' | 'both') { const text = cleanImportedQuote(value); if (language === 'both') return text; const letters = text.match(/[A-Za-z\u0600-\u06ff]/g) ?? []; if (letters.length < 3) return ''; const wanted = language === 'ar' ? /[\u0600-\u06ff]/ : /[A-Za-z]/; const matching = letters.filter((letter) => wanted.test(letter)).length; if (matching / letters.length < 0.55) return ''; return text.replace(language === 'ar' ? /[A-Za-z]+/g : /[\u0600-\u06ff]+/g, '').replace(/\s{2,}/g, ' ').trim(); }
function keepGroundedQuotes(quotes: string[], source: string) { const sourceText = comparable(source); return quotes.filter((quote) => { const normalized = comparable(quote); return normalized.length >= 30 && (sourceText.includes(normalized) || sourceText.includes(normalized.slice(0, Math.min(100, normalized.length)))); }); }
export function matchEntity<T extends { name?: string; title?: string }>(value: string | null | undefined, entities: T[]) { const wanted = comparable(value ?? ''); if (!wanted) return null; return entities.find((entity) => comparable(entity.name ?? entity.title ?? '') === wanted) ?? null; }
function meta(html: string, key: string) { const direct = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'); const reverse = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i'); return decodeHtml(direct.exec(html)?.[1] ?? reverse.exec(html)?.[1] ?? '').trim(); }
function jsonLdValue(html: string, key: string) { const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi; let match: RegExpExecArray | null; while ((match = pattern.exec(html))) { try { const parsed = JSON.parse(match[1]); const item = Array.isArray(parsed) ? parsed[0] : parsed; const value = item?.[key]?.name ?? item?.[key]; if (typeof value === 'string') return value; } catch { /* ignore invalid JSON-LD */ } } return ''; }
function extractElements(html: string) { const pattern = /<(blockquote|p|li|div|article|section)[^>]*(?:class|id)=["'][^"']*(?:quote|اقتباس|quotation|excerpt)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi; const result: string[] = []; let match: RegExpExecArray | null; while ((match = pattern.exec(html))) { const text = cleanImportedQuote(match[2]); if (text.length >= 12 && text.length <= 2000 && !/^tags\s*:/i.test(text)) result.push(text); } return result; }
async function extractWithAi(text: string, instructions: string) {
  const prompt = `استخرج الاقتباسات فقط من النص التالي، كل اقتباس عنصر مستقل وبنفس ترتيب ظهوره. استبعد أسطر tags والتصنيفات وأي أرقام أو بيانات واجهة. احذف رموز HTML ونسبة الكاتب والكتاب من نهاية نص الاقتباس. لا تخترع نصًا أو كاتبًا أو كتابًا. التعليمات: ${instructions}\nالنص:\n${text.slice(0, 50_000)}`;
  const schema = { type: 'object', properties: { author: { type: 'string' }, book: { type: 'string' }, quotes: { type: 'array', items: { type: 'string' } } }, required: ['author', 'book', 'quotes'], additionalProperties: false };
  if (ENV.geminiApiKey) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(ENV.geminiApiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: 'أنت مستخرج اقتباسات دقيق. أخرج JSON فقط.' }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: schema } }) });
    if (!response.ok) throw new Error(`فشل استخراج AI (${response.status})`); const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }; const content = payload.candidates?.[0]?.content?.parts?.[0]?.text; if (content) return JSON.parse(content) as { author: string; book: string; quotes: string[] };
  }
  const result = await invokeLLM({ model: 'gpt-5-mini', maxTokens: 4000, messages: [{ role: 'system', content: 'أنت مستخرج اقتباسات عربي دقيق. أخرج JSON فقط ولا تخترع محتوى.' }, { role: 'user', content: prompt }], responseFormat: { type: 'json_schema', json_schema: { name: 'quote_import', strict: true, schema } } });
  const content = result.choices[0]?.message.content; if (!content || typeof content !== 'string') throw new Error('لم يُرجع AI نتيجة صالحة'); return JSON.parse(content) as { author: string; book: string; quotes: string[] };
}
export type QuoteImportPreview = { sourceUrl: string; author: string; book: string; quotes: Array<{ quote_text: string; speaker: string; book_title: string; category: string; status: 'published' }> };

export type TelegramChannelScan = {
  sourceUrl: string;
  pageUrl: string;
  channel: string;
  pagesScanned: number;
  postsScanned: number;
  quotes: Array<{ quote_text: string; speaker: string; book_title: string; category: string; status: 'published'; source_url: string }>;
  nextBefore: number | null;
  done: boolean;
};

function telegramChannelUrl(value: string) {
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol) || !['t.me', 'telegram.me'].includes(parsed.hostname.replace(/^www\./, ''))) throw new Error('يجب إدخال رابط قناة تيليجرام عامة مثل https://t.me/channel');
  const parts = parsed.pathname.split('/').filter(Boolean);
  const channel = parts[0] === 's' ? parts[1] : parts[0];
  if (!channel || channel.startsWith('+') || channel.startsWith('joinchat')) throw new Error('القناة يجب أن تكون عامة وليست رابط دعوة خاص');
  const before = Number(parsed.searchParams.get('before'));
  return { channel, before: Number.isInteger(before) && before > 0 ? before : null };
}

function extractTelegramPosts(html: string, channel: string) {
  const posts: Array<{ id: number; url: string; text: string }> = [];
  const pattern = /data-post=["']([^"']+\/\d+)["'][\s\S]*?class=["'][^"']*tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const postPath = match[1];
    const id = Number(postPath.split('/').pop());
    const text = cleanText(match[2]).replace(/\s*\[[^\]]*\]\([^)]*\)\s*/g, ' ').trim();
    if (Number.isInteger(id) && text.length >= 25) posts.push({ id, url: `https://t.me/${postPath}`, text });
  }
  return posts.filter((post, index, list) => list.findIndex((item) => item.id === post.id) === index).sort((a, b) => a.id - b.id);
}

function telegramQuote(post: { id: number; url: string; text: string }, channel: string) {
  const text = post.text.replace(/\s+/g, ' ').trim();
  if (/^(تحميل|download|مشاهدة|فيديو|صور|إعلان|اعلان)\b/i.test(text) || /\.pdf\b/i.test(text)) return null;
  const attribution = text.match(/(?:^|\s)[—–-]\s*([^—–-]{2,120}?)(?:\s*[📘📗📒📓📕📑📃📜♪]|$)/);
  const speaker = attribution?.[1]?.trim().replace(/[\s،,.]+$/g, '') ?? '';
  const quote = cleanImportedQuote(attribution ? text.slice(0, attribution.index).trim() : text);
  if (quote.length < 25 || quote.length > 2000 || /^tags\s*:/i.test(quote)) return null;
  return { quote_text: quote, speaker, book_title: '', category: '', status: 'published' as const, source_url: post.url };
}

export async function scanTelegramChannel(input: { url: string; maxPages?: number }): Promise<TelegramChannelScan> {
  const parsed = telegramChannelUrl(input.url);
  const pages = Math.min(10, Math.max(1, input.maxPages ?? 1));
  let before = parsed.before;
  let pagesScanned = 0;
  let postsScanned = 0;
  const quotes: TelegramChannelScan['quotes'] = [];
  let lastPageUrl = `https://t.me/s/${parsed.channel}`;
  for (let page = 0; page < pages; page += 1) {
    const pageUrl = new URL(`https://t.me/s/${parsed.channel}`);
    if (before) pageUrl.searchParams.set('before', String(before));
    lastPageUrl = pageUrl.toString();
    const response = await fetch(pageUrl, { headers: { 'User-Agent': 'RiwayaQuoteImporter/1.0 (+https://e7ketha.vercel.app)' }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`تعذر فتح قناة تيليجرام (${response.status})`);
    const posts = extractTelegramPosts((await response.text()).slice(0, 5_000_000), parsed.channel);
    pagesScanned += 1;
    postsScanned += posts.length;
    for (const post of posts) { const quote = telegramQuote(post, parsed.channel); if (quote) quotes.push(quote); }
    const oldest = posts[0]?.id;
    if (!oldest || posts.length === 0 || (before !== null && oldest >= before)) return { sourceUrl: `https://t.me/${parsed.channel}`, pageUrl: lastPageUrl, channel: parsed.channel, pagesScanned, postsScanned, quotes, nextBefore: null, done: true };
    before = oldest - 1;
  }
  return { sourceUrl: `https://t.me/${parsed.channel}`, pageUrl: lastPageUrl, channel: parsed.channel, pagesScanned, postsScanned, quotes, nextBefore: before, done: false };
}

export async function previewQuotesFromUrl(input: { url: string; author?: string; book?: string; instructions?: string; useAi?: boolean; language?: 'ar' | 'en' | 'both' }): Promise<QuoteImportPreview> {
  const parsedUrl = new URL(input.url); if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('الرابط يجب أن يبدأ بـ http أو https');
  const host = parsedUrl.hostname.replace(/^\[|\]$/g, ''); const privateIpv4 = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host); const privateIpv6 = host === '::1' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80:');
  if (['localhost', '0.0.0.0'].includes(host) || host.endsWith('.local') || (isIP(host) === 4 && privateIpv4) || (isIP(host) === 6 && privateIpv6)) throw new Error('لا يمكن فحص هذا النطاق');
  const response = await fetch(parsedUrl, { headers: { 'User-Agent': 'RiwayaQuoteImporter/1.0 (+https://e7ketha.vercel.app)' }, signal: AbortSignal.timeout(15_000) }); if (!response.ok) throw new Error(`تعذر فتح الرابط (${response.status})`);
  const html = (await response.text()).slice(0, 3_000_000); const author = input.author?.trim() || meta(html, 'author') || jsonLdValue(html, 'author'); const book = input.book?.trim() || meta(html, 'book') || meta(html, 'og:title') || jsonLdValue(html, 'isPartOf') || ''; const instruction = (input.instructions ?? '').toLowerCase();
  let extracted = extractElements(html); if (!extracted.length || instruction.includes('كل سطر')) { const visible = cleanText(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>/gi, '\n')); const lines = visible.split(/(?:\n|\r)+/).map((line) => cleanText(line)).filter((line) => line.length >= 25 && line.length <= 2000); extracted = extracted.length && !instruction.includes('كل سطر') ? extracted : lines; }
  let resolvedAuthor = author; let resolvedBook = book; if (input.useAi) { try { const sourceText = cleanText(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')); const ai = await extractWithAi(sourceText, input.instructions ?? 'استخرج الاقتباسات فقط'); const grounded = keepGroundedQuotes(ai.quotes, sourceText); if (grounded.length < Math.max(1, Math.ceil(ai.quotes.length * 0.5))) throw new Error('AI returned ungrounded quotes'); extracted = grounded; resolvedAuthor ||= ai.author; resolvedBook ||= ai.book; } catch (error) { console.warn('[Quotes] AI extraction unavailable; using deterministic extraction', error); } }
  const language = input.language ?? 'both'; const unique = Array.from(new Set(extracted.map((quote) => filterByLanguage(quote, language)).filter((quote) => quote.length >= 12 && !/^tags\s*:/i.test(quote)))).slice(0, 500); if (!unique.length) throw new Error('لم أجد اقتباسات مطابقة للغة المختارة. جرّب تغيير اللغة إلى الاثنين أو تعديل التعليمات.');
  return { sourceUrl: input.url, author: resolvedAuthor, book: resolvedBook, quotes: unique.map((quote_text) => ({ quote_text, speaker: resolvedAuthor, book_title: resolvedBook, category: '', status: 'published' as const })) };
}

export async function improveQuote(input: { quote: string; speaker?: string; book?: string }) {
  const prompt = `حسّن هذا الاقتباس دون تغيير معناه، واقترح تصنيفًا مناسبًا. لا تخترع القائل أو الكتاب إذا لم يذكرهما المستخدم. أخرج JSON فقط بالمفاتيح quote, speaker, book, category, note.\nالنص: ${input.quote}\nالقائل إن وجد: ${input.speaker ?? ''}\nالكتاب إن وجد: ${input.book ?? ''}`;
  if (ENV.geminiApiKey) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(ENV.geminiApiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: 'أنت محرر محتوى عربي دقيق لمنصة روايات. لا تنسب قولًا دون مصدر.' }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }) });
    if (!response.ok) throw new Error(`Gemini API ${response.status}: ${await response.text()}`);
    const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('لم تُرجع Gemini نتيجة صالحة');
    return JSON.parse(content) as { quote: string; speaker: string; book: string; category: string; note: string };
  }
  const result = await invokeLLM({ model: 'gpt-5-mini', maxTokens: 500, messages: [
    { role: 'system', content: 'أنت محرر محتوى عربي. ساعد مدير منصة روايات على تجهيز اقتباس للنشر. لا تنسب قولًا لشخص أو كتاب دون دليل؛ إذا لم يذكر المستخدم المصدر اتركه فارغًا. أخرج JSON فقط.' },
    { role: 'user', content: prompt },
  ], responseFormat: { type: 'json_schema', json_schema: { name: 'quote_editor', strict: true, schema: { type: 'object', properties: { quote: { type: 'string' }, speaker: { type: 'string' }, book: { type: 'string' }, category: { type: 'string' }, note: { type: 'string' } }, required: ['quote', 'speaker', 'book', 'category', 'note'], additionalProperties: false } } } });
  const content = result.choices[0]?.message.content; if (!content || typeof content !== 'string') throw new Error('لم تُرجع خدمة AI نتيجة صالحة');
  return JSON.parse(content) as { quote: string; speaker: string; book: string; category: string; note: string };
}
