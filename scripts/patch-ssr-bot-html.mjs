/** Bot-visible SSR: spa-shell paths, richer static pages, /search. Idempotent. */
import fs from 'node:fs';

function patchIndexToShell(file) {
  if (!fs.existsSync(file)) return;
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes('dist/public/index.html')) {
    s = s.split('dist/public/index.html').join('dist/public/spa-shell.html');
    fs.writeFileSync(file, s);
    console.log('[patch-ssr-bot-html] shell path', file);
  }
}

for (const f of ['server/app.ts', 'server/seoPublicPages.ts', 'server/seoArticlePages.ts']) {
  patchIndexToShell(f);
}

const appPath = 'server/app.ts';
if (fs.existsSync(appPath)) {
  let s = fs.readFileSync(appPath, 'utf8');
  if (!s.includes("normalized === '/search'") && !s.includes('normalized === "/search"')) {
    const needle = "  if (normalized === '/topics'";
    const insert = `  if (normalized === '/search') {
    const description = 'ابحث في روايات ومؤلفين وتصنيفات 𝐄𝟳𝐤𝐞𝐭𝐡𝐚. اكتب اسم الرواية أو الكاتب أو النوع.';
    const canonical = \`\${origin}/search\`;
    return renderSeoDocument(readClientTemplate(), {
      title: 'بحث الروايات | 𝐄𝟳𝐤𝐞𝐭𝐡𝐚',
      description,
      canonical,
      type: 'website',
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', url: origin, potentialAction: { '@type': 'SearchAction', target: \`\${origin}/search?q={search_term_string}\`, 'query-input': 'required name=search_term_string' } },
      content: \`<main lang="ar" dir="rtl"><nav><a href="\${origin}/">الرئيسية</a></nav><article><h1>البحث في المكتبة</h1><p>\${description}</p><p><a href="\${origin}/explore">استكشف كل الروايات</a> · <a href="\${origin}/quotes">الاقتباسات</a></p></article></main>\`,
    });
  }

`;
    if (s.includes(needle)) {
      s = s.replace(needle, insert + needle);
      fs.writeFileSync(appPath, s);
      console.log('[patch-ssr-bot-html] /search');
    }
  }
}

