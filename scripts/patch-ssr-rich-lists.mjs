/** Rich SSR lists for bots. Idempotent. No nested template issues. */
import fs from 'node:fs';

function once(file, marker, fn) {
  if (!fs.existsSync(file)) return;
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes(marker)) {
    console.log('[ssr-rich] skip', marker);
    return;
  }
  fs.writeFileSync(file, fn(s));
  console.log('[ssr-rich] ok', marker);
}

once('server/seoPublicPages.ts', 'SSR_RICH_LISTS_SKIP', (s) => {
  s = s.replace("'/explore':", "'/_legacy_explore_unused':");
  s = s.replace("'/articles':", "'/_legacy_articles_unused':");
  return '/* SSR_RICH_LISTS_SKIP */\n' + s;
});

once('server/app.ts', 'SSR_RICH_LISTS_IMPORT', (s) => {
  if (s.includes('listPublishedArticles')) {
    return s.includes('SSR_RICH_LISTS_IMPORT') ? s : s + '\n/* SSR_RICH_LISTS_IMPORT */\n';
  }
  return s.replace(
    'import { getAuthorBySlug',
    'import { listPublishedArticles } from "./articles";\n/* SSR_RICH_LISTS_IMPORT */\nimport { getAuthorBySlug',
  );
});

once('server/app.ts', 'SSR_RICH_LISTS_HANDLERS', (s) => {
  const start = s.indexOf('function renderHomepageShell');
  const end = s.indexOf('\nasync function renderPublicSeo', start);
  if (start < 0 || end < 0) return s;

  const shellFn = [
    "function renderHomepageShell(novels: Array<{ slug: string; title: string; author?: string | null }>) {",
    "  const novelItems = novels.slice(0, 24).map((novel) => `<li><a href=\"${SITE_URL}/books/${htmlEscape(novel.slug)}\">${htmlEscape(novel.title)}</a>${novel.author ? ` — ${htmlEscape(novel.author)}` : ''}</li>`).join('');",
    "  return `<div dir=\"rtl\" lang=\"ar\"><header><a href=\"/\">𝐄𝟳𝐤𝐞𝐭𝐡𝐚</a> · <a href=\"/explore\">استكشف</a> · <a href=\"/quotes\">اقتباسات</a> · <a href=\"/articles\">مقالات</a> · <a href=\"/search\">بحث</a></header>",
    "<main><section><h1>اكتشف روايتك القادمة</h1>",
    "<p>𝐄𝟳𝐤𝐞𝐭𝐡𝐚 منصة عربية لاكتشاف الروايات: نساعدك تختار ما يستحق وقتك عبر التصنيفات والمؤلفين والسلاسل والاقتباسات والمقالات. منصة اكتشاف ومعلومات — لا نستضيف ملفات الكتب ولا نقدّم تحميلًا غير قانوني.</p>",
    "<p>ابدأ من البحث أو قائمة الروايات، ثم افتح صفحة العمل لقراءة الملخص وروابط المؤلف والتصنيف والاقتباسات. هدفنا تبسيط اكتشاف الأدب العربي بواجهة واضحة.</p></section>",
    "<section><h2>روايات مختارة من المكتبة</h2><ul>${novelItems}</ul>",
    "<p><a href=\"/explore\">كل الروايات</a> · <a href=\"/quotes\">الاقتباسات</a> · <a href=\"/articles\">المقالات</a></p></section>",
    "<section><h2>كيف تستخدم المنصة؟</h2>",
    "<p>اختر تصنيفًا يناسب مزاجك، تابع مؤلفًا، أو اقرأ اقتباسًا يقودك لرواية جديدة. بعد التسجيل يمكنك حفظ الاقتباسات وبناء اهتمامات في صفحة الاكتشاف.</p></section>",
    "</main></div>`;",
    "}",
    "/* SSR_RICH_LISTS_HANDLERS */",
    "",
  ].join('\n');

  s = s.slice(0, start) + shellFn + s.slice(end);

  const homeEnd = "content: renderHomepageShell(novels) });\n  }";
  const routes = [
    "content: renderHomepageShell(novels) });",
    "  }",
    "",
    "  /* SSR_RICH_LISTS_ROUTES */",
    "  if (normalized === '/explore') {",
    "    const novels = await listNovels(80);",
    "    const genres = await listGenres().catch(() => [] as any[]);",
    "    const novelItems = novels.map((n: any) => `<li><a href=\"${origin}/books/${htmlEscape(n.slug)}\">${htmlEscape(n.title)}</a>${n.author ? ` — ${htmlEscape(n.author)}` : ''}</li>`).join('');",
    "    const genreItems = (genres || []).slice(0, 20).map((g: any) => `<li><a href=\"${origin}/genres/${htmlEscape(g.slug)}\">${htmlEscape(g.name)}</a></li>`).join('');",
    "    const description = 'استكشف مكتبة الروايات العربية على 𝐄𝟳𝐤𝐞𝐭𝐡𝐚: عناوين ومؤلفون وتصنيفات مع روابط مباشرة.';",
    "    return renderSeoDocument(readClientTemplate(), { title: 'استكشف الروايات العربية | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚', description, canonical: `${origin}/explore`, type: 'collection', jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'استكشف الروايات', description, url: `${origin}/explore`, inLanguage: 'ar' }, content: `<main lang=\"ar\" dir=\"rtl\"><nav><a href=\"${origin}/\">الرئيسية</a></nav><article><h1>استكشف الروايات العربية</h1><p>${description}</p><h2>روايات من المكتبة</h2><ul>${novelItems}</ul><h2>التصنيفات</h2><ul>${genreItems}</ul></article></main>` });",
    "  }",
    "",
    "  if (normalized === '/articles') {",
    "    const articles = await listPublishedArticles(40).catch(() => [] as any[]);",
    "    const items = (articles || []).map((a: any) => `<li><a href=\"${origin}/articles/${htmlEscape(a.slug)}\">${htmlEscape(a.title)}</a></li>`).join('') || '<li>لا مقالات منشورة حاليًا.</li>';",
    "    const description = 'مقالات وترشيحات أدبية على 𝐄𝟳𝐤𝐞𝐭𝐡𝐚 تساعدك تختار روايتك التالية.';",
    "    return renderSeoDocument(readClientTemplate(), { title: 'مقالات أدبية وترشيحات قراءة | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚', description, canonical: `${origin}/articles`, type: 'collection', jsonLd: { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'المقالات', description, url: `${origin}/articles`, inLanguage: 'ar' }, content: `<main lang=\"ar\" dir=\"rtl\"><nav><a href=\"${origin}/\">الرئيسية</a></nav><article><h1>المقالات الأدبية</h1><p>${description}</p><ul>${items}</ul></article></main>` });",
    "  }",
    "",
    "  if (normalized === '/search') {",
    "    const novels = await listNovels(30).catch(() => [] as any[]);",
    "    const items = (novels || []).map((n: any) => `<li><a href=\"${origin}/books/${htmlEscape(n.slug)}\">${htmlEscape(n.title)}</a>${n.author ? ` — ${htmlEscape(n.author)}` : ''}</li>`).join('');",
    "    const description = 'ابحث في روايات ومؤلفين وتصنيفات 𝐄𝟳𝐤𝐞𝐭𝐡𝐚، أو تصفح العناوين أدناه للبدء.';",
    "    return renderSeoDocument(readClientTemplate(), { title: 'بحث الروايات | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚', description, canonical: `${origin}/search`, type: 'website', jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', url: origin, potentialAction: { '@type': 'SearchAction', target: `${origin}/search?q={search_term_string}`, 'query-input': 'required name=search_term_string' } }, content: `<main lang=\"ar\" dir=\"rtl\"><nav><a href=\"${origin}/\">الرئيسية</a></nav><article><h1>البحث في المكتبة</h1><p>${description}</p><h2>عناوين للبدء</h2><ul>${items}</ul><p><a href=\"${origin}/explore\">استكشف</a> · <a href=\"${origin}/quotes\">اقتباسات</a></p></article></main>` });",
    "  }",
  ].join('\n');

  if (s.includes(homeEnd) && !s.includes('SSR_RICH_LISTS_ROUTES')) {
    s = s.replace(homeEnd, routes);
  }
  return s;
});

once('server/app.ts', 'SSR_RICH_LISTS_ROUTES_REG', (s) => {
  const needle = "app.get(['/quotes', '/quotes/', '/quotes/categories'], directSeoHandler);";
  if (!s.includes(needle) || s.includes('SSR_RICH_LISTS_ROUTES_REG')) return s;
  return s.replace(
    needle,
    needle + "\n  app.get(['/explore', '/articles', '/search'], directSeoHandler); /* SSR_RICH_LISTS_ROUTES_REG */",
  );
});

console.log('[ssr-rich] done');
