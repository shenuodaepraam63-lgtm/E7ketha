/**
 * Homepage SSR LCP: optimized covers in HTML + preload before any JS.
 */
import fs from "node:fs";

const f = "server/app.ts";
if (!fs.existsSync(f)) {
  console.warn("[patch-ssr-lcp] server/app.ts missing");
  process.exit(0);
}
let s = fs.readFileSync(f, "utf8");
if (s.includes("/* SSR_LCP_COVERS */") || (s.includes('fetchpriority="high"') && s.includes("function optimizeCoverUrl"))) {
  console.log("[patch-ssr-lcp] already applied");
  process.exit(0);
}

const helper = `
/** LCP-safe cover URLs for SSR (mirrors client optimizeCoverUrl). /* SSR_LCP_COVERS */
function optimizeCoverUrl(src: string | null | undefined, width = 400): string {
  if (!src) return \`\${SITE_URL}/e7ketha-cover-wide.png\`;
  try {
    if (src.includes("res.cloudinary.com") && src.includes("/upload/")) {
      if (/\\/upload\\/[^/]*f_auto/.test(src) || src.includes("w_" + width)) return src;
      return src.replace("/upload/", \`/upload/f_auto,q_auto,w_\${width},c_limit/\`);
    }
    if (src.startsWith("http") && !src.includes("wsrv.nl")) {
      return \`https://wsrv.nl/?url=\${encodeURIComponent(src)}&w=\${width}&q=80&output=webp&we\`;
    }
  } catch {
    /* fallthrough */
  }
  return src;
}

`;

if (!s.includes("function optimizeCoverUrl(")) {
  s = s.replace("function renderHomepageShell(", helper + "function renderHomepageShell(");
}

s = s.replace(
  "function renderSeoDocument(template: string, input: { title: string; description: string; canonical: string; type?: string; image?: string; keywords?: string[]; jsonLd: unknown; content: string; status?: number }) {",
  "function renderSeoDocument(template: string, input: { title: string; description: string; canonical: string; type?: string; image?: string; preloadImage?: string; keywords?: string[]; jsonLd: unknown; content: string; status?: number }) {",
);
if (!s.includes("input.preloadImage")) {
  s = s.replace(
    "const head = `<title>${htmlEscape(input.title)}</title>",
    "const preload = input.preloadImage ? `<link rel=\"preload\" as=\"image\" href=\"${htmlEscape(input.preloadImage)}\" fetchpriority=\"high\">` : '';\n  const head = `${preload}<title>${htmlEscape(input.title)}</title>",
  );
}

const shellRe = /function renderHomepageShell\([^{]*\{[\s\S]*?\n\}/;
const newShell = `function renderHomepageShell(novels: Array<{ slug: string; title: string; author?: string | null; coverUrl?: string | null }>) {
  const top = novels.slice(0, 6);
  const novelItems = top.slice(0, 5).map((novel) => \`<li><a href="\${SITE_URL}/books/\${htmlEscape(novel.slug)}">\${htmlEscape(novel.title)}</a>\${novel.author ? \` — \${htmlEscape(novel.author)}\` : ""}</li>\`).join("");
  const coversHtml = top.slice(0, 4).map((novel, i) => {
    const src = optimizeCoverUrl(novel.coverUrl, i === 0 ? 400 : 200);
    const w = i === 0 ? 200 : 148;
    const h = i === 0 ? 300 : 222;
    const pri = i === 0 ? ' fetchpriority="high"' : ' loading="lazy"';
    return \`<a href="\${SITE_URL}/books/\${htmlEscape(novel.slug)}" style="display:block;flex:0 0 auto"><img src="\${htmlEscape(src)}" alt="غلاف \${htmlEscape(novel.title)}" width="\${w}" height="\${h}" decoding="async"\${pri} style="border-radius:14px;object-fit:cover;background:#1a2140;width:\${w}px;height:\${h}px" /></a>\`;
  }).join("");
  return \`<div dir="rtl" class="min-h-screen overflow-x-hidden"><header class="sticky top-0 z-40 border-b border-border/70 bg-background/85"><div class="container flex h-[72px] items-center justify-between"><a href="/" aria-label="𝐄𝟳𝐤𝐞𝐭𝐡𝐚">𝐄𝟳𝐤𝐞𝐭𝐡𝐚</a><nav aria-label="التنقل الرئيسي"><a href="/explore">استكشف</a> <a href="/quotes">اقتباسات</a> <a href="/authors/ahmed-khaled-tawfik">المؤلفون</a></nav><a href="/login">تسجيل الدخول</a></div></header><main class="page-transition"><div><section class="relative z-20 overflow-visible bg-[#091027] text-white"><div class="container relative z-30 py-14 md:py-20"><div class="max-w-[640px]"><div class="mb-6">مساحة أهدأ لاكتشاف ما يستحق القراءة</div><h1 class="max-w-[650px] text-[43px] font-extrabold leading-[1.18]">اكتشف روايتك<br><span>القادمة.</span></h1><p class="mt-6 max-w-[490px] text-base leading-8 text-white/65">ابحث واستكشف مكتبة رواية الحية من أول فكرة لحد آخر صفحة.</p><div class="relative z-[60] mt-9 max-w-[610px]"><a href="/search">ابحث عن رواية</a></div></div></div></section><main class="relative z-0 container py-16"><section><h2>الروايات التي يتكلم عنها القرّاء</h2><div style="display:flex;gap:12px;flex-wrap:wrap;margin:16px 0 20px">\${coversHtml}</div><div><ul>\${novelItems}</ul></div></section><section class="mt-20"><h2>استكشف حسب مزاجك</h2><div></div></section><section class="mt-20"><h2>مؤلفون يستحقون الاكتشاف</h2><div></div></section><section class="mt-24"><h2>ربما تعجبك هذه الروايات</h2><div></div></section><section class="mt-20"><h2>السلاسل الأكثر متابعة</h2><div></div></section></main></div></main><footer class="mt-24 border-t border-border bg-card/55"><div class="container grid gap-10 py-14"><div><strong>𝐄𝟳𝐤𝐞𝐭𝐡𝐚.</strong><p>𝐄𝟳𝐤𝐞𝐭𝐡𝐚 تساعدك تفهم عالم الروايات العربية، وتلاقي ما يستحق وقتك.</p></div><nav><a href="/about">عن 𝐄𝟳𝐤𝐞𝐭𝐡𝐚</a> <a href="/contact">تواصل معنا</a> <a href="/privacy">سياسة الخصوصية</a></nav></div></footer><nav aria-label="التنقل السفلي"></nav></div>\`;
}`;

if (!shellRe.test(s)) {
  console.error("[patch-ssr-lcp] renderHomepageShell not found");
  process.exit(1);
}
s = s.replace(shellRe, newShell);

if (!s.includes("preloadImage: optimizeCoverUrl")) {
  s = s.replace(
    "canonical: `${origin}/`, image: `${origin}/e7ketha-cover-wide.png`, jsonLd:",
    "canonical: `${origin}/`, image: optimizeCoverUrl(novels[0]?.coverUrl, 1200) || `${origin}/e7ketha-cover-wide.png`, preloadImage: optimizeCoverUrl(novels[0]?.coverUrl, 400), jsonLd:",
  );
}

s = s.replaceAll(
  "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
  "public, max-age=0, s-maxage=900, stale-while-revalidate=1800",
);

fs.writeFileSync(f, s);
console.log("[patch-ssr-lcp] applied — LCP covers in homepage SSR");
