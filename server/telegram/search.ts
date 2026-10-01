import { searchNovels, listAuthors, listGenres } from '../db';
import { listPublishedArticles } from '../articles';
import { SITE_ORIGIN } from './config';

export type SearchHit =
  | { kind: 'novel'; title: string; author?: string; slug: string; url: string }
  | { kind: 'author'; name: string; slug: string; url: string }
  | { kind: 'genre'; name: string; slug: string; url: string }
  | { kind: 'article'; title: string; slug: string; url: string };

function stripIntent(q: string): string {
  return q
    .replace(/^(ابحث|دور|هات|وريني|عايز|أريد|ابغى|فين|عن)\s+/gi, '')
    .replace(/\s+(من فضلك|لو سمحت)$/gi, '')
    .trim();
}

export function detectIntent(text: string): {
  type: 'start' | 'help' | 'novels' | 'authors' | 'genres' | 'articles' | 'unknown';
  query: string;
} {
  const t = text.trim();
  if (/^\/start(?:\s|$)/i.test(t)) return { type: 'start', query: t.replace(/^\/start\s*/i, '').trim() };
  if (/^\/help\b/i.test(t) || /^(مساعدة|help)$/i.test(t)) return { type: 'help', query: '' };

  const lower = t.toLowerCase();
  if (/مؤلف|كاتب|authors?/.test(lower)) {
    return { type: 'authors', query: stripIntent(t.replace(/مؤلفين?|كتاب|كاتب|authors?/gi, ' ').replace(/\s+/g, ' ').trim()) };
  }
  if (/تصنيف|نوع|أنواع|genres?/.test(lower)) {
    return { type: 'genres', query: stripIntent(t.replace(/تصنيفات?|أنواع|نوع|genres?/gi, ' ').replace(/\s+/g, ' ').trim()) };
  }
  if (/مقال|مقالة|articles?/.test(lower)) {
    return { type: 'articles', query: stripIntent(t.replace(/مقالات?|مقالة|articles?/gi, ' ').replace(/\s+/g, ' ').trim()) };
  }
  if (/رواية|روايات|كتاب|novels?|books?/.test(lower) || t.length >= 2) {
    const q = stripIntent(
      t
        .replace(/روايات?|رواية|كتب|كتاب|novels?|books?/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );
    return { type: 'novels', query: q || stripIntent(t) };
  }
  return { type: 'unknown', query: t };
}

export async function searchE7ketha(type: 'novels' | 'authors' | 'genres' | 'articles', query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (type === 'novels') {
    const rows = await searchNovels({ q: q || undefined, limit: 8, sort: 'popular' });
    return (rows as any[]).slice(0, 8).map((n) => ({
      kind: 'novel' as const,
      title: String(n.title || ''),
      author: n.authorName || n.author || undefined,
      slug: String(n.slug || ''),
      url: `${SITE_ORIGIN}/novels/${encodeURIComponent(String(n.slug || ''))}`,
    }));
  }
  if (type === 'authors') {
    const authors = await listAuthors();
    const filtered = q
      ? (authors as any[]).filter((a) => String(a.name || '').includes(q) || String(a.slug || '').includes(q))
      : (authors as any[]);
    return filtered.slice(0, 8).map((a) => ({
      kind: 'author' as const,
      name: String(a.name || ''),
      slug: String(a.slug || ''),
      url: `${SITE_ORIGIN}/authors/${encodeURIComponent(String(a.slug || ''))}`,
    }));
  }
  if (type === 'genres') {
    const genres = await listGenres();
    const filtered = q
      ? (genres as any[]).filter((g) => String(g.name || '').includes(q) || String(g.slug || '').includes(q))
      : (genres as any[]);
    return filtered.slice(0, 12).map((g) => ({
      kind: 'genre' as const,
      name: String(g.name || ''),
      slug: String(g.slug || ''),
      url: `${SITE_ORIGIN}/genres/${encodeURIComponent(String(g.slug || ''))}`,
    }));
  }
  const articles = await listPublishedArticles(24, 0);
  const filtered = q
    ? articles.filter((a) => a.title.includes(q) || (a.excerpt || '').includes(q) || (a.tags || '').includes(q))
    : articles;
  return filtered.slice(0, 8).map((a) => ({
    kind: 'article' as const,
    title: a.title,
    slug: a.slug,
    url: `${SITE_ORIGIN}/articles/${encodeURIComponent(a.slug)}`,
  }));
}

export function formatHits(hits: SearchHit[]): { text: string; keyboard: { text: string; url: string }[][] } {
  if (!hits.length) {
    return {
      text: 'لم أجد نتائج مطابقة على 𝐄𝟳𝐤𝐞𝐭𝐡𝐚.\nجرّب كلمات أخرى أو تصفح الموقع مباشرة.',
      keyboard: [[{ text: '🌐 فتح E7ketha', url: SITE_ORIGIN }]],
    };
  }
  const lines: string[] = [];
  const keyboard: { text: string; url: string }[][] = [];
  for (const h of hits) {
    if (h.kind === 'novel') {
      lines.push(`📖 <b>${escapeHtml(h.title)}</b>${h.author ? `\n✍️ ${escapeHtml(h.author)}` : ''}`);
      keyboard.push([{ text: `📚 ${truncate(h.title, 28)}`, url: h.url }]);
    } else if (h.kind === 'author') {
      lines.push(`✍️ <b>${escapeHtml(h.name)}</b>`);
      keyboard.push([{ text: `✍️ ${truncate(h.name, 28)}`, url: h.url }]);
    } else if (h.kind === 'genre') {
      lines.push(`🏷️ <b>${escapeHtml(h.name)}</b>`);
      keyboard.push([{ text: `🏷️ ${truncate(h.name, 28)}`, url: h.url }]);
    } else {
      lines.push(`📰 <b>${escapeHtml(h.title)}</b>`);
      keyboard.push([{ text: `📰 ${truncate(h.title, 28)}`, url: h.url }]);
    }
  }
  keyboard.push([{ text: '🌐 الموقع', url: SITE_ORIGIN }]);
  return { text: lines.join('\n\n'), keyboard };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length <= n ? t : t.slice(0, n - 1) + '…';
}
