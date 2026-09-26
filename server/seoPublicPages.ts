/* SSR_RICH_LISTS_SKIP */
/**
 * Server-side HTML meta injection for public static pages.
 * Runs in the Vercel API entry before the main app handler.
 */
import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = 'https://e7ketha.com';
const SITE_NAME = '𝐄𝟳𝐤𝐞𝐭𝐡𝐚';

type PageDef = {
  title: string;
  description: string;
  h1: string;
  body: string;
};

const PAGES: Record<string, PageDef> = {
  '/_legacy_explore_unused': {
    title: `استكشف الروايات العربية | ${SITE_NAME}`,
    description:
      'تصفح مكتبة الروايات العربية: غموض، رعب، رومانسية، دراما وخيال — نبذات وترشيحات بدون حرق على منصة اكتشاف الروايات.',
    h1: 'استكشف الروايات',
    body: 'استكشف مكتبة الروايات العربية حسب الشعبية والتقييم والحداثة. استخدم الفلاتر للوصول إلى ما يناسب ذوقك، ثم افتح صفحة الرواية لقراءة الملخص وروابط المؤلف والتصنيف والاقتباسات ذات الصلة.',
  },
  '/discover': {
    title: `اكتشف قراءتك القادمة | ${SITE_NAME}`,
    description:
      'مسارات اكتشاف للروايات العربية من أول فكرة حتى آخر صفحة، مع روابط للمؤلفين والتصنيفات والاقتباسات.',
    h1: 'اكتشف قراءتك القادمة',
    body: 'صفحة الاكتشاف الشخصي تساعدك بناءً على الأنواع التي تفضّلها وتصفّحك السابق. اختر اهتماماتك لتحصل على ترشيحات أوضح لروايات قد تعجبك.',
  },
  '/_legacy_articles_unused': {
    title: `مقالات أدبية وترشيحات قراءة | ${SITE_NAME}`,
    description:
      'مقالات أدبية وترشيحات قراءة من منصة اكتشاف الروايات العربية — بدون حرق، مع روابط للكتب والمؤلفين.',
    h1: 'المقالات الأدبية',
    body: 'مقالات وترشيحات أدبية تساعدك تختار روايتك التالية وتفهم الاتجاهات في الأدب العربي. اقرأ المقالات ثم انتقل إلى صفحات الروايات والمؤلفين المرتبطة.',
  },
  '/about': {
    title: `عن ${SITE_NAME} | منصة اكتشاف الروايات العربية`,
    description:
      'منصة اكتشاف للروايات العربية: ترشيحات، مؤلفون، تصنيفات، اقتباسات ونبذات — مساحة أهدأ لتختار ما يستحق القراءة.',
    h1: 'عن المنصة',
    body: 'رِواية (E7ketha) منصة عربية لاكتشاف الروايات: نساعدك تختار ما يستحق وقتك عبر التصنيفات والمؤلفين والسلاسل والاقتباسات والمقالات. نحن منصة اكتشاف ومعلومات، ولا نستضيف ملفات الكتب الإلكترونية ولا نقدّم تحميلًا غير قانوني. هدفنا تبسيط اكتشاف الأدب العربي المعاصر والكلاسيكي بواجهة واضحة بالعربية.',
  },
  '/how-it-works': {
    title: `كيف تعمل ${SITE_NAME}؟`,
    description: 'تعرف كيف تبحث وتستكشف الروايات والمؤلفين والاقتباسات على المنصة خطوة بخطوة.',
    h1: 'كيف تعمل المنصة؟',
    body: 'تصفّح التصنيفات والمؤلفين والسلاسل، اقرأ الملخصات والاقتباسات والمقالات، واحفظ ما يعجبك في حسابك. التوصيات تعتمد على اهتماماتك وتصفّحك. المنصة للاكتشاف فقط وليست متجر تحميل.',
  },
  '/faq': {
    title: `الأسئلة الشائعة | ${SITE_NAME}`,
    description:
      'إجابات عن أسئلة شائعة: البحث، الحساب، الاقتباسات، وطبيعة المنصة كاكتشاف وليس استضافة كتب.',
    h1: 'الأسئلة الشائعة',
    body: 'ما هي 𝐄𝟳𝐤𝐞𝐭𝐡𝐚؟ منصة لاكتشاف الروايات العربية دون استضافة ملفات الكتب. هل يمكنني التحميل؟ لا، نحن لا نقدّم ملفات للتحميل. كيف أبحث؟ من صفحة البحث أو التصنيفات أو المؤلفين. هل الحساب مجاني؟ نعم للميزات الأساسية. كيف أحفظ اقتباسًا؟ بعد تسجيل الدخول من صفحة الاقتباس.',
  },
  '/contact': {
    title: `تواصل معنا | ${SITE_NAME}`,
    description: 'تواصل مع الفريق للاقتراحات أو الشكاوى أو الاستفسارات المتعلقة بمنصة اكتشاف الروايات العربية.',
    h1: 'تواصل معنا',
    body: 'للتواصل مع فريق 𝐄𝟳𝐤𝐞𝐭𝐡𝐚 بشأن الدعم أو الإبلاغ عن مشكلة أو طلبات الخصوصية، استخدم صفحة الإبلاغ داخل الموقع أو راسلنا عبر قنوات الدعم الرسمية. نحرص على الرد في أقرب وقت ممكن خلال أيام العمل.',
  },
  '/privacy': {
    title: `سياسة الخصوصية | ${SITE_NAME}`,
    description: 'كيف نتعامل مع بيانات الحساب والاستخدام على منصة اكتشاف الروايات العربية.',
    h1: 'سياسة الخصوصية',
    body: 'تجمع 𝐄𝟳𝐤𝐞𝐭𝐡𝐚 الحد الأدنى من البيانات اللازمة لتشغيل الحساب (مثل البريد عند التسجيل) وتحسين التجربة. نستخدم مُعرّف زائر مجهولًا في المتصفح لإحصاءات الصفحات دون تخزين عنوان IP لهذا الغرض. قد نستخدم ملفات تعريف الارتباط (Cookies) وتقنيات مشابهة للجلسة والتحليلات. عند تفعيل الإعلانات، قد تستخدم Google AdSense ملفات تعريف ارتباط وأطرافًا ثالثة لعرض إعلانات وقياس الأداء وفق سياسات Google. لا نبيع بياناتك الشخصية. يمكنك طلب حذف الحساب عبر صفحة التواصل. باستخدامك الموقع فإنك توافق على هذه السياسة.',
  },
  '/terms': {
    title: `شروط الاستخدام | ${SITE_NAME}`,
    description: 'شروط استخدام منصة اكتشاف الروايات العربية والمحتوى المعروض على الموقع.',
    h1: 'شروط الاستخدام',
    body: 'باستخدامك 𝐄𝟳𝐤𝐞𝐭𝐡𝐚 فإنك توافق على استخدام المنصة لأغراض الاكتشاف والقراءة المشروعة فقط. المحتوى المعروض (ملخصات، اقتباسات، مقالات) لأغراض معلوماتية وثقافية. حقوق الروايات والنصوص تعود لأصحابها. يُحظر إساءة استخدام الحساب أو محاولة اختراق المنصة أو رفع محتوى مخالف. قد نحدّث الشروط مع إشعار مناسب في الصفحة.',
  },
  '/report': {
    title: `الإبلاغ عن مشكلة | ${SITE_NAME}`,
    description: 'أبلغ عن مشكلة في المحتوى أو تجربة الاستخدام لنحسّن جودة المنصة.',
    h1: 'الإبلاغ عن مشكلة',
    body: 'إذا وجدت محتوى غير دقيق أو مشكلة تقنية أو انتهاكًا، أبلغنا عبر هذه الصفحة مع وصف واضح. نراجع البلاغات ونتخذ الإجراء المناسب.',
  },
  '/topics': {
    title: `موضوعات الروايات العربية | ${SITE_NAME}`,
    description: 'اكتشف الروايات العربية حسب الموضوع والتصنيف والمؤلف والسلسلة.',
    h1: 'الموضوعات',
    body: 'موضوعات تجمع مسارات مترابطة بين التصنيفات والمؤلفين والاقتباسات لتسهيل الاستكشاف حسب اهتمامك.',
  },
};