const seoPath = 'server/seoPublicPages.ts';
if (fs.existsSync(seoPath)) {
  let s = fs.readFileSync(seoPath, 'utf8');
  const bodies = {
    "/about": "رِواية (E7ketha) منصة عربية لاكتشاف الروايات: نساعدك تختار ما يستحق وقتك عبر التصنيفات والمؤلفين والسلاسل والاقتباسات والمقالات. نحن منصة اكتشاف ومعلومات، ولا نستضيف ملفات الكتب الإلكترونية ولا نقدّم تحميلًا غير قانوني. هدفنا تبسيط اكتشاف الأدب العربي المعاصر والكلاسيكي بواجهة واضحة بالعربية.",
    "/privacy": "تجمع 𝐄𝟳𝐤𝐞𝐭𝐡𝐚 الحد الأدنى من البيانات اللازمة لتشغيل الحساب (مثل البريد عند التسجيل) وتحسين التجربة. نستخدم مُعرّف زائر مجهولًا في المتصفح لإحصاءات الصفحات دون تخزين عنوان IP لهذا الغرض. قد نستخدم ملفات تعريف الارتباط (Cookies) وتقنيات مشابهة للجلسة والتحليلات. عند تفعيل الإعلانات، قد تستخدم Google AdSense ملفات تعريف ارتباط وأطرافًا ثالثة لعرض إعلانات وقياس الأداء وفق سياسات Google. لا نبيع بياناتك الشخصية. يمكنك طلب حذف الحساب عبر صفحة التواصل. باستخدامك الموقع فإنك توافق على هذه السياسة.",
    "/terms": "باستخدامك 𝐄𝟳𝐤𝐞𝐭𝐡𝐚 فإنك توافق على استخدام المنصة لأغراض الاكتشاف والقراءة المشروعة فقط. المحتوى المعروض (ملخصات، اقتباسات، مقالات) لأغراض معلوماتية وثقافية. حقوق الروايات والنصوص تعود لأصحابها. يُحظر إساءة استخدام الحساب أو محاولة اختراق المنصة أو رفع محتوى مخالف. قد نحدّث الشروط مع إشعار مناسب في الصفحة.",
    "/contact": "للتواصل مع فريق 𝐄𝟳𝐤𝐞𝐭𝐡𝐚 بشأن الدعم أو الإبلاغ عن مشكلة أو طلبات الخصوصية، استخدم صفحة الإبلاغ داخل الموقع أو راسلنا عبر قنوات الدعم الرسمية. نحرص على الرد في أقرب وقت ممكن خلال أيام العمل.",
    "/faq": "ما هي 𝐄𝟳𝐤𝐞𝐭𝐡𝐚؟ منصة لاكتشاف الروايات العربية دون استضافة ملفات الكتب. هل يمكنني التحميل؟ لا، نحن لا نقدّم ملفات للتحميل. كيف أبحث؟ من صفحة البحث أو التصنيفات أو المؤلفين. هل الحساب مجاني؟ نعم للميزات الأساسية. كيف أحفظ اقتباسًا؟ بعد تسجيل الدخول من صفحة الاقتباس.",
    "/how-it-works": "تصفّح التصنيفات والمؤلفين والسلاسل، اقرأ الملخصات والاقتباسات والمقالات، واحفظ ما يعجبك في حسابك. التوصيات تعتمد على اهتماماتك وتصفّحك. المنصة للاكتشاف فقط وليست متجر تحميل.",
    "/explore": "استكشف مكتبة الروايات العربية حسب الشعبية والتقييم والحداثة. استخدم الفلاتر للوصول إلى ما يناسب ذوقك، ثم افتح صفحة الرواية لقراءة الملخص وروابط المؤلف والتصنيف والاقتباسات ذات الصلة.",
    "/discover": "صفحة الاكتشاف الشخصي تساعدك بناءً على الأنواع التي تفضّلها وتصفّحك السابق. اختر اهتماماتك لتحصل على ترشيحات أوضح لروايات قد تعجبك.",
    "/articles": "مقالات وترشيحات أدبية تساعدك تختار روايتك التالية وتفهم الاتجاهات في الأدب العربي. اقرأ المقالات ثم انتقل إلى صفحات الروايات والمؤلفين المرتبطة.",
    "/report": "إذا وجدت محتوى غير دقيق أو مشكلة تقنية أو انتهاكًا، أبلغنا عبر هذه الصفحة مع وصف واضح. نراجع البلاغات ونتخذ الإجراء المناسب.",
    "/topics": "موضوعات تجمع مسارات مترابطة بين التصنيفات والمؤلفين والاقتباسات لتسهيل الاستكشاف حسب اهتمامك.",
  };
  for (const [route, body] of Object.entries(bodies)) {
    const key = "'" + route + "'";
    const idx = s.indexOf(key);
    if (idx < 0) continue;
    const bodyKey = 'body:';
    const bIdx = s.indexOf(bodyKey, idx);
    if (bIdx < 0 || bIdx > idx + 400) continue;
    let i = bIdx + 5;
    while (i < s.length && s[i] !== "'" && s[i] !== '"') i++;
    if (i >= s.length) continue;
    const quote = s[i];
    let j = i + 1;
    while (j < s.length) {
      if (s[j] === '\\') { j += 2; continue; }
      if (s[j] === quote) break;
      j++;
    }
    if (j >= s.length) continue;
    const escaped = body.replace(/\\/g, '\\\\').replace(new RegExp(quote === '"' ? '"' : "'", 'g'), '\\' + quote);
    s = s.slice(0, i + 1) + escaped + s.slice(j);
  }
  fs.writeFileSync(seoPath, s);
  console.log('[patch-ssr-bot-html] expanded static SEO bodies');
}

