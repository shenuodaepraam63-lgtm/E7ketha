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
  return String(value ?? "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """).replace(/'/g, "'");
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
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ '&': '&', '<': '<', '>': '>', "'": '&#39;', '"': '"' })[character] ?? character);
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
    return renderSeoDocument(readClientTemplate(), { title: 'رِواية — اكتشف روايتك القادمة', description: 'رِواية — منصة اكتشاف الروايات العربية. ابحث عن روايتك القادمة واستكشف المؤلفين والتصنيفات والاقتباسات.', canonical: `${origin}/`, jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: 'رِواية', url: `${origin}/`, description: 'منصة اكتشاف الروايات العربية', inLanguage: 'ar', potentialAction: { '@type': 'SearchAction', target: `${origin}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }, content: renderHomepageShell(novels) });
  }
  return null;
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  return app;
}
