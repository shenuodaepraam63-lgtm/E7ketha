/**
 * Expanded sitemap index + static / articles / topics sitemaps.
 * Intercepts before the packed app handler.
 */
import { listNovels, listAuthors, listGenres, listSeries } from './db';
import { listQuotes } from './quotes';
import { listPublishedArticles } from './articles';

const SITE_URL = 'https://e7ketha.com';

const INDEX_FILES = [
  'static',
  'novels',
  'authors',
  'genres',
  'series',
  'quotes',
  'articles',
  'topics',
] as const;

const TOPICAL = [
  'arabic-novels',
  'horror-novels',
  'fantasy-novels',
  'egyptian-literature',
];

function xmlEscape(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function renderUrlset(paths: string[]) {
  const unique = Array.from(new Set(paths));
  const body = unique
    .map((urlPath) => {
      const priority = urlPath === '/' ? '1.0' : urlPath.startsWith('/quotes/') ? '0.8' : '0.7';
      const changefreq = urlPath === '/' ? 'daily' : 'weekly';
      return `<url><loc>${xmlEscape(`${SITE_URL}${urlPath}`)}</loc><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

function renderIndex() {
  const body = INDEX_FILES.map(
    (file) => `<sitemap><loc>${SITE_URL}/sitemap/${file}.xml</loc></sitemap>`,
  ).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

function quoteCategorySlug(value: string) {
  return encodeURIComponent(value.trim().toLowerCase()).replace(/%20/g, '-');
}

function sendXml(res: any, xml: string) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  res.end(xml);
}

function resolveResource(req: any): string | null {
  const q = req.query || {};
  if (typeof q.resource === 'string' && q.resource) {
    if (q.resource === 'sitemap' || q.resource === 'index') return 'index';
    return q.resource;
  }
  const url = String(req.url || '').split('?')[0];
  if (url === '/sitemap.xml' || url.endsWith('/sitemap.xml')) return 'index';
  const m = url.match(/\/sitemap\/([a-z0-9-]+)\.xml$/i);
  if (m) return m[1];
  return null;
}

export async function tryRenderExpandedSitemap(req: any, res: any): Promise<boolean> {
  const method = String(req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return false;

  const resource = resolveResource(req);
  if (!resource) return false;

  try {
    if (resource === 'index') {
      sendXml(res, renderIndex());
      return true;
    }

    if (resource === 'static') {
      sendXml(
        res,
        renderUrlset([
          '/',
          '/explore',
          '/discover',
          '/articles',
          '/topics',
          '/quotes',
          '/quotes/categories',
          '/about',
          '/how-it-works',
          '/faq',
          '/contact',
          '/privacy',
          '/terms',
        ]),
      );
      return true;
    }

    if (resource === 'topics') {
      sendXml(res, renderUrlset(['/topics', ...TOPICAL.map((s) => `/topics/${s}`)]));
      return true;
    }

    if (resource === 'articles') {
      let articles: Array<{ slug: string }> = [];
      try {
        articles = await listPublishedArticles(5000, 0);
      } catch (e) {
        console.error('[sitemap] articles list failed', e);
      }
      sendXml(res, renderUrlset(['/articles', ...articles.map((a) => `/articles/${a.slug}`)]));
      return true;
    }

    const [novels, authors, genres, seriesList, quotes] = await Promise.all([
      listNovels(10000),
      listAuthors(),
      listGenres(),
      listSeries(),
      listQuotes(true),
    ]);
    const quoteCategories = Array.from(
      new Set(quotes.map((item) => item.category).filter((c): c is string => Boolean(c?.trim()))),
    );
    const categoryQuotePaths = quoteCategories.map((c) => `/quotes/category/${quoteCategorySlug(c)}`);
    const bookQuotePaths = novels.map((n) => `/books/${n.slug}/quotes`);
    const authorQuotePaths = authors.map((a) => `/authors/${a.slug}/quotes`);

    if (resource === 'novels') {
      sendXml(res, renderUrlset([...novels.map((n) => `/books/${n.slug}`), ...bookQuotePaths]));
      return true;
    }
    if (resource === 'authors') {
      sendXml(res, renderUrlset([...authors.map((a) => `/authors/${a.slug}`), ...authorQuotePaths]));
      return true;
    }
    if (resource === 'genres') {
      sendXml(res, renderUrlset(genres.map((g) => `/genres/${g.slug}`)));
      return true;
    }
    if (resource === 'series') {
      sendXml(res, renderUrlset(seriesList.map((s) => `/series/${s.slug}`)));
      return true;
    }
    if (resource === 'quotes') {
      sendXml(
        res,
        renderUrlset([
          '/quotes',
          '/quotes/categories',
          ...categoryQuotePaths,
          ...quotes.map((q) => `/quotes/${q.id}`),
        ]),
      );
      return true;
    }

    return false;
  } catch (error) {
    console.error('[sitemap] expanded render failed', error);
    sendXml(
      res,
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url></urlset>`,
    );
    return true;
  }
}
