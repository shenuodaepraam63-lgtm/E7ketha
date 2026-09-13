import { and, asc, eq } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import { getDb } from './db';
import { authors, genres, novelGenres, novelLinks, novels, series, seriesBooks } from '../drizzle/schema';
import { ENV } from './_core/env';

export type ImportLinkInput = { label: string; url: string; type: 'read' | 'download' };
export type NovelImportInput = { title: string; links: ImportLinkInput[]; notes?: string };
export type ImportBook = {
  title: string;
  slug: string;
  order: number;
  description?: string;
  publicationYear?: number | null;
  coverUrl?: string | null;
  links: ImportLinkInput[];
};
export type NovelImportDraft = {
  title: string;
  slug: string;
  description: string;
  publicationYear?: number | null;
  language: string;
  status: 'standalone' | 'completed' | 'ongoing';
  genres: string[];
  author: { name: string; slug: string; bio: string; bookCount: number };
  series?: { title: string; slug: string; description: string; status: 'completed' | 'ongoing' } | null;
  books: ImportBook[];
  links: ImportLinkInput[];
};

const MODEL = 'gemini-3.5-flash-lite';
const fallbackCover = 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=700&q=88';

function cleanSlug(value: string, fallback: string) {
  const slug = value.trim().toLowerCase().replace(/[^a-zA-Z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160);
  return slug || fallback.trim().toLowerCase().replace(/[^a-zA-Z0-9\u0600-\u06ff]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 160) || 'novel';
}
function safeUrl(value: string) {
  try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; }
}
function normalizeLink(link: Partial<ImportLinkInput>): ImportLinkInput | null {
  if (!link.url || !safeUrl(link.url)) return null;
  return { label: String(link.label || (link.type === 'download' ? 'تحميل الرواية' : 'قراءة الرواية')).slice(0, 120), url: link.url, type: link.type === 'download' ? 'download' : 'read' };
}

async function fetchContext(url: string) {
  if (!safeUrl(url)) return '';
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'RiwayaContentAssistant/1.0' }, signal: AbortSignal.timeout(7000) });
    if (!response.ok) return '';
    const html = (await response.text()).slice(0, 18_000);
    return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5_000);
  } catch { return ''; }
}

