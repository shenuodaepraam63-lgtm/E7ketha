import { searchNovels, listAuthors, listGenres } from '../db';
import { listPublishedArticles } from '../articles';
import { SITE_ORIGIN } from './config';

export type SearchHit =
  | { kind: 'novel'; title: string; author?: string; slug: string; url: string }
  | { kind: 'author'; name: string; slug: string; url: string }
  | { kind: 'genre'; name: string; slug: string; url: string }
  | { kind: 'article'; title: string; slug: string; url: string };

export type Intent =
  | { type: 'novels'; q: string }
  | { type: 'authors'; q: string }
  | { type: 'genres'; q: string }
  | { type: 'articles'; q: string }
  | { type: 'help' };

/** Lightweight Arabic-friendly intent detection (no external AI in V1). */
export function detectIntent(text: string): Intent {
  const t = text.trim();
  const lower = t.toLowerCase();

  if (/^(مساعدة|help|\/help)\b/i.test(t)) return { type: 'help', q: '' } as any;

  if (/(مؤلف|مؤلفين|كاتب|كتّاب|كتاب)/.test(t) || /^\/authors\b/i.test(t)) {
    const q = t
      .replace(/^\/authors\b/i, '')
      .replace(/مؤلفين?|كاتب|كتّاب|كتاب/g, '')
      .trim();
    return { type: 'authors', q };
  }
  if (/(تصنيف|تصنيفات|نوع|أنواع|جنس أدبي)/.test(t) || /^\/genres\b/i.test(t)) {
    const q = t
      .replace(/^\/genres\b/i, '')
      .replace(/تصنيفات?|أنواع?|جنس أدبي/g, '')
      .trim();
    return { type: 'genres', q };
  }
  if (/(مقال|مقالات|مقالة)/.test(t) || /^\/articles\b/i.test(t)) {
    const q = t
      .replace(/^\/articles\b/i, '')
      .replace(/مقالات?|مقالة/g, '')
      .trim();
    return { type: 'articles', q };
  }
  if (/^\/novels\b/i.test(t)) {
    return { type: 'novels', q: t.replace(/^\/novels\b/i, '').trim() };
  }
  // default: novels search
  return { type: 'novels', q: t.replace(/روايات?|كتب|كتاب/g, '').trim() || t };
}

export async function searchE7ketha(type: Intent['type'], q: string): Promise<SearchHit[]> {
  if (type === 'novels') {
    const rows = await searchNovels({ q: q || undefined, limit: 8, sort: 'popular' });
    return (rows as any[]).slice(0, 8).map((n) => ({
      kind: 'novel' as const,
      title: String(n.title || ''),
      author: n.authorName || n.author || undefined,
      slug: String(n.slug || ''),
      url: `${SITE_ORIGIN}/books/${encodeURIComponent(String(n.slug || ''))}`,
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

  for (const h of hits.slice(0, 8)) {
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

function truncate(s: string, n: number) {
  const t = s.trim();
  return t.length <= n ? t : t.slice(0, n - 1) + '…';
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