const appSeoPath = 'server/app.ts';
if (fs.existsSync(appSeoPath)) {
  let app = fs.readFileSync(appSeoPath, 'utf8');

  if (!app.includes("from './novelDetails'") && !app.includes('from "./novelDetails"')) {
    app = app.replace(
      "import { getQuote, listQuotes, listQuotesByCategory } from './quotes';",
      "import { getQuote, listQuotes, listQuotesByCategory } from './quotes';\nimport { getNovelDetails } from './novelDetails';",
    );
    app = app.replace(
      'import { getQuote, listQuotes, listQuotesByCategory } from "./quotes";',
      'import { getQuote, listQuotes, listQuotesByCategory } from "./quotes";\nimport { getNovelDetails } from "./novelDetails";',
    );
  }

  if (!app.includes('function renderNovelDetailsHtml(')) {
    const needle = "function breadcrumbSchema(origin: string, items: Array<{ name: string; url: string }>) {";
    const helper = [
      "function renderNovelDetailsHtml(details) {",
      "  if (!details || Number(details.wordCount || 0) <= 0) return '';",
      "  const fields = [",
      "    ['ملخص تفصيلي', 'detailedSummary'], ['ملخص بدون حرق', 'spoilerFreeSummary'],",
      "    ['الموضوعات والثيمات', 'themes'], ['الشخصيات', 'characters'], ['المكان والزمان', 'setting'],",
      "    ['أسلوب الكتابة', 'writingStyle'], ['التحليل الأدبي', 'literaryAnalysis'],",
      "    ['ما يميز الرواية', 'whatMakesItDistinct'], ['لمن تناسب', 'recommendedFor'],",
      "    ['تفاصيل جديرة بالملاحظة', 'notableDetails'],",
      "  ];",
      "  const sections = fields.map(([label, key]) => {",
      "    const value = details[key];",
      "    return typeof value === 'string' && value.trim() ? '<section><h2>' + htmlEscape(label) + '</h2><p>' + htmlEscape(value) + '</p></section>' : '';",
      "  }).filter(Boolean).join('');",
      "  const keywords = typeof details.keywords === 'string' && details.keywords.trim() ? '<p><strong>كلمات مفتاحية:</strong> ' + htmlEscape(details.keywords) + '</p>' : '';",
      "  return '<section aria-label=\"دليل الرواية\"><h2>دليل الرواية</h2><p>بيانات موسعة للرواية (' + Number(details.wordCount).toLocaleString('ar-EG') + ' كلمة).</p>' + sections + keywords + '</section>';",
      "}",
      "",
    ].join('\n');
    if (app.includes(needle)) app = app.replace(needle, helper + needle);
  }

  if (!app.includes('const richDetailsHtml = renderNovelDetailsHtml(novelDetails);')) {
    const needle = "    const description = `${novel.title} للكاتب ${novel.author}.";
    const idx = app.indexOf(needle);
    if (idx >= 0) {
      const detailsBlock = [
        "    let novelDetails = null;",
        "    try {",
        "      novelDetails = await getNovelDetails(Number(novel.id));",
        "    } catch (error) {",
        "      console.warn('[SEO] novel details unavailable', novel.slug, error);",
        "    }",
      ].join('\n') + '\n';
      app = app.slice(0, idx) + detailsBlock + app.slice(idx);
      const canonicalIdx = app.indexOf("    const canonical =", idx + detailsBlock.length);
      if (canonicalIdx >= 0) app = app.slice(0, canonicalIdx) + "    const richDetailsHtml = renderNovelDetailsHtml(novelDetails);\n" + app.slice(canonicalIdx);
    }
  }

  if (!app.includes('${richDetailsHtml}<p>اللغة:')) {
    app = app.replace('<p>${htmlEscape(novel.description || \'\')}</p><p>اللغة:', '<p>${htmlEscape(novel.description || \'\')}</p>${richDetailsHtml}<p>اللغة:');
  }

  fs.writeFileSync(appSeoPath, app);
  console.log('[patch-ssr-bot-html] novel rich details SSR');
}
console.log('[patch-ssr-bot-html] done');
