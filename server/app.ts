import express from "express";
import fs from "node:fs";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { getAuthorBySlug, getGenreBySlug, getNovelBySlug, getSeriesBySlug, listAuthors, listGenres, listNovels, listSeries, searchNovels } from "./db";
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

function breadcrumbSchema(origin: string, items: Array<{ name: string; url: string }>) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: item.url })) };
}

function quoteKeywords(quote: { quote_text: string; author_name?: string | null; speaker?: string | null; book_title?: string | null; category?: string | null }) {
  const stopWords = new Set(['من', 'في', 'عن', 'على', 'إلى', 'الى', 'هذا', 'هذه', 'ذلك', 'تلك', 'الذي', 'التي', 'هو', 'هي', 'و', 'يا', 'the', 'and', 'of', 'in', 'to']);
  const terms = String(quote.quote_text || '').replace(/[“”"'،؛.!؟:()[\]{}]/g, ' ').split(/\s+/).map((term) => term.trim()).filter((term) => term.length >= 3 && !stopWords.has(term.toLowerCase()));
  return Array.from(new Set([
    'اقتباسات عربية', 'اقتباسات ملهمة', 'اقتباسات من الروايات', 'اقتباسات كتب',
    quote.author_name || quote.speaker || '', quote.book_title || '', quote.category || '', ...terms.slice(0, 8),
  ].filter(Boolean))).slice(0, 18);
}

const topicalPages = [
  { slug: 'arabic-novels', title: 'الروايات العربية', eyebrow: 'دليل القراءة العربي', description: 'دليل شامل لاكتشاف الروايات العربية، من الأعمال الاجتماعية والتاريخية إلى الخيال والرعب والفانتازيا.', intro: 'ابدأ من الخريطة العامة للرواية العربية، ثم انتقل إلى التصنيف أو المؤلف أو السلسلة أو الاقتباس الذي يناسب ذائقتك.', links: [['/explore', 'كل الروايات'], ['/genres/social', 'الروايات الاجتماعية'], ['/genres/historical', 'الروايات التاريخية'], ['/authors/amr-abdel-hamid', 'أعمال المؤلفين'], ['/series/zikola', 'السلاسل الروائية']] },
  { slug: 'horror-novels', title: 'روايات الرعب والغموض', eyebrow: 'أجواء مشوقة ومقلقة', description: 'استكشف روايات الرعب والغموض والقصص النفسية، وانتقل من التصنيف إلى الكتب والاقتباسات ذات الصلة.', intro: 'تصفح الرعب أولًا، ثم وسّع القراءة إلى الغموض والتشويق والروايات النفسية القريبة من هذا المزاج.', links: [['/genres/horror', 'روايات الرعب'], ['/genres/mystery', 'روايات الغموض'], ['/genres/suspense', 'روايات التشويق'], ['/genres/psychological', 'الروايات النفسية'], ['/quotes/categories', 'اقتباسات حسب الموضوع']] },
  { slug: 'fantasy-novels', title: 'روايات الخيال والفانتازيا', eyebrow: 'عوالم تتجاوز المألوف', description: 'دليل للروايات الفانتازية والخيال العلمي والخيال الرمزي، مع روابط مباشرة إلى التصنيفات والكتب والسلاسل.', intro: 'ابدأ بالفانتازيا، ثم انتقل إلى الخيال العلمي والرمزية والأعمال التي تبني عوالم وقوانين مختلفة.', links: [['/genres/fantasy', 'روايات الفانتازيا'], ['/genres/sci-fi', 'الخيال العلمي'], ['/genres/symbolic', 'الخيال والرمزية'], ['/genres/philosophical', 'الخيال الفلسفي'], ['/series/zikola', 'السلاسل المرتبطة']] },
  { slug: 'egyptian-literature', title: 'الأدب المصري والرواية الاجتماعية', eyebrow: 'المكان والذاكرة والمجتمع', description: 'مسار موضوعي لاكتشاف الروايات التي تقترب من المجتمع والهوية والتاريخ والتجربة المصرية عبر أعمال المؤلفين المتاحة.', intro: 'استخدم التصنيفات الاجتماعية والتاريخية، ثم افتح صفحات المؤلفين والاقتباسات للوصول إلى الأعمال المرتبطة.', links: [['/genres/social', 'الروايات الاجتماعية'], ['/genres/historical', 'الروايات التاريخية'], ['/authors/ahmed-khaled-tawfik', 'أعمال المؤلفين'], ['/quotes', 'اقتباسات الروايات'], ['/explore', 'استكشف المكتبة']] },
] as const;

function readClientTemplate() {
  const candidates = [
    path.resolve(process.cwd(), 'dist/public/index.html'),
    path.resolve(import.meta.dirname, 'public/index.html'),
    path.resolve(import.meta.dirname, '../../client/index.html'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
  }
  return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>𝐄𝟳𝐤𝐞𝐭𝐡𝐚</title></head><body><div id="root"></div></body></html>';
}

function renderSeoDocument(template: string, input: { title: string; description: string; canonical: string; type?: string; image?: string; keywords?: string[]; jsonLd: unknown; content: string; status?: number }) {
  const keywords = input.keywords?.length ? `<meta name="keywords" content="${htmlEscape(input.keywords.join(', '))}">` : '';
  const head = `<title>${htmlEscape(input.title)}</title><meta name="description" content="${htmlEscape(input.description)}"><meta name="robots" content="index,follow">${keywords}<link rel="canonical" href="${htmlEscape(input.canonical)}"><meta property="og:type" content="${htmlEscape(input.type ?? 'website')}"><meta property="og:title" content="${htmlEscape(input.title)}"><meta property="og:description" content="${htmlEscape(input.description)}"><meta property="og:url" content="${htmlEscape(input.canonical)}">${input.image ? `<meta property="og:image" content="${htmlEscape(input.image)}">` : ''}<script type="application/ld+json">${JSON.stringify(input.jsonLd).replace(/</g, '\\u003c')}</script>`;
  const cleanTemplate = template
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+(?:name|property)=["'](?:description|robots|keywords|twitter:[^"']+|og:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script[^>]+type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi, '');
  const withContent = cleanTemplate.replace('</head>', `${head}</head>`).replace('<div id="root"></div>', `<div id="root">${input.content}</div>`);
  return { html: withContent, status: input.status ?? 200 };
}

function renderHomepageShell(novels: Array<{ slug: string; title: string; author?: string | null }>) {
  const novelItems = novels.slice(0, 5).map((novel) => `<li><a href="${SITE_URL}/books/${htmlEscape(novel.slug)}">${htmlEscape(novel.title)}</a>${novel.author ? ` — ${htmlEscape(novel.author)}` : ''}</li>`).join('');
  return `<div dir="rtl" class="min-h-screen overflow-x-hidden"><header class="sticky top-0 z-40 border-b border-border/70 bg-background/85"><div class="container flex h-[72px] items-center justify-between"><a href="/" aria-label="𝐄𝟳𝐤𝐞𝐭𝐡𝐚">𝐄𝟳𝐤𝐞𝐭𝐡𝐚</a><nav aria-label="التنقل الرئيسي"><a href="/explore">استكشف</a> <a href="/quotes">اقتباسات</a> <a href="/authors/ahmed-khaled-tawfik">المؤلفون</a></nav><a href="/login">تسجيل الدخول</a></div></header><main class="page-transition"><div><section class="relative z-20 overflow-visible bg-[#091027] text-white"><div class="container relative z-30 grid min-h-[570px] items-center py-20"><div class="order-1 max-w-[590px]"><div class="mb-6">مساحة أهدأ لاكتشاف ما يستحق القراءة</div><h1 class="max-w-[650px] text-[43px] font-extrabold leading-[1.18]">اكتشف روايتك<br><span>القادمة.</span></h1><p class="mt-6 max-w-[490px] text-base leading-8 text-white/65">ابحث واستكشف مكتبة رواية الحية من أول فكرة لحد آخر صفحة.</p><div class="relative z-[60] mt-9 max-w-[610px]"><a href="/search">ابحث عن رواية</a></div></div></div></section><main class="relative z-0 container py-16"><section><h2>الروايات التي يتكلم عنها القرّاء</h2><div><ul>${novelItems}</ul></div></section><section class="mt-20"><h2>استكشف حسب مزاجك</h2><div></div></section><section class="mt-20"><h2>مؤلفون يستحقون الاكتشاف</h2><div></div></section><section class="mt-24"><h2>ربما تعجبك هذه الروايات</h2><div></div></section><section class="mt-20"><h2>السلاسل الأكثر متابعة</h2><div></div></section></main></div></main><footer class="mt-24 border-t border-border bg-card/55"><div class="container grid gap-10 py-14"><div><strong>𝐄𝟳𝐤𝐞𝐭𝐡𝐚.</strong><p>𝐄𝟳𝐤𝐞𝐭𝐡𝐚 تساعدك تفهم عالم الروايات العربية، وتلاقي ما يستحق وقتك.</p></div><nav><a href="/about">عن 𝐄𝟳𝐤𝐞𝐭𝐡𝐚</a> <a href="/contact">تواصل معنا</a> <a href="/privacy">سياسة الخصوصية</a></nav></div></footer><nav aria-label="التنقل السفلي"></nav></div>`;
}

async function renderPublicSeo(pathname: string) {
  const normalized = pathname.replace(/\/$/, '') || '/';
  const origin = SITE_URL;
  if (normalized === '/') {
    const novels = await listNovels(10);
    const novelLinks = novels.map((novel) => `<li><a href="${origin}/books/${htmlEscape(novel.slug)}">${htmlEscape(novel.title)}</a>${novel.author ? ` — ${htmlEscape(novel.author)}` : ''}</li>`).join('');
    return renderSeoDocument(readClientTemplate(), { title: '𝐄𝟳𝐤𝐞𝐭𝐡𝐚 📖 | كُـل رِوَايـة لَهـا حِڪَايـة ✍︎', description: '𝐄𝟳𝐤𝐞𝐭𝐡𝐚 — منصة اكتشاف الروايات العربية. ابحث عن روايتك القادمة واستكشف المؤلفين والتصنيفات والاقتباسات.', canonical: `${origin}/`, image: `${origin}/e7ketha-cover-wide.png`, jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: '𝐄𝟳𝐤𝐞𝐭𝐡𝐚', url: `${origin}/`, description: 'منصة اكتشاف الروايات العربية', inLanguage: 'ar', potentialAction: { '@type': 'SearchAction', target: `${origin}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }, content: renderHomepageShell(novels) });
  }

  if (normalized === '/topics' || /^\/topics\/[^/]+$/.test(normalized)) {
    const slug = normalized === '/topics' ? null : decodeURIComponent(normalized.split('/').pop() ?? '');
    const selected = slug ? topicalPages.find((topic) => topic.slug === slug) : null;
    if (slug && !selected) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>الموضوع غير موجود | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚</title></head><body><h1>الموضوع غير موجود</h1></body></html>', status: 404 };
    const canonical = `${origin}${selected ? `/topics/${selected.slug}` : '/topics'}`;
    const title = selected ? `${selected.title} | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚` : 'موضوعات الروايات العربية | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚';
    const description = selected?.description ?? 'مركز مترابط لاكتشاف الروايات العربية حسب الموضوع والتصنيف والمؤلف والسلسلة والاقتباس.';
    const cards = (selected ? selected.links : topicalPages.map((topic) => [`/topics/${topic.slug}`, topic.title] as const)).map(([href, label]) => `<li><a href="${origin}${href}">${htmlEscape(label)}</a></li>`).join('');
    const content = selected ? `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/topics">الموضوعات</a></nav><article><h1>${htmlEscape(selected.title)}</h1><p>${htmlEscape(selected.description)}</p><p>${htmlEscape(selected.intro)}</p><h2>المسارات المرتبطة</h2><ul>${cards}</ul><p><a href="${origin}/explore">استكشف الروايات</a> · <a href="${origin}/quotes">اقتباسات الروايات</a></p></article></main>` : `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a></nav><article><h1>اكتشف الروايات حسب الموضوع</h1><p>${htmlEscape(description)}</p><h2>الموضوعات الأساسية</h2><ul>${cards}</ul><p><a href="${origin}/explore">كل الروايات</a> · <a href="${origin}/quotes/categories">تصنيفات الاقتباسات</a></p></article></main>`;
    return renderSeoDocument(readClientTemplate(), { title, description, canonical, type: 'collection', jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: selected?.title ?? 'موضوعات الروايات العربية', description, url: canonical, inLanguage: 'ar', mainEntityOfPage: { '@type': 'WebPage', '@id': canonical } }, content });
  }

  if (/^\/(?:books|novel|novels)\/[^/]+$/.test(normalized)) {
    const slug = decodeURIComponent(normalized.split('/').pop() ?? '');
    const novel = await getNovelBySlug(slug);
    if (!novel) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>الرواية غير موجودة | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚</title></head><body><h1>الرواية غير موجودة</h1></body></html>', status: 404 };
    const description = `${novel.title} للكاتب ${novel.author}. ${stripHtml(novel.description || 'اكتشف تفاصيل الرواية وتقييم القراء على منصة 𝐄𝟳𝐤𝐞𝐭𝐡𝐚.')}`;
    const canonical = `${origin}/books/${encodeURIComponent(String(novel.slug))}`;
    const authorUrl = `${origin}/authors/${encodeURIComponent(String(novel.authorSlug))}`;
    return renderSeoDocument(readClientTemplate(), {
      title: `${novel.title} — ${novel.author} | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚`, description, canonical, type: 'book', image: novel.coverUrl ?? undefined,
      jsonLd: { '@context': 'https://schema.org', '@graph': [{ '@type': 'Book', '@id': `${canonical}#book`, name: novel.title, description, image: novel.coverUrl || undefined, inLanguage: novel.language || 'ar', author: { '@type': 'Person', '@id': `${authorUrl}#person`, name: novel.author, url: authorUrl }, mainEntityOfPage: { '@id': canonical }, url: canonical, potentialAction: { '@type': 'ReadAction', target: canonical } }, breadcrumbSchema(origin, [{ name: 'الرئيسية', url: `${origin}/` }, { name: 'الروايات', url: `${origin}/explore` }, { name: novel.title, url: canonical }]) ] },
      content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/authors/${htmlEscape(novel.authorSlug)}">${htmlEscape(novel.author)}</a></nav><article><h1>${htmlEscape(novel.title)}</h1><p><a href="${authorUrl}">${htmlEscape(novel.author)}</a></p><p>${htmlEscape(novel.description || '')}</p><p>اللغة: ${htmlEscape(novel.language === 'ar' ? 'العربية' : novel.language || '')} · الأجزاء: ${htmlEscape(novel.parts)}</p><a href="${origin}/books/${htmlEscape(novel.slug)}/quotes">اقتباسات الكتاب</a>${novel.links?.length ? `<aside><h2>تنبيه بشأن الروابط الخارجية</h2><p>قد تحتوي بعض صفحات المنصة على روابط تؤدي إلى مواقع إلكترونية خارجية لا نديرها ولا نتحكم في محتواها أو سياساتها.</p><p>نحن لا نستضيف الملفات الموجودة على المواقع الخارجية، ولا نتحمل مسؤولية محتوى أو توفر أو سياسات تلك المواقع.</p><p>إذا كنت صاحب حقوق نشر لأي محتوى مرتبط من خلال المنصة وترى أن الرابط ينتهك حقوقك، يُرجى التواصل معنا عبر صفحة التواصل وحقوق الملكية الفكرية لمراجعة الرابط واتخاذ الإجراء المناسب.</p><p><strong>ملاحظة:</strong> إدراج رابط خارجي لا يعني بالضرورة أن المنصة تملك أو تدّعي ملكية المحتوى الموجود في الموقع الخارجي.</p></aside>` : ''}</article></main>`,
    });
  }

  if (/^\/authors\/[^/]+$/.test(normalized)) {
    const slug = decodeURIComponent(normalized.split('/').pop() ?? '');
    const author = await getAuthorBySlug(slug);
    if (!author) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>المؤلف غير موجود | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚</title></head><body><h1>المؤلف غير موجود</h1></body></html>', status: 404 };
    const works = await searchNovels({ authorSlug: author.slug, sort: 'popular', limit: 50 });
    const description = `${author.name} — مؤلف ورواياته على منصة 𝐄𝟳𝐤𝐞𝐭𝐡𝐚. ${stripHtml(author.bio || '')}`.slice(0, 180);
    const canonical = `${origin}/authors/${encodeURIComponent(author.slug)}`;
    const workItems = works.map((work, index) => ({ '@type': 'ListItem', position: index + 1, item: { '@type': 'Book', '@id': `${origin}/books/${encodeURIComponent(work.slug)}#book`, name: work.title, url: `${origin}/books/${encodeURIComponent(work.slug)}`, author: { '@id': `${canonical}#person` } } }));
    const workLinks = works.slice(0, 12).map((work) => `<li><a href="${origin}/books/${htmlEscape(work.slug)}">${htmlEscape(work.title)}</a></li>`).join('');
    return renderSeoDocument(readClientTemplate(), { title: `${author.name} — روايات واقتباسات | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚`, description, canonical, type: 'profile', jsonLd: { '@context': 'https://schema.org', '@graph': [{ '@type': 'Person', '@id': `${canonical}#person`, name: author.name, description, image: author.avatarUrl || undefined, url: canonical, jobTitle: 'مؤلف', hasOccupation: { '@type': 'Occupation', name: 'مؤلف' }, subjectOf: { '@id': `${canonical}#works` } }, { '@type': 'ItemList', '@id': `${canonical}#works`, name: `أعمال ${author.name}`, numberOfItems: workItems.length, itemListElement: workItems }, breadcrumbSchema(origin, [{ name: 'الرئيسية', url: `${origin}/` }, { name: 'المؤلفون', url: `${origin}/explore` }, { name: author.name, url: canonical }]) ] }, content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/explore">الروايات</a></nav><article><h1>${htmlEscape(author.name)}</h1><p><strong>مؤلف</strong> — ${htmlEscape(author.bio || '')}</p><h2>أعمال ${htmlEscape(author.name)}</h2><ul>${workLinks || '<li>لا توجد أعمال منشورة بعد.</li>'}</ul><a href="${origin}/authors/${htmlEscape(author.slug)}/quotes">اقتباسات ${htmlEscape(author.name)}</a></article></main>` });
  }

  if (/^\/genres\/[^/]+$/.test(normalized)) {
    const slug = decodeURIComponent(normalized.split('/').pop() ?? '');
    const genre = await getGenreBySlug(slug);
    if (!genre) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>التصنيف غير موجود | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚</title></head><body><h1>التصنيف غير موجود</h1></body></html>', status: 404 };
    const description = stripHtml(genre.description || `روايات تصنيف ${genre.name} على منصة 𝐄𝟳𝐤𝐞𝐭𝐡𝐚.`);
    const canonical = `${origin}/genres/${encodeURIComponent(genre.slug)}`;
    return renderSeoDocument(readClientTemplate(), { title: `${genre.name} — روايات عربية | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚`, description, canonical, jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: genre.name, description, url: canonical }, content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/explore">استكشف</a></nav><article><h1>${htmlEscape(genre.name)}</h1><p>${htmlEscape(genre.description || '')}</p><a href="${origin}/explore">استكشف الروايات</a></article></main>` });
  }

  if (/^\/series\/[^/]+$/.test(normalized)) {
    const slug = decodeURIComponent(normalized.split('/').pop() ?? '');
    const selected = await getSeriesBySlug(slug);
    if (!selected) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>السلسلة غير موجودة | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚</title></head><body><h1>السلسلة غير موجودة</h1></body></html>', status: 404 };
    const description = stripHtml(selected.description || `سلسلة ${selected.title} والروايات المرتبطة بها على منصة 𝐄𝟳𝐤𝐞𝐭𝐡𝐚.`);
    const canonical = `${origin}/series/${encodeURIComponent(selected.slug)}`;
    const books = (selected.books as Array<{ title: string; slug: string; author?: string | null }>).map((book) => `<li><a href="${origin}/books/${htmlEscape(book.slug)}">${htmlEscape(book.title)}</a>${book.author ? ` — ${htmlEscape(book.author)}` : ''}</li>`).join('');
    const seriesBooks = (selected.books as Array<{ title: string; slug: string; author?: string | null }>).map((book, index) => ({ '@type': 'ListItem', position: index + 1, item: { '@type': 'Book', '@id': `${origin}/books/${encodeURIComponent(book.slug)}#book`, name: book.title, url: `${origin}/books/${encodeURIComponent(book.slug)}` } }));
    return renderSeoDocument(readClientTemplate(), { title: `${selected.title} — 𝐄𝟳𝐤𝐞𝐭𝐡𝐚`, description, canonical, type: 'collection', image: selected.coverUrl ?? undefined, jsonLd: { '@context': 'https://schema.org', '@graph': [{ '@type': 'BookSeries', '@id': `${canonical}#series`, name: selected.title, description, image: selected.coverUrl || undefined, url: canonical, numberOfItems: seriesBooks.length, hasPart: { '@type': 'ItemList', itemListElement: seriesBooks } }, breadcrumbSchema(origin, [{ name: 'الرئيسية', url: `${origin}/` }, { name: 'السلاسل', url: `${origin}/explore` }, { name: selected.title, url: canonical }]) ] }, content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/explore">استكشف</a></nav><article><h1>${htmlEscape(selected.title)}</h1><p><strong>سلسلة روائية</strong> — ${htmlEscape(selected.description || '')}</p><h2>ترتيب القراءة والأعمال المرتبطة</h2><ol>${books}</ol></article></main>` });
  }

  if (normalized === '/quotes' || normalized === '/quotes/categories') {
    const isCategories = normalized.endsWith('/categories');
    const quotes = await listQuotes(true);
    const categories = Array.from(new Set(quotes.map((quote) => quote.category).filter((category): category is string => Boolean(category?.trim()))));
    const canonical = `${origin}${normalized}`;
    const title = isCategories ? 'تصنيفات الاقتباسات | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚' : 'اقتباسات الروايات والكتب | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚';
    const description = isCategories ? 'تصفح اقتباسات الروايات حسب الموضوع والتصنيف.' : 'اقرأ اقتباسات مختارة من الروايات والكتب العربية، واكتشف المؤلفين والأعمال المرتبطة.';
    const links = (isCategories ? categories.map((category) => [`/quotes/category/${quoteCategorySlug(category)}`, `اقتباسات ${category}`] as const) : quotes.slice(0, 50).map((quote) => [`/quotes/${quote.id}`, stripHtml(quote.quote_text, 120)] as const)).map(([href, label]) => `<li><a href="${origin}${href}">${htmlEscape(label)}</a></li>`).join('');
    return renderSeoDocument(readClientTemplate(), { title, description, canonical, type: 'collection', jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: isCategories ? 'تصنيفات الاقتباسات' : 'اقتباسات الروايات والكتب', description, url: canonical, inLanguage: 'ar' }, content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a></nav><article><h1>${htmlEscape(isCategories ? 'تصنيفات الاقتباسات' : 'اقتباسات الروايات والكتب')}</h1><p>${htmlEscape(description)}</p><h2>${htmlEscape(isCategories ? 'تصفح حسب الموضوع' : 'اقتباسات مختارة')}</h2><ul>${links}</ul><p><a href="${origin}/${isCategories ? 'quotes' : 'quotes/categories'}">${isCategories ? 'كل الاقتباسات' : 'كل التصنيفات'}</a></p></article></main>` });
  }

  if (/^\/quotes\/\d+$/.test(normalized)) {
    const quote = await getQuote(Number(normalized.split('/').pop()));
    if (!quote) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>الاقتباس غير موجود | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚</title></head><body><h1>الاقتباس غير موجود</h1></body></html>', status: 404 };
    const description = stripHtml(quote.quote_text);
    const canonical = `${origin}/quotes/${quote.id}`;
    const authorLinks = quote.author_slug ? `<a href="${origin}/authors/${htmlEscape(quote.author_slug)}">صفحة ${htmlEscape(quote.author_name || 'الكاتب')}</a> · <a href="${origin}/authors/${htmlEscape(quote.author_slug)}/quotes">كل اقتباسات الكاتب</a>` : '';
    const bookLinks = quote.book_slug ? `<a href="${origin}/books/${htmlEscape(quote.book_slug)}">صفحة الكتاب</a> · <a href="${origin}/books/${htmlEscape(quote.book_slug)}/quotes">كل اقتباسات الكتاب</a>` : '';
    const categoryLink = quote.category ? `<a href="${origin}/quotes/category/${quoteCategorySlug(quote.category)}">اقتباسات ${htmlEscape(quote.category)}</a>` : '';
    const relatedLinks = [authorLinks, bookLinks, categoryLink, `<a href="${origin}/quotes">كل الاقتباسات</a>`, `<a href="${origin}/explore">اكتشف روايات أخرى</a>`].filter(Boolean).join(' · ');
    const authorUrl = quote.author_slug ? `${origin}/authors/${encodeURIComponent(quote.author_slug)}` : undefined;
    const bookUrl = quote.book_slug ? `${origin}/books/${encodeURIComponent(quote.book_slug)}` : undefined;
    const categoryUrl = quote.category ? `${origin}/quotes/category/${quoteCategorySlug(quote.category)}` : undefined;
    return renderSeoDocument(readClientTemplate(), { title: `اقتباس من ${quote.book_title || 'رواية'} | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚`, description, canonical, keywords: quoteKeywords(quote), jsonLd: { '@context': 'https://schema.org', '@graph': [{ '@type': 'Quotation', '@id': `${canonical}#quotation`, text: quote.quote_text, author: quote.author_name ? { '@type': 'Person', '@id': authorUrl ? `${authorUrl}#person` : undefined, name: quote.author_name, url: authorUrl } : undefined, isPartOf: quote.book_title ? { '@type': 'Book', '@id': bookUrl ? `${bookUrl}#book` : undefined, name: quote.book_title, url: bookUrl } : undefined, about: quote.category ? { '@type': 'Thing', name: quote.category, url: categoryUrl } : undefined, mainEntityOfPage: { '@id': canonical }, url: canonical, inLanguage: 'ar' }, breadcrumbSchema(origin, [{ name: 'الرئيسية', url: `${origin}/` }, { name: 'الاقتباسات', url: `${origin}/quotes` }, { name: quote.book_title || 'اقتباس', url: canonical }]) ] }, content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/quotes">الاقتباسات</a></nav><article><h1>اقتباس من ${htmlEscape(quote.book_title || 'رواية')}</h1><blockquote>${htmlEscape(quote.quote_text)}</blockquote>${quote.author_name ? `<p>— <a href="${origin}/authors/${htmlEscape(quote.author_slug || '')}">${htmlEscape(quote.author_name)}</a></p>` : ''}<nav aria-label="روابط ذات صلة">${relatedLinks}</nav></article></main>` });
  }

  if (/^\/quotes\/category\/[^/]+$/.test(normalized)) {
    const slug = decodeURIComponent(normalized.split('/').pop() ?? '');
    const category = slug.replace(/-/g, ' ').trim();
    const quotes = await listQuotesByCategory(slug);
    if (!quotes.length) return { html: '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="robots" content="noindex"><title>تصنيف الاقتباسات غير موجود | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚</title></head><body><h1>تصنيف الاقتباسات غير موجود</h1></body></html>', status: 404 };
    const description = `اقرأ أجمل الاقتباسات عن ${category} من كتاب ومؤلفين مختلفين في 𝐄𝟳𝐤𝐞𝐭𝐡𝐚.`;
    const canonical = `${origin}/quotes/category/${encodeURIComponent(slug)}`;
    const quoteItems = quotes.slice(0, 50).map((quote) => `<li><blockquote>${htmlEscape(quote.quote_text)}</blockquote>${quote.author_slug ? `<a href="${origin}/authors/${htmlEscape(quote.author_slug)}">${htmlEscape(quote.author_name)}</a>` : ''}${quote.book_slug ? ` · <a href="${origin}/books/${htmlEscape(quote.book_slug)}">${htmlEscape(quote.book_title)}</a>` : ''}</li>`).join('');
    return renderSeoDocument(readClientTemplate(), { title: `اقتباسات ${category} | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚`, description, canonical, type: 'collection', jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `اقتباسات ${category}`, description, url: canonical }, content: `<main lang="ar" dir="rtl"><nav><a href="${origin}/">الرئيسية</a> / <a href="${origin}/quotes">الاقتباسات</a></nav><article><h1>اقتباسات ${htmlEscape(category)}</h1><p>${htmlEscape(description)}</p><ul>${quoteItems}</ul></article></main>` });
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
      const topicPaths = ['/topics', ...topicalPages.map((item) => `/topics/${item.slug}`)];
      const staticPaths = ["/", "/explore", "/quotes", "/quotes/categories", "/discover", "/about", "/how-it-works", "/faq", "/contact", "/privacy", "/terms", ...topicPaths];
      const urls = [...staticPaths, ...novels.map((item) => `/books/${item.slug}`), ...bookQuotePaths, ...authors.map((item) => `/authors/${item.slug}`), ...authorQuotePaths, ...genres.map((item) => `/genres/${item.slug}`), ...seriesList.map((item) => `/series/${item.slug}`), ...categoryQuotePaths, ...quotes.map((item) => `/quotes/${item.id}`)];
      const resource = String(_req.query.resource ?? "");
      const sitemap = resource === "index" || resource === "sitemap" ? renderSitemapIndex() : resource === "novels" ? renderUrlset([...novels.map((item) => `/books/${item.slug}`), ...bookQuotePaths]) : resource === "authors" ? renderUrlset([...authors.map((item) => `/authors/${item.slug}`), ...authorQuotePaths]) : resource === "genres" ? renderUrlset(genres.map((item) => `/genres/${item.slug}`)) : resource === "series" ? renderUrlset(seriesList.map((item) => `/series/${item.slug}`)) : resource === "quotes" ? renderUrlset(["/quotes", "/quotes/categories", ...categoryQuotePaths, ...quotes.map((item) => `/quotes/${item.id}`)]) : renderUrlset(urls);
      res.type("application/xml").set("Cache-Control", "public, max-age=0, s-maxage=0, must-revalidate").send(sitemap);
    } catch (error) {
      console.error("[SEO] sitemap generation failed", error);
      res.status(503).type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url></urlset>`);
    }
  };
  app.get("/sitemap.xml", sitemapHandler);
  app.get("/sitemap/:type.xml", (req, res) => { req.query.resource = req.params.type; return sitemapHandler(req, res); });
  app.get("/api/sitemap.xml", sitemapHandler);
  const directSeoHandler = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const pathname = req.path;
    if (pathname.startsWith('/quotes/') && !/^\/quotes\/(?:\d+|category\/[^/]+)$/.test(pathname)) return next();
    try {
      const result = await renderPublicSeo(pathname);
      if (!result) return next();
      return res.status(result.status).type('html').set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600').send(result.html);
    } catch (error) {
      console.error('[SEO] direct server HTML render failed', error);
      return next(error);
    }
  };
  app.get(['/topics', '/topics/:slug', '/books/:slug', '/novel/:slug', '/novels/:slug', '/authors/:slug', '/genres/:slug', '/series/:slug', '/quotes/:id', '/quotes/category/:slug'], directSeoHandler);
  app.get(['/quotes', '/quotes/', '/quotes/categories'], directSeoHandler);
  app.get("/api", async (req, res, next) => {
    if (req.query.resource !== 'seo' || typeof req.query.path !== 'string') return next();
    try {
      const result = await renderPublicSeo(req.query.path);
      if (!result) return next();
      return res.status(result.status).type('html').set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600').send(result.html);
    } catch (error) {
      console.error('[SEO] server HTML render failed', error);
      return next(error);
    }
  });
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
