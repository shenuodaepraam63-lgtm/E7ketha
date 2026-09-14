import express from "express";
import fs from "node:fs";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { getAuthorBySlug, getGenreBySlug, getNovelBySlug, getSeriesBySlug, listAuthors, listGenres, listNovels, listSeries } from "./db";
import { getQuote, listQuotes, listQuotesByCategory } from "./quotes";

const SITE_URL = "https://e7ketha.vercel.app";
function xmlEscape(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function renderUrlset(paths: string[]) {
  const uniquePaths = Array.from(new Set(paths));
  const body = uniquePaths.map((urlPath) => `<url><loc>${xmlEscape(`${SITE_URL}${urlPath}`)}</loc><changefreq>${urlPath === "/" ? "daily" : "weekly"}</changefreq><priority>${urlPath === "/" ? "1.0" : "0.7"}</priority></url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}
function renderSitemapIndex() {
  const files = ["novels", "authors", "genres", "series", "quotes"];
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${files.map((file) => `<sitemap><loc>${SITE_URL}/sitemap/${file}.xml</loc></sitemap>`).join("")}</sitemapindex>`;
}
function quoteCategorySlug(value: string) { return encodeURIComponent(value.trim().toLowerCase()).replace(/%20/g, "-"); }

function htmlEscape(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function stripHtml(value: unknown, max = 180) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function readClientTemplate() {
  const candidates = [
    path.resolve(process.cwd(), 'dist/public/index.html'),
    path.resolve(import.meta.dirname, 'public/index.html'),
    path.resolve(import.meta.dirname, '../../client/index.html'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
  }
  return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>رِواية</title></head><body><div id="root"></div></body></html>';
}

function renderSeoDocument(template: string, input: { title: string; description: string; canonical: string; type?: string; image?: string; jsonLd: unknown; content: string; status?: number }) {
  const head = `<title>${htmlEscape(input.title)}</title><meta name="description" content="${htmlEscape(input.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${htmlEscape(input.canonical)}"><meta property="og:type" content="${htmlEscape(input.type ?? 'website')}"><meta property="og:title" content="${htmlEscape(input.title)}"><meta property="og:description" content="${htmlEscape(input.description)}"><meta property="og:url" content="${htmlEscape(input.canonical)}">${input.image ? `<meta property="og:image" content="${htmlEscape(input.image)}">` : ''}<script type="application/ld+json">${JSON.stringify(input.jsonLd).replace(/</g, '\\u003c')}</script>`;
  const cleanTemplate = template
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+(?:name|property)=["'](?:description|robots|twitter:[^"']+|og:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script[^>]+type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi, '');
  const withContent = cleanTemplate.replace('</head>', `${head}</head>`).replace('<div id="root"></div>', `<div id="root">${input.content}</div>`);
  return { html: withContent, status: input.status ?? 200 };
}

function renderHomepageShell(novels: Array<{ slug: string; title: string; author?: string | null }>) {
  const novelItems = novels.slice(0, 5).map((novel) => `<li><a href="${SITE_URL}/books/${htmlEscape(novel.slug)}">${htmlEscape(novel.title)}</a>${novel.author ? ` — ${htmlEscape(novel.author)}` : ''}</li>`).join('');
  return `<div dir="rtl" class="min-h-screen overflow-x-hidden"><header class="sticky top-0 z-40 border-b border-border/70 bg-background/85"><div class="container flex h-[72px] items-center justify-between"><a href="/" aria-label="رِواية">رِواية</a><nav aria-label="التنقل الرئيسي"><a href="/explore">استكشف</a> <a href="/quotes">اقتباسات</a> <a href="/authors/ahmed-khaled-tawfik">المؤلفون</a></nav><a href="/login">تسجيل الدخول</a></div></header><main class="page-transition"><div><section class="relative z-20 overflow-visible bg-[#091027] text-white"><div class="container relative z-30 grid min-h-[570px] items-center py-20"><div class="order-1 max-w-[590px]"><div class="mb-6">مساحة أهدأ لاكتشاف ما يستحق القراءة</div><h1 class="max-w-[650px] text-[43px] font-extrabold leading-[1.18]">اكتشف روايتك<br><span>القادمة.</span></h1><p class="mt-6 max-w-[490px] text-base leading-8 text-white/65">ابحث واستكشف مكتبة رواية الحية من أول فكرة لحد آخر صفحة.</p><div class="relative z-[60] mt-9 max-w-[610px]"><a href="/search">ابحث عن رواية</a></div></div></div></section><main class="relative z-0 container py-16"><section><h2>الروايات التي يتكلم عنها القرّاء</h2><div><ul>${novelItems}</ul></div></section><section class="mt-20"><h2>استكشف حسب مزاجك</h2><div></div></section><section class="mt-20"><h2>مؤلفون يستحقون الاكتشاف</h2><div></div></section><section class="mt-24"><h2>ربما تعجبك هذه الروايات</h2><div></div></section><section class="mt-20"><h2>السلاسل الأكثر متابعة</h2><div></div></section></main></div></main><footer class="mt-24 border-t border-border bg-card/55"><div class="container grid gap-10 py-14"><div><strong>رِواية.</strong><p>رِواية تساعدك تفهم عالم الروايات العربية، وتلاقي ما يستحق وقتك.</p></div><nav><a href="/about">عن رِواية</a> <a href="/contact">تواصل معنا</a> <a href="/privacy">سياسة الخصوصية</a></nav></div></footer><nav aria-label="التنقل السفلي"></nav></div>`;
}

async function renderPublicSeo(pathname: string) {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const origin = SITE_URL;
  if (normalized === '/') {
    const novels = await listNovels(10);
    const novelLinks = novels.map((novel) => `<li><a href="${origin}/books/${htmlEscape(novel.slug)}">${htmlEscape(novel.title)}</a>${novel.author ? ` — ${htmlEscape(novel.author)}` : ''}</li>`).join('');
    return renderSeoDocument(readClientTemplate(), { title: 'رِواية — اكتشف روايتك القادمة', description: 'رِواية — منصة اكتشاف الروايات العربية. ابحث عن روايتك القادمة واستكشف المؤلفين والتصنيفات والاقتباسات.', canonical: `${origin}/`, jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'رِواية', url: `${origin}/`, description: 'منصة اكتشاف الروايات العربية', inLanguage: 'ar', potentialAction: { '@type': 'SearchAction', target: `${origin}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }, content: renderHomepageShell(novels) });
  }

  if (/^\/(?:books|novel|novels)\/[^/]+$/.test(normalized)) {
    const slug = decodeURIComponent(normalized.split('/').pop() ?? '');
    const novel = await getNovelBySlug(slug);
    if (!novel) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>الرواية غير موجودة | رِواية</title></head><body><h1>الرواية غير موجودة</h1></body></html>', status: 404 };
    const description = `${novel.title} للكاتب ${novel.author}. ${stripHtml(novel.description || 'اكتشف تفاصيل الرواية وتقييم القراء على منصة رِواية.')}`;
    const canonical = `${origin}/books/${encodeURIComponent(String(novel.slug))}`;
    const authorUrl = `${origin}/authors/${encodeURIComponent(String(novel.authorSlug))}`;
    return renderSeoDocument(readClientTemplate(), {
      title: `${novel.title} — ${novel.author} | رِواية`, description, canonical, type: 'book', image: novel.coverUrl ?? undefined,
      jsonLd: { '@context': 'https://schema.org', '@type': 'Book', name: novel.title, description, image: novel.coverUrl || undefined, inLanguage: novel.language || 'ar', author: { '@type': 'Person', name: novel.author, url: authorUrl }, url: canonical },
      content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/authors/${htmlEscape(novel.authorSlug)}">${htmlEscape(novel.author)}</a></nav><article><h1>${htmlEscape(novel.title)}</h1><p><a href="${authorUrl}">${htmlEscape(novel.author)}</a></p><p>${htmlEscape(novel.description || '')}</p><p>اللغة: ${htmlEscape(novel.language === 'ar' ? 'العربية' : novel.language || '')} · الأجزاء: ${htmlEscape(novel.parts)}</p><a href="${origin}/books/${htmlEscape(novel.slug)}/quotes">اقتباسات الكتاب</a>${novel.links?.length ? `<aside><h2>تنبيه بشأن الروابط الخارجية</h2><p>قد تحتوي بعض صفحات المنصة على روابط تؤدي إلى مواقع إلكترونية خارجية لا نديرها ولا نتحكم في محتواها أو سياساتها.</p><p>نحن لا نستضيف الملفات الموجودة على المواقع الخارجية، ولا نتحمل مسؤولية محتوى أو توفر أو سياسات تلك المواقع.</p><p>إذا كنت صاحب حقوق نشر لأي محتوى مرتبط من خلال المنصة وترى أن الرابط ينتهك حقوقك، يُرجى التواصل معنا عبر صفحة التواصل وحقوق الملكية الفكرية لمراجعة الرابط واتخاذ الإجراء المناسب.</p><p><strong>ملاحظة:</strong> إدراج رابط خارجي لا يعني بالضرورة أن المنصة تملك أو تدّعي ملكية المحتوى الموجود في الموقع الخارجي.</p></aside>` : ''}</article></main>`,
    });
  }

  if (/^\/authors\/[^/]+$/.test(normalized)) {
    const slug = decodeURIComponent(normalized.split('/').pop() ?? '');
    const author = await getAuthorBySlug(slug);
    if (!author) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>المؤلف غير موجود | رِواية</title></head><body><h1>المؤلف غير موجود</h1></body></html>', status: 404 };
    const description = `${author.name} — مؤلف ورواياته على منصة رِواية. ${stripHtml(author.bio || '')}`.slice(0, 180);
    const canonical = `${origin}/authors/${encodeURIComponent(author.slug)}`;
    return renderSeoDocument(readClientTemplate(), { title: `${author.name} — روايات واقتباسات | رِواية`, description, canonical, type: 'profile', jsonLd: { '@context': 'https://schema.org', '@type': 'Person', name: author.name, description, image: author.avatarUrl || undefined, url: canonical }, content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/explore">الروايات</a></nav><article><h1>${htmlEscape(author.name)}</h1><p>${htmlEscape(author.bio || '')}</p><a href="${origin}/authors/${htmlEscape(author.slug)}/quotes">اقتباسات ${htmlEscape(author.name)}</a></article></main>` });
  }

  if (/^\/genres\/[^/]+$/.test(normalized)) {
    const slug = decodeURIComponent(normalized.split('/').pop() ?? '');
    const genre = await getGenreBySlug(slug);
    if (!genre) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>التصنيف غير موجود | رِواية</title></head><body><h1>التصنيف غير موجود</h1></body></html>', status: 404 };
    const description = stripHtml(genre.description || `روايات تصنيف ${genre.name} على منصة رِواية.`);
    const canonical = `${origin}/genres/${encodeURIComponent(genre.slug)}`;
    return renderSeoDocument(readClientTemplate(), { title: `${genre.name} — روايات عربية | رِواية`, description, canonical, jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: genre.name, description, url: canonical }, content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/explore">استكشف</a></nav><article><h1>${htmlEscape(genre.name)}</h1><p>${htmlEscape(genre.description || '')}</p><a href="${origin}/explore">استكشف الروايات</a></article></main>` });
  }

  if (/^\/series\/[^/]+$/.test(normalized)) {
    const slug = decodeURIComponent(normalized.split('/').pop() ?? '');
    const selected = await getSeriesBySlug(slug);
    if (!selected) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>السلسلة غير موجودة | رِواية</title></head><body><h1>السلسلة غير موجودة</h1></body></html>', status: 404 };
    const description = stripHtml(selected.description || `سلسلة ${selected.title} والروايات المرتبطة بها على منصة رِواية.`);
    const canonical = `${origin}/series/${encodeURIComponent(selected.slug)}`;
    const books = (selected.books as Array<{ title: string; slug: string; author?: string | null }>).map((book) => `<li><a href="${origin}/books/${htmlEscape(book.slug)}">${htmlEscape(book.title)}</a>${book.author ? ` — ${htmlEscape(book.author)}` : ''}</li>`).join('');
    return renderSeoDocument(readClientTemplate(), { title: `${selected.title} — رِواية`, description, canonical, type: 'collection', image: selected.coverUrl ?? undefined, jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: selected.title, description, url: canonical }, content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/explore">استكشف</a></nav><article><h1>${htmlEscape(selected.title)}</h1><p>${htmlEscape(selected.description || '')}</p><h2>ترتيب القراءة</h2><ol>${books}</ol></article></main>` });
  }

  if (/^\/quotes\/\d+$/.test(normalized)) {
    const quote = await getQuote(Number(normalized.split('/').pop()));
    if (!quote) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>الاقتباس غير موجود | رِواية</title></head><body><h1>الاقتباس غير موجود</h1></body></html>', status: 404 };
    const description = stripHtml(quote.quote_text);
    const canonical = `${origin}/quotes/${quote.id}`;
    return renderSeoDocument(readClientTemplate(), { title: `اقتباس من ${quote.book_title || 'رواية'} | رِواية`, description, canonical, jsonLd: { '@context': 'https://schema.org', '@type': 'Quotation', text: quote.quote_text, author: quote.author_name ? { '@type': 'Person', name: quote.author_name } : undefined, isPartOf: quote.book_title ? { '@type': 'Book', name: quote.book_title } : undefined, url: canonical }, content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/quotes">الاقتباسات</a></nav><article><h1>اقتباس من ${htmlEscape(quote.book_title || 'رواية')}</h1><blockquote>${htmlEscape(quote.quote_text)}</blockquote>${quote.author_name ? `<p>— <a href="${origin}/authors/${htmlEscape(quote.author_slug || '')}">${htmlEscape(quote.author_name)}</a></p>` : ''}</article></main>` });
  }

  if (/^\/quotes\/category\/[^/]+$/.test(normalized)) {
    const slug = decodeURIComponent(normalized.split('/').pop() ?? '');
    const category = slug.replace(/-/g, ' ').trim();
    const quotes = await listQuotesByCategory(slug);
    if (!quotes.length) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>تصنيف الاقتباسات غير موجود | رِواية</title></head><body><h1>تصنيف الاقتباسات غير موجود</h1></body></html>', status: 404 };
    const description = `اقرأ أجمل الاقتباسات عن ${category} من كتاب ومؤلفين مختلفين في رِواية.`;
    const canonical = `${origin}/quotes/category/${encodeURIComponent(slug)}`;
    const quoteItems = quotes.slice(0, 50).map((quote) => `<li><blockquote>${htmlEscape(quote.quote_text)}</blockquote>${quote.author_slug ? `<a href="${origin}/authors/${htmlEscape(quote.author_slug)}">${htmlEscape(quote.author_name)}</a>` : ''}${quote.book_slug ? ` · <a href="${origin}/books/${htmlEscape(quote.book_slug)}">${htmlEscape(quote.book_title)}</a>` : ''}</li>`).join('');
    return renderSeoDocument(readClientTemplate(), { title: `اقتباسات ${category} | رِواية`, description, canonical, type: 'collection', jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `اقتباسات ${category}`, description, url: canonical }, content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/quotes">الاقتباسات</a></nav><article><h1>اقتباسات ${htmlEscape(category)}</h1><p>${htmlEscape(description)}</p><ul>${quoteItems}</ul></article></main>` });
  }
  return null;
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  const sitemapHandler = async (_req: express.Request, res: express.Response) => {
    try {
      const [novels, authors, genres, seriesList, quotes] = await Promise.all([listNovels(10000), listAuthors(), listGenres(), listSeries(), listQuotes(true)]);
      const quoteCategories = Array.from(new Set(quotes.map((item) => item.category).filter((category): category is string => Boolean(category?.trim()))));
      const authorQuotePaths = authors.map((item) => `/authors/${item.slug}/quotes`);
      const bookQuotePaths = novels.map((item) => `/books/${item.slug}/quotes`);
      const categoryQuotePaths = quoteCategories.map((category) => `/quotes/category/${quoteCategorySlug(category)}`);
      const staticPaths = ["/", "/explore", "/quotes", "/quotes/categories", "/discover", "/about", "/contact", "/privacy", "/login", "/register", "/search"];
      const paths = [
        ...staticPaths,
        ...novels.map((n) => `/books/${n.slug}`),
        ...authors.map((a) => `/authors/${a.slug}`),
        ...genres.map((g) => `/genres/${g.slug}`),
        ...seriesList.map((s) => `/series/${s.slug}`),
        ...quotes.map((q) => `/quotes/${q.id}`),
        ...authorQuotePaths,
        ...bookQuotePaths,
        ...categoryQuotePaths,
      ];
      res.type("application/xml").send(renderUrlset(paths));
    } catch (e) {
      console.error(e);
      res.status(500).send("sitemap error");
    }
  };
  const directSeoHandler = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      const result = await renderPublicSeo(req.path);
      if (!result) return next();
      res.status(result.status).type("html").send(result.html);
    } catch (error) {
      return next(error);
    }
  };
  app.get("/", (req, res, next) => req.query.resource === "sitemap" ? sitemapHandler(req, res) : directSeoHandler(req, res, next));
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  return app;
}
