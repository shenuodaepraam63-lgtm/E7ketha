/**
 * Dynamic SSR for published article pages (/articles/:slug).
 */
import fs from 'node:fs';
import path from 'node:path';
import { getPublishedArticleBySlug } from './articles';

const SITE_URL = 'https://e7ketha.com';
const SITE_NAME = '𝐄𝟳𝐤𝐞𝐭𝐡𝐚';

function escapeHtml(value: string) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readTemplate(): string {
  const candidates = [
    path.join(process.cwd(), 'dist/public/spa-shell.html'),
    path.join(process.cwd(), 'client/index.html'),
    path.join(process.cwd(), 'index.html'),
  ];
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
    } catch {
      /* continue */
    }
  }
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>${SITE_NAME}</title></head><body><div id="root"></div></body></html>`;
}


function renderArticleContent(content: string) {
  const text = String(content ?? '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|section|article|h[1-6]|li|blockquote|pre)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const paragraphs = text
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('');

  return paragraphs || `<p>${escapeHtml(content)}</p>`;
}

function normalizePath(raw: string): string {
  try {
    const u = raw.startsWith('http') ? new URL(raw) : new URL(raw, SITE_URL);
    let p = u.pathname || '/';
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return p || '/';
  } catch {
    return '/';
  }
}

export async function tryRenderArticleSeo(req: any, res: any): Promise<boolean> {
  const method = String(req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return false;

  let pathname = '';
  const q = req.query || {};
  if (q.resource === 'seo' && typeof q.path === 'string') {
    pathname = normalizePath(q.path);
  } else if (typeof req.url === 'string') {
    pathname = normalizePath(req.url.split('?')[0] || '/');
  }

  const match = pathname.match(/^\/articles\/([^/]+)$/);
  if (!match) return false;

  let slug = match[1];
  try {
    slug = decodeURIComponent(slug);
  } catch {
    /* keep */
  }

  try {
    const article = await getPublishedArticleBySlug(slug);
    if (!article) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Robots-Tag', 'noindex');
      const title = `المقال غير موجود | ${SITE_NAME}`;
      const html = readTemplate()
        .replace(/<title>[\s\S]*?<\/title>/gi, `<title>${escapeHtml(title)}</title>`)
        .replace(
          '<div id="root"></div>',
          `<div id="root"><main lang="ar" dir="rtl"><h1>المقال غير موجود</h1><p><a href="${SITE_URL}/articles">كل المقالات</a></p></main></div>`,
        );
      res.end(html);
      return true;
    }

    const title = (article.seoTitle || `${article.title} | ${SITE_NAME}`).slice(0, 120);
    const description = (
      article.seoDescription ||
      article.excerpt ||
      article.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ||
      `مقال: ${article.title} على منصة اكتشاف الروايات العربية.`
    )
      .slice(0, 160)
      .trim();

    const canonicalUrl = `${SITE_URL}/articles/${encodeURIComponent(article.slug)}`;
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description,
      inLanguage: 'ar',
      url: canonicalUrl,
      datePublished: article.publishedAt || article.createdAt,
      dateModified: article.updatedAt,
      author: article.authorName
        ? { '@type': 'Person', name: article.authorName }
        : { '@type': 'Organization', name: SITE_NAME },
      publisher: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
      ...(article.coverUrl ? { image: article.coverUrl } : {}),
    };

    const head = [
      `<title>${escapeHtml(title)}</title>`,
      `<meta name="description" content="${escapeHtml(description)}">`,
      `<meta name="robots" content="index,follow">`,
      `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`,
      `<meta property="og:type" content="article">`,
      `<meta property="og:title" content="${escapeHtml(title)}">`,
      `<meta property="og:description" content="${escapeHtml(description)}">`,
      `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`,
      `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
      article.coverUrl ? `<meta property="og:image" content="${escapeHtml(article.coverUrl)}">` : '',
      `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
    ]
      .filter(Boolean)
      .join('');

    const articleContent = renderArticleContent(article.content);
    const excerptHtml = article.excerpt ? `<p class="article-excerpt">${escapeHtml(article.excerpt)}</p>` : '';
    const body = `<main lang="ar" dir="rtl"><nav aria-label="مسار التنقل"><a href="${SITE_URL}/">الرئيسية</a> · <a href="${SITE_URL}/articles">المقالات</a></nav><article><h1>${escapeHtml(article.title)}</h1>${excerptHtml}<div class="article-content">${articleContent}</div><p><a href="${SITE_URL}/articles">كل المقالات</a></p></article></main>`;

    const html = readTemplate()
      .replace(/<title>[\s\S]*?<\/title>/gi, '')
      .replace(/<meta[^>]+(?:name|property)=["'](?:description|robots|twitter:[^"']+|og:[^"']+)["'][^>]*>/gi, '')
      .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
      .replace(/<script[^>]+type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi, '')
      .replace('</head>', `${head}</head>`)
      .replace('<div id="root"></div>', `<div id="root">${body}</div>`);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    res.end(html);
    return true;
  } catch (e) {
    console.error('[seo] article render failed', slug, e);
    return false;
  }
}
