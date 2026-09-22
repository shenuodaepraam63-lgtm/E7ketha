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
  '/explore': {
    title: `استكشف الروايات العربية | ${SITE_NAME}`,
    description:
      'تصفح مكتبة الروايات العربية: غموض، رعب، رومانسية، دراما وخيال — نبذات وترشيحات بدون حرق على منصة اكتشاف الروايات.',
    h1: 'استكشف الروايات',
    body: 'اكتشف روايات عربية تستحق وقتك حسب التصنيف والمؤلف والتقييم.',
  },
  '/discover': {
    title: `اكتشف قراءتك القادمة | ${SITE_NAME}`,
    description:
      'مسارات اكتشاف للروايات العربية من أول فكرة حتى آخر صفحة، مع روابط للمؤلفين والتصنيفات والاقتباسات.',
    h1: 'اكتشف قراءتك القادمة',
    body: 'اختر مسارًا يناسب مزاجك: روايات اجتماعية أو تاريخية أو اقتباسات تلهمك لفتح كتاب جديد.',
  },
  '/articles': {
    title: `مقالات أدبية وترشيحات قراءة | ${SITE_NAME}`,
    description:
      'مقالات أدبية وترشيحات قراءة من منصة اكتشاف الروايات العربية — بدون حرق، مع روابط للكتب والمؤلفين.',
    h1: 'المقالات الأدبية',
    body: 'اقرأ مقالات وترشيحات تساعدك تختار روايتك التالية.',
  },
  '/about': {
    title: `عن ${SITE_NAME} | منصة اكتشاف الروايات العربية`,
    description:
      'منصة اكتشاف للروايات العربية: ترشيحات، مؤلفون، تصنيفات، اقتباسات ونبذات — مساحة أهدأ لتختار ما يستحق القراءة.',
    h1: 'عن المنصة',
    body: 'رِواية تساعدك تفهم عالم الروايات العربية وتلاقي ما يستحق وقتك. منصة اكتشاف، لا تستضيف ملفات الكتب.',
  },
  '/how-it-works': {
    title: `كيف تعمل ${SITE_NAME}؟`,
    description: 'تعرف كيف تبحث وتستكشف الروايات والمؤلفين والاقتباسات على المنصة خطوة بخطوة.',
    h1: 'كيف تعمل المنصة؟',
    body: 'ابحث، تصفح التصنيفات، افتح صفحة الرواية أو المؤلف، واحفظ ما يعجبك بعد تسجيل الدخول.',
  },
  '/faq': {
    title: `الأسئلة الشائعة | ${SITE_NAME}`,
    description:
      'إجابات عن أسئلة شائعة: البحث، الحساب، الاقتباسات، وطبيعة المنصة كاكتشاف وليس استضافة كتب.',
    h1: 'الأسئلة الشائعة',
    body: 'هنا تجد إجابات سريعة عن استخدام المنصة والحساب والخصوصية.',
  },
  '/contact': {
    title: `تواصل معنا | ${SITE_NAME}`,
    description: 'تواصل مع الفريق للاقتراحات أو الشكاوى أو الاستفسارات المتعلقة بمنصة اكتشاف الروايات العربية.',
    h1: 'تواصل معنا',
    body: 'يسعدنا سماع ملاحظاتك واقتراحاتك لتحسين تجربة الاكتشاف.',
  },
  '/privacy': {
    title: `سياسة الخصوصية | ${SITE_NAME}`,
    description: 'كيف نتعامل مع بيانات الحساب والاستخدام على منصة اكتشاف الروايات العربية.',
    h1: 'سياسة الخصوصية',
    body: 'نوضح ما نجمعه من بيانات وكيف نستخدمها لحماية حسابك وتجربتك.',
  },
  '/terms': {
    title: `شروط الاستخدام | ${SITE_NAME}`,
    description: 'شروط استخدام منصة اكتشاف الروايات العربية والمحتوى المعروض على الموقع.',
    h1: 'شروط الاستخدام',
    body: 'باستخدامك للمنصة فإنك توافق على شروط الاستخدام المعروضة هنا.',
  },
  '/report': {
    title: `الإبلاغ عن مشكلة | ${SITE_NAME}`,
    description: 'أبلغ عن مشكلة في المحتوى أو تجربة الاستخدام لنحسّن جودة المنصة.',
    h1: 'الإبلاغ عن مشكلة',
    body: 'إذا وجدت خطأ في بيانات رواية أو رابطًا معطوبًا، أخبرنا من هنا.',
  },
  '/topics': {
    title: `موضوعات الروايات العربية | ${SITE_NAME}`,
    description: 'اكتشف الروايات العربية حسب الموضوع والتصنيف والمؤلف والسلسلة.',
    h1: 'الموضوعات',
    body: 'مركز مترابط لاكتشاف الروايات حسب اهتمامك.',
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
    path.join(process.cwd(), 'dist/public/index.html'),
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
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
  res.end(html);
  return true;
}
