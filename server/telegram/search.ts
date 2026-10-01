import { searchNovels, listAuthors, listGenres } from '../db';
import { listPublishedArticles } from '../articles';
import { SITE_ORIGIN } from './config';
import type { InlineKeyboardButton } from './api';

export const PAGE_SIZE = 8;

export type SearchHit =
  | { kind: 'novel'; title: string; author?: string; slug: string; url: string; rating?: number }
  | { kind: 'author'; name: string; slug: string; url: string }
  | { kind: 'genre'; name: string; slug: string; url: string }
  | { kind: 'article'; title: string; slug: string; url: string };

export type Intent =
  | { type: 'novels'; q: string }
  | { type: 'authors'; q: string }
  | { type: 'genres'; q: string }
  | { type: 'articles'; q: string }
  | { type: 'help' }
  | { type: 'menu' }
  | { type: 'browse' };

export function detectIntent(text: string): Intent {
  const t = text.trim();

  if (/^(مساعدة|help|\/help|الأوامر|اوامر|قائمة الأوامر)/i.test(t)) return { type: 'help' };
  if (/^(القائمة|menu|\/menu)/i.test(t)) return { type: 'menu' };
  if (/^(كل الروايات|جميع الروايات|تصفح|\/browse)/i.test(t) || t === '📚 الروايات') {
    return { type: 'browse' };
  }

  if (/(مؤلف|مؤلفين|كاتب|كتّاب)/.test(t) || /^\/authors\b/i.test(t) || t === '✍️ المؤلفون') {
    const q = t
      .replace(/^\/authors\b/i, '')
      .replace(/مؤلفين?|كاتب|كتّاب|✍️ المؤلفون/g, '')
      .trim();
    return { type: 'authors', q };
  }
  if (/(تصنيف|تصنيفات|نوع|أنواع)/.test(t) || /^\/genres\b/i.test(t) || t === '🏷️ التصنيفات') {
    const q = t
      .replace(/^\/genres\b/i, '')
      .replace(/تصنيفات?|أنواع?|🏷️ التصنيفات/g, '')
      .trim();
    return { type: 'genres', q };
  }
  if (/(مقال|مقالات|مقالة)/.test(t) || /^\/articles\b/i.test(t) || t === '📰 مقالات') {
    const q = t
      .replace(/^\/articles\b/i, '')
      .replace(/مقالات?|مقالة|📰 مقالات/g, '')
      .trim();
    return { type: 'articles', q };
  }
  if (/^\/novels\b/i.test(t) || t === '🔍 بحث') {
    return { type: 'novels', q: t.replace(/^\/novels\b/i, '').replace(/🔍 بحث/g, '').trim() };
  }
  return { type: 'novels', q: t.replace(/روايات?|كتب|كتاب/g, '').trim() || t };
}

export async function searchE7ketha(type: Intent['type'], q: string): Promise<SearchHit[]> {
  if (type === 'help' || type === 'menu' || type === 'browse') return [];

  if (type === 'novels') {
    const rows = await searchNovels({ q: q || undefined, limit: 24, sort: 'popular' });
    return (rows as any[]).slice(0, 16).map((n) => ({
      kind: 'novel' as const,
      title: String(n.title || ''),
      author: n.authorName || n.author || undefined,
      slug: String(n.slug || ''),
      url: `${SITE_ORIGIN}/books/${encodeURIComponent(String(n.slug || ''))}`,
      rating: typeof n.rating === 'number' ? n.rating : undefined,
    }));
  }
  if (type === 'authors') {
    const authors = await listAuthors();
    const filtered = q
      ? (authors as any[]).filter(
          (a) => String(a.name || '').includes(q) || String(a.slug || '').includes(q),
        )
      : (authors as any[]);
    return filtered.slice(0, 12).map((a) => ({
      kind: 'author' as const,
      name: String(a.name || ''),
      slug: String(a.slug || ''),
      url: `${SITE_ORIGIN}/authors/${encodeURIComponent(String(a.slug || ''))}`,
    }));
  }
  if (type === 'genres') {
    const genres = await listGenres();
    const filtered = q
      ? (genres as any[]).filter(
          (g) => String(g.name || '').includes(q) || String(g.slug || '').includes(q),
        )
      : (genres as any[]);
    return filtered.slice(0, 16).map((g) => ({
      kind: 'genre' as const,
      name: String(g.name || ''),
      slug: String(g.slug || ''),
      url: `${SITE_ORIGIN}/genres/${encodeURIComponent(String(g.slug || ''))}`,
    }));
  }
  const articles = await listPublishedArticles(40, 0);
  const filtered = q
    ? articles.filter(
        (a) => a.title.includes(q) || (a.excerpt || '').includes(q) || (a.tags || '').includes(q),
      )
    : articles;
  return filtered.slice(0, 12).map((a) => ({
    kind: 'article' as const,
    title: a.title,
    slug: a.slug,
    url: `${SITE_ORIGIN}/articles/${encodeURIComponent(a.slug)}`,
  }));
}