async function findCoverUrl(title: string, author?: string) {
  try {
    const query = encodeURIComponent(`intitle:${title}${author ? ` inauthor:${author}` : ''}`);
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1&langRestrict=ar`, { signal: AbortSignal.timeout(7000) });
    if (response.ok) {
      const body = await response.json() as { items?: Array<{ volumeInfo?: { imageLinks?: { thumbnail?: string } } }> };
      const cover = body.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
      if (cover) return cover.replace(/^http:/, 'https:');
    }
  } catch { /* use a stable neutral fallback */ }
  return fallbackCover;
}

function schema() {
  return {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' }, slug: { type: 'STRING' }, description: { type: 'STRING' }, publicationYear: { type: 'INTEGER', nullable: true }, language: { type: 'STRING' }, status: { type: 'STRING', enum: ['standalone', 'completed', 'ongoing'] }, genres: { type: 'ARRAY', items: { type: 'STRING' } },
      author: { type: 'OBJECT', properties: { name: { type: 'STRING' }, slug: { type: 'STRING' }, bio: { type: 'STRING' }, bookCount: { type: 'INTEGER' } }, required: ['name', 'slug', 'bio', 'bookCount'] },
      series: { type: 'OBJECT', nullable: true, properties: { title: { type: 'STRING' }, slug: { type: 'STRING' }, description: { type: 'STRING' }, status: { type: 'STRING', enum: ['completed', 'ongoing'] } } },
      books: { type: 'ARRAY', items: { type: 'OBJECT', properties: { title: { type: 'STRING' }, slug: { type: 'STRING' }, order: { type: 'INTEGER' }, description: { type: 'STRING' }, publicationYear: { type: 'INTEGER', nullable: true }, links: { type: 'ARRAY', items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, url: { type: 'STRING' }, type: { type: 'STRING', enum: ['read', 'download'] } }, required: ['label', 'url', 'type'] } } }, required: ['title', 'slug', 'order', 'description', 'links'] } },
      links: { type: 'ARRAY', items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, url: { type: 'STRING' }, type: { type: 'STRING', enum: ['read', 'download'] } }, required: ['label', 'url', 'type'] } },
    },
    required: ['title', 'slug', 'description', 'language', 'status', 'genres', 'author', 'books', 'links'],
  };
}

export async function analyzeNovelImport(input: NovelImportInput): Promise<NovelImportDraft> {
  if (!ENV.geminiApiKey) throw new Error('GEMINI_API_KEY غير مضبوط على الخادم');
  const sourceLinks = input.links.map(normalizeLink).filter((link): link is ImportLinkInput => Boolean(link));
  const context = await Promise.all(sourceLinks.slice(0, 5).map(async (link) => ({ ...link, excerpt: await fetchContext(link.url) })));
  const prompt = `أنت مساعد تحرير لمنصة روايات عربية. أكمل بطاقة بيانات الرواية اعتمادًا على اسم الرواية والروابط ومقتطفات صفحات الويب المرفقة. لا تنسخ نصوصًا طويلة أو فصولًا أو محتوى محميًا؛ أعد metadata فقط. إذا كانت الرواية جزءًا من سلسلة، أدرج الأجزاء المعروفة بترتيب القراءة. لا تخترع روابط: استخدم الروابط التي أرسلها المشرف فقط، ويمكنك وضعها في الجزء الأنسب. إذا لم تكن متأكدًا من معلومة، اتركها فارغة أو استخدم قيمة محافظة. أعد JSON مطابقًا للمخطط فقط.

اسم الرواية: ${input.title}
ملاحظات المشرف: ${input.notes || 'لا توجد'}
الروابط التي أرسلها المشرف:
${JSON.stringify(context, null, 2)}`;
  const ai = new GoogleGenAI({ apiKey: ENV.geminiApiKey });
  const response = await ai.models.generateContent({ model: MODEL, contents: prompt, config: { temperature: 0.2, maxOutputTokens: 3000 } });
  const text = response.text || '';
  if (!text) throw new Error('لم يُرجع Gemini بيانات قابلة للقراءة');
  let parsed: any;
  try { parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '').trim()); } catch { throw new Error('تعذر قراءة JSON الناتج من Gemini'); }
  const authorName = String(parsed.author?.name || 'مؤلف غير معروف');
  const books: ImportBook[] = (Array.isArray(parsed.books) && parsed.books.length ? parsed.books : [{ title: input.title, slug: input.title, order: 1, description: parsed.description || '', links: [] }]).map((book: any, index: number) => ({
    title: String(book.title || input.title), slug: cleanSlug(String(book.slug || book.title || input.title), `novel-${index + 1}`), order: Number(book.order) || index + 1, description: String(book.description || parsed.description || ''), publicationYear: Number.isFinite(Number(book.publicationYear)) ? Number(book.publicationYear) : null, coverUrl: null, links: Array.isArray(book.links) ? book.links.map(normalizeLink).filter((link: ImportLinkInput | null): link is ImportLinkInput => Boolean(link)) : [],
  }));
  const allUrls = new Set(books.flatMap((book) => book.links.map((link) => link.url)));
  for (const link of sourceLinks) if (!allUrls.has(link.url)) books[0].links.push(link);
  for (const book of books) book.links = Array.from(new Map(book.links.map((link) => [link.url, link])).values());
  for (const book of books) book.coverUrl = await findCoverUrl(book.title, authorName);
  const draft: NovelImportDraft = {
    title: String(parsed.title || books[0].title || input.title), slug: cleanSlug(String(parsed.slug || parsed.title || input.title), 'novel'), description: String(parsed.description || ''), publicationYear: Number.isFinite(Number(parsed.publicationYear)) ? Number(parsed.publicationYear) : null, language: String(parsed.language || 'ar'), status: parsed.status === 'ongoing' ? 'ongoing' : books.length > 1 || parsed.status === 'completed' ? 'completed' : 'standalone', genres: Array.isArray(parsed.genres) ? parsed.genres.map(String).slice(0, 8) : [], author: { name: authorName, slug: cleanSlug(String(parsed.author?.slug || authorName), 'author'), bio: String(parsed.author?.bio || ''), bookCount: Number(parsed.author?.bookCount) || books.length }, series: parsed.series?.title ? { title: String(parsed.series.title), slug: cleanSlug(String(parsed.series.slug || parsed.series.title), 'series'), description: String(parsed.series.description || ''), status: parsed.series.status === 'ongoing' ? 'ongoing' : 'completed' } : null, books: books.sort((a, b) => a.order - b.order), links: sourceLinks,
  };
  return draft;
}

export type SeriesLinkDiscoveryInput = {
  title: string;
  seriesTitle?: string;
  books: Array<{ title: string; slug: string; order: number }>;
  existingLinks: ImportLinkInput[];
};

async function searchWebForBook(title: string, seriesTitle?: string) {
  const query = encodeURIComponent(`${title} ${seriesTitle || ''} قراءة تحميل رواية`);
  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, { headers: { 'user-agent': 'RiwayaLinkDiscovery/1.0' }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) return [] as ImportLinkInput[];
    const html = await response.text();
    const candidates: string[] = [];
    const resultPattern = /class="result__a"[^>]+href="([^"]+)"/gi;
    let match: RegExpExecArray | null;
    while ((match = resultPattern.exec(html)) !== null) {
      const raw = match[1].replace(/&amp;/g, '&');
      try {
        const url = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
        const target = url.searchParams.get('uddg') || url.toString();
        if (safeUrl(target)) candidates.push(target);
      } catch { /* ignore malformed search result */ }
    }
    return Array.from(new Set(candidates)).slice(0, 5).map((url, index) => ({ label: index === 0 ? `قراءة ${title}` : `رابط ${index + 1} — ${title}`, url, type: 'read' as const }));
  } catch { return [] as ImportLinkInput[]; }
}

async function discoverSeriesLinksFromWeb(input: SeriesLinkDiscoveryInput) {
  const existing = new Set(input.existingLinks.map((link) => link.url));
  const books = await Promise.all(input.books.map(async (book) => ({ slug: book.slug, title: book.title, order: book.order, links: (await searchWebForBook(book.title, input.seriesTitle)).filter((link) => !existing.has(link.url)) })));
  return { books, found: books.reduce((count, book) => count + book.links.length, 0), source: 'web' as const };
}

export async function discoverSeriesLinks(input: SeriesLinkDiscoveryInput) {
  if (!ENV.geminiApiKey) throw new Error('GEMINI_API_KEY غير مضبوط على الخادم');
  const prompt = `أنت مساعد بحث لمحرر منصة روايات عربية. ابحث عبر الويب عن روابط عامة حقيقية لقراءة أو تحميل الأجزاء التالية، ولا تخترع أي رابط. استخدم فقط الروابط التي تظهر في نتائج البحث أو الروابط الموجودة أصلًا. أعد JSON فقط بهذا الشكل: {"books":[{"slug":"...","links":[{"label":"...","url":"https://...","type":"read أو download"}]}]}. لا تضف روابط صفحات البحث أو روابط غير مؤكدة، ولا تنسخ محتوى الكتب.
اسم الرواية: ${input.title}
اسم السلسلة: ${input.seriesTitle || 'غير معروف'}
الأجزاء:
${JSON.stringify(input.books, null, 2)}
روابط موجودة مسبقًا:
${JSON.stringify(input.existingLinks, null, 2)}`;
  const ai = new GoogleGenAI({ apiKey: ENV.geminiApiKey });
  let text = '';
  try {
    const response = await ai.models.generateContent({ model: MODEL, contents: prompt, config: { temperature: 0.1, maxOutputTokens: 2500, tools: [{ googleSearch: {} }] } });
    text = response.text || '';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/429|quota|503|high demand|unavailable/i.test(message)) return discoverSeriesLinksFromWeb(input);
    throw error;
  }
  let parsed: any;
  try {
    const candidate = text.replace(/^```json\s*|\s*```$/g, '').trim();
    parsed = JSON.parse(candidate.slice(candidate.indexOf('{'), candidate.lastIndexOf('}') + 1));
  } catch {
    throw new Error('تعذر قراءة روابط الأجزاء من Gemini');
  }
  const existing = new Set(input.existingLinks.map((link) => link.url));
  const books = input.books.map((book) => {
    const result = Array.isArray(parsed.books) ? parsed.books.find((item: any) => item.slug === book.slug || item.title === book.title || Number(item.order) === book.order) : null;
    const links: ImportLinkInput[] = Array.isArray(result?.links) ? result.links.map(normalizeLink).filter((link: ImportLinkInput | null): link is ImportLinkInput => Boolean(link)).filter((link: ImportLinkInput) => !existing.has(link.url)) : [];
    return { slug: book.slug, title: book.title, order: book.order, links: Array.from(new Map(links.map((link: ImportLinkInput) => [link.url, link])).values()) };
  });
  return { books, found: books.reduce((count, book) => count + book.links.length, 0), source: 'gemini' as const };
}

export async function saveNovelImport(draft: NovelImportDraft) {
  const db = await getDb();
  if (!db) throw new Error('قاعدة Supabase غير متاحة');
  return db.transaction(async (tx) => {
    const existingAuthors = await tx.select().from(authors).where(eq(authors.slug, cleanSlug(draft.author.slug, 'author'))).limit(1);
    const author = existingAuthors[0] ?? (await tx.insert(authors).values({ slug: cleanSlug(draft.author.slug, 'author'), name: draft.author.name, bio: draft.author.bio || null, bookCount: draft.author.bookCount }).returning())[0];
    if (!author) throw new Error('تعذر إنشاء المؤلف');
    const genreIds: number[] = [];
    for (const genreName of draft.genres) {
      const slug = cleanSlug(genreName, 'genre');
      const current = await tx.select().from(genres).where(eq(genres.slug, slug)).limit(1);
      const genre = current[0] ?? (await tx.insert(genres).values({ slug, name: genreName, description: null, icon: '✦' }).returning())[0];
      if (genre) genreIds.push(genre.id);
    }
    let seriesId: number | null = null;
    if (draft.series && draft.books.length > 1) {
      const existingSeries = await tx.select().from(series).where(eq(series.slug, cleanSlug(draft.series.slug, 'series'))).limit(1);
      const currentSeries = existingSeries[0] ?? (await tx.insert(series).values({ slug: cleanSlug(draft.series.slug, 'series'), title: draft.series.title, description: draft.series.description || null, status: draft.series.status }).returning())[0];
      seriesId = currentSeries?.id ?? null;
    }
    const saved: Array<{ id: number; slug: string; title: string; links: number }> = [];
    for (const book of draft.books) {
      const slug = cleanSlug(book.slug, book.title);
      const current = await tx.select().from(novels).where(eq(novels.slug, slug)).limit(1);
      const payload = { slug, title: book.title, authorId: author.id, seriesId, coverUrl: book.coverUrl || fallbackCover, description: book.description || draft.description || null, parts: draft.books.length, status: draft.books.length > 1 ? draft.status : 'standalone' as const, publicationYear: book.publicationYear ?? draft.publicationYear ?? null, language: draft.language || 'ar', updatedAt: new Date() };
      const novel = current[0] ? (await tx.update(novels).set(payload).where(eq(novels.id, current[0].id)).returning())[0] : (await tx.insert(novels).values(payload).returning())[0];
      if (!novel) continue;
      await tx.delete(novelGenres).where(eq(novelGenres.novelId, novel.id));
      if (genreIds.length) await tx.insert(novelGenres).values(genreIds.map((genreId) => ({ novelId: novel.id, genreId }))).onConflictDoNothing();
      await tx.delete(novelLinks).where(eq(novelLinks.novelId, novel.id));
      if (book.links.length) await tx.insert(novelLinks).values(book.links.map((link, index) => ({ novelId: novel.id, label: link.label, url: link.url, type: link.type, displayOrder: index })));
      if (seriesId) await tx.insert(seriesBooks).values({ seriesId, novelId: novel.id, order: book.order }).onConflictDoUpdate({ target: [seriesBooks.seriesId, seriesBooks.novelId], set: { order: book.order } });
      saved.push({ id: novel.id, slug: novel.slug, title: novel.title, links: book.links.length });
    }
    return { author: { id: author.id, name: author.name, slug: author.slug }, books: saved, seriesId };
  });
}