function escapeHtml(value: string) {
  return value
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
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${SITE_NAME}</title></head><body><div id="root"></div></body></html>`;
}

function inject(template: string, page: PageDef, pathname: string) {
  const canonical = `${SITE_URL}${pathname}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.h1,
    description: page.description,
    url: canonical,
    inLanguage: 'ar',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_URL}/` },
  };
  const head = [
    `<title>${escapeHtml(page.title)}</title>`,
    `<meta name="description" content="${escapeHtml(page.description)}">`,
    `<meta name="robots" content="index,follow">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${escapeHtml(page.title)}">`,
    `<meta property="og:description" content="${escapeHtml(page.description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
    `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
  ].join('');

  const content = `<main lang="ar" dir="rtl"><nav aria-label="مسار التنقل"><a href="${SITE_URL}/">الرئيسية</a></nav><article><h1>${escapeHtml(page.h1)}</h1><p>${escapeHtml(page.body)}</p><p><a href="${SITE_URL}/explore">استكشف</a> · <a href="${SITE_URL}/quotes">اقتباسات</a> · <a href="${SITE_URL}/articles">مقالات</a></p></article></main>`;

  return template
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+(?:name|property)=["'](?:description|robots|twitter:[^"']+|og:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script[^>]+type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi, '')
    .replace('</head>', `${head}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${content}</div>`);
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

/**
 * If the request is for a static public page (via ?resource=seo&path=... or direct path),
 * write HTML and return true.
 */
export function tryRenderStaticSeo(req: any, res: any): boolean {
  const method = String(req.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') return false;

  let pathname = '';
  const q = req.query || {};
  if (q.resource === 'seo' && typeof q.path === 'string') {
    pathname = normalizePath(q.path);
  } else if (typeof req.url === 'string') {
    pathname = normalizePath(req.url.split('?')[0] || '/');
  }

  const page = PAGES[pathname];
  if (!page) return false;

  const html = inject(readTemplate(), page, pathname);
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900, stale-while-revalidate=1800');
  res.setHeader('CDN-Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');
  res.end(html);
  return true;
}