export async function megaSearch(q: string): Promise<SearchHit[]> {
  const query = q.trim();
  if (!query) return searchE7ketha('novels', '');
  const [novels, authors, genres] = await Promise.all([
    searchE7ketha('novels', query),
    searchE7ketha('authors', query),
    searchE7ketha('genres', query),
  ]);
  return [...novels.slice(0, 10), ...authors.slice(0, 4), ...genres.slice(0, 4)];
}

export async function listNovelsPage(page: number): Promise<{
  hits: SearchHit[];
  page: number;
  totalPages: number;
  total: number;
}> {
  const rows = await searchNovels({ limit: 100, sort: 'title' });
  const all = (rows as any[]).map((n) => ({
    kind: 'novel' as const,
    title: String(n.title || ''),
    author: n.authorName || n.author || undefined,
    slug: String(n.slug || ''),
    url: `${SITE_ORIGIN}/books/${encodeURIComponent(String(n.slug || ''))}`,
    rating: typeof n.rating === 'number' ? n.rating : undefined,
  }));
  const total = all.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const p = Math.min(Math.max(page, 0), totalPages - 1);
  const hits = all.slice(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE);
  return { hits, page: p, totalPages, total };
}

export function formatHits(
  hits: SearchHit[],
  opts?: { title?: string; page?: number; totalPages?: number; total?: number },
): { text: string; keyboard: InlineKeyboardButton[][] } {
  if (!hits.length) {
    return {
      text: 'لم أجد نتائج مطابقة على 𝐄𝟳𝐤𝐞𝐭𝐡𝐚.\nجرّب كلمات أخرى أو /novels لتصفح المكتبة.',
      keyboard: [
        [{ text: '📚 كل الروايات', callback_data: 'novels:0' }],
        [{ text: '🌐 فتح الموقع', url: SITE_ORIGIN }],
      ],
    };
  }

  const lines: string[] = [];
  if (opts?.title) lines.push(`<b>${escapeHtml(opts.title)}</b>`);
  if (opts?.total != null) {
    lines.push(
      `عرض ${hits.length} من أصل ${opts.total}${opts.totalPages && opts.totalPages > 1 ? ` · صفحة ${(opts.page ?? 0) + 1}/${opts.totalPages}` : ''}`,
    );
    lines.push('');
  }

  const keyboard: InlineKeyboardButton[][] = [];

  for (const h of hits) {
    if (h.kind === 'novel') {
      const star =
        h.rating != null && h.rating > 0
          ? ` ⭐${(h.rating > 10 ? h.rating / 100 : h.rating).toFixed(1)}`
          : '';
      lines.push(
        `📖 <b>${escapeHtml(h.title)}</b>${h.author ? `\n   ✍️ ${escapeHtml(h.author)}` : ''}${star}`,
      );
      keyboard.push([{ text: `📚 ${truncate(h.title, 32)}`, url: h.url }]);
    } else if (h.kind === 'author') {
      lines.push(`✍️ <b>${escapeHtml(h.name)}</b>`);
      keyboard.push([{ text: `✍️ ${truncate(h.name, 32)}`, url: h.url }]);
    } else if (h.kind === 'genre') {
      lines.push(`🏷️ <b>${escapeHtml(h.name)}</b>`);
      keyboard.push([{ text: `🏷️ ${truncate(h.name, 32)}`, url: h.url }]);
    } else {
      lines.push(`📰 <b>${escapeHtml(h.title)}</b>`);
      keyboard.push([{ text: `📰 ${truncate(h.title, 32)}`, url: h.url }]);
    }
  }

  if (opts?.totalPages && opts.totalPages > 1 && opts.page != null) {
    const nav: InlineKeyboardButton[] = [];
    if (opts.page > 0) nav.push({ text: '⬅️ السابق', callback_data: `novels:${opts.page - 1}` });
    nav.push({ text: `${opts.page + 1}/${opts.totalPages}`, callback_data: 'noop' });
    if (opts.page < opts.totalPages - 1)
      nav.push({ text: 'التالي ➡️', callback_data: `novels:${opts.page + 1}` });
    keyboard.push(nav);
  }

  keyboard.push([{ text: '🌐 الموقع', url: SITE_ORIGIN }]);
  return { text: lines.join('\n'), keyboard };
}

export function mainReplyKeyboard() {
  return {
    keyboard: [
      [{ text: '📚 الروايات' }, { text: '🔍 بحث' }],
      [{ text: '✍️ المؤلفون' }, { text: '🏷️ التصنيفات' }],
      [{ text: '📰 مقالات' }, { text: '❓ مساعدة' }],
    ],
    resize_keyboard: true,
    is_persistent: true,
  };
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
