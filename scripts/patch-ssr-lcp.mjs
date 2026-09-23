/**
 * Professional hybrid SSR (like marketing sites + React SPA):
 * 1) LCP covers live in #ssr-paint OUTSIDE #root — survive createRoot.
 * 2) __E7K_HOME_BOOT__ preloaded JSON so client skips cold API for first novels.
 * 3) Uses searchNovels(popular) so covers match the live homepage.
 * 4) Soft-dismiss of #ssr-paint is handled client-side after React paints.
 */
import fs from "node:fs";

const f = "server/app.ts";
if (!fs.existsSync(f)) {
  console.warn("[patch-ssr-lcp] missing server/app.ts");
  process.exit(0);
}
let s = fs.readFileSync(f, "utf8");
// Sanitize bad nested comments from older patch versions
s = s.replace(/\/\*\* \/\* SSR_PAINT_ISLAND \*\/ LCP-safe cover URLs for SSR \*\//g, "/* SSR_PAINT_ISLAND — LCP-safe cover URLs for SSR */");
s = s.replace(/\/\*\* \/\* SSR_PAINT_ISLAND \*\//g, "/* SSR_PAINT_ISLAND */");
if (s.includes("/* SSR_PAINT_ISLAND */") && s.includes("buildHomePaintIsland") && s.includes("paintHtml")) {
  console.log("[patch-ssr-lcp] already applied (paint island)");
  process.exit(0);
}

// --- optimizeCoverUrl helper ---
if (!s.includes("function optimizeCoverUrl(")) {
  const helper = `
/* SSR_PAINT_ISLAND — LCP-safe cover URLs for SSR */
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
  } catch { /* fallthrough */ }
  return src;
}

function buildHomePaintIsland(novels: Array<{ slug: string; title: string; coverUrl?: string | null }>) {
  const top = novels.slice(0, 4);
  const covers = top.map((novel, i) => {
    const src = optimizeCoverUrl(novel.coverUrl, i === 0 ? 400 : 200);
    const w = i === 0 ? 200 : 148;
    const h = i === 0 ? 300 : 222;
    const pri = i === 0 ? ' fetchpriority="high"' : ' loading="lazy"';
    return \`<a href="\${SITE_URL}/books/\${htmlEscape(novel.slug)}" style="display:block;flex:0 0 auto"><img src="\${htmlEscape(src)}" alt="غلاف \${htmlEscape(novel.title)}" width="\${w}" height="\${h}" decoding="async"\${pri} style="border-radius:14px;object-fit:cover;background:#1a2140;width:\${w}px;height:\${h}px" /></a>\`;
  }).join("");
  const boot = JSON.stringify(novels.slice(0, 12)).replace(/</g, "\\u003c");
  // Outside #root so createRoot/replaceChildren cannot destroy LCP (industry hybrid pattern).
  return \`<div id="ssr-paint" data-ssr-paint style="direction:rtl;padding:12px 16px 8px;background:#091027"><div style="max-width:1100px;margin:0 auto"><div style="display:flex;gap:12px;flex-wrap:wrap;margin:8px 0 4px">\${covers}</div></div></div><script type="application/json" id="__E7K_HOME_BOOT__">\${boot}</script>\`;
}

`;
  s = s.replace("function renderHomepageShell(", helper + "function renderHomepageShell(");
} else if (!s.includes("buildHomePaintIsland")) {
  const helper = `
/* SSR_PAINT_ISLAND */
function buildHomePaintIsland(novels: Array<{ slug: string; title: string; coverUrl?: string | null }>) {
  const top = novels.slice(0, 4);
  const covers = top.map((novel, i) => {
    const src = optimizeCoverUrl(novel.coverUrl, i === 0 ? 400 : 200);
    const w = i === 0 ? 200 : 148;
    const h = i === 0 ? 300 : 222;
    const pri = i === 0 ? ' fetchpriority="high"' : ' loading="lazy"';
    return \`<a href="\${SITE_URL}/books/\${htmlEscape(novel.slug)}" style="display:block;flex:0 0 auto"><img src="\${htmlEscape(src)}" alt="غلاف \${htmlEscape(novel.title)}" width="\${w}" height="\${h}" decoding="async"\${pri} style="border-radius:14px;object-fit:cover;background:#1a2140;width:\${w}px;height:\${h}px" /></a>\`;
  }).join("");
  const boot = JSON.stringify(novels.slice(0, 12)).replace(/</g, "\\u003c");
  return \`<div id="ssr-paint" data-ssr-paint style="direction:rtl;padding:12px 16px 8px;background:#091027"><div style="max-width:1100px;margin:0 auto"><div style="display:flex;gap:12px;flex-wrap:wrap;margin:8px 0 4px">\${covers}</div></div></div><script type="application/json" id="__E7K_HOME_BOOT__">\${boot}</script>\`;
}

`;
  s = s.replace("function renderHomepageShell(", helper + "function renderHomepageShell(");
}

s = s.replace(
  "function renderSeoDocument(template: string, input: { title: string; description: string; canonical: string; type?: string; image?: string; keywords?: string[]; jsonLd: unknown; content: string; status?: number }) {",
  "function renderSeoDocument(template: string, input: { title: string; description: string; canonical: string; type?: string; image?: string; preloadImage?: string; paintHtml?: string; keywords?: string[]; jsonLd: unknown; content: string; status?: number }) {",
);
if (!s.includes("paintHtml?: string")) {
  s = s.replace(
    "preloadImage?: string; keywords?: string[]",
    "preloadImage?: string; paintHtml?: string; keywords?: string[]",
  );
}
if (!s.includes("input.preloadImage")) {
  s = s.replace(
    "const head = `<title>${htmlEscape(input.title)}</title>",
    "const preload = input.preloadImage ? `<link rel=\"preload\" as=\"image\" href=\"${htmlEscape(input.preloadImage)}\" fetchpriority=\"high\">` : '';\n  const head = `${preload}<title>${htmlEscape(input.title)}</title>",
  );
}
if (!s.includes("input.paintHtml")) {
  s = s.replace(
    ".replace('<div id=\"root\"></div>', `<div id=\"root\">${input.content}</div>`)",
    ".replace('<div id=\"root\"></div>', `${input.paintHtml || ''}<div id=\"root\">${input.content}</div>`)",
  );
}

if (!s.includes("buildHomePaintIsland(novels)")) {
  const oldHome = /if \(normalized === '\/'\) \{[\s\S]*?content: renderHomepageShell\(novels\) \}\);\n  \}/;
  if (oldHome.test(s)) {
    s = s.replace(
      oldHome,
      `if (normalized === '/') {\n    const novels = await searchNovels({ sort: 'popular', limit: 12 });\n    const lcpCover = optimizeCoverUrl(novels[0]?.coverUrl, 400);\n    return renderSeoDocument(readClientTemplate(), { title: '𝐄𝟳𝐤𝐞𝐭𝐡𝐚 📖 | كُـل رِوَايـة لَهـا حِڪَايـة ✍︎', description: '𝐄𝟳𝐤𝐞𝐭𝐡𝐚 — منصة اكتشاف الروايات العربية. ابحث عن روايتك القادمة واستكشف المؤلفين والتصنيفات والاقتباسات.', canonical: \`\${origin}/\`, image: optimizeCoverUrl(novels[0]?.coverUrl, 1200) || \`\${origin}/e7ketha-cover-wide.png\`, preloadImage: lcpCover, paintHtml: buildHomePaintIsland(novels), jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: '𝐄𝟳𝐤𝐞𝐭𝐡𝐚', url: \`\${origin}/\`, description: 'منصة اكتشاف الروايات العربية', inLanguage: 'ar', potentialAction: { '@type': 'SearchAction', target: \`\${origin}/search?q={search_term_string}\`, 'query-input': 'required name=search_term_string' } }, content: renderHomepageShell(novels) });\n  }`,
    );
  } else {
    console.warn("[patch-ssr-lcp] homepage branch pattern not found — trying soft insert");
  }
}

s = s.replaceAll(
  "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
  "public, max-age=0, s-maxage=900, stale-while-revalidate=1800",
);

if (!s.includes("SSR_PAINT_ISLAND")) {
  s = s.replace("function optimizeCoverUrl", "/* SSR_PAINT_ISLAND */\nfunction optimizeCoverUrl");
}

fs.writeFileSync(f, s);
console.log("[patch-ssr-lcp] paint-island + home boot applied");
