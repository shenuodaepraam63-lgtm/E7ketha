#!/usr/bin/env node
/**
 * Critical SEO fixes applied after app.ts restore:
 * - Remove /books/:slug/quotes and /authors/:slug/quotes from sitemaps (soft-404 pollution)
 * Soft no-op if already clean or file missing markers.
 */
import fs from "node:fs";
import path from "node:path";

const target = path.resolve("server/app.ts");
if (!fs.existsSync(target)) {
  console.warn("[patch-seo-critical] server/app.ts missing — skip");
  process.exit(0);
}

let src = fs.readFileSync(target, "utf8");
const before = src;

src = src.replace(
  /^\s*const authorQuotePaths = authors\.map\(\(item\) => `\/authors\/\$\{item\.slug\}\/quotes`\);\s*\n/m,
  "",
);
src = src.replace(
  /^\s*const bookQuotePaths = novels\.map\(\(item\) => `\/books\/\$\{item\.slug\}\/quotes`\);\s*\n/m,
  "",
);

src = src.replace(/,?\s*\.\.\.bookQuotePaths/g, "");
src = src.replace(/,?\s*\.\.\.authorQuotePaths/g, "");

src = src.replace(
  /resource === "novels" \? renderUrlset\(\[\.\.\.novels\.map\(\(item\) => `\/books\/\$\{item\.slug\}`\), \.\.\.bookQuotePaths\]\)/,
  'resource === "novels" ? renderUrlset(novels.map((item) => `/books/${item.slug}`))',
);
src = src.replace(
  /resource === "novels" \? renderUrlset\(\[\.\.\.novels\.map\(\(item\) => `\/books\/\$\{item\.slug\}`\)\]\)/,
  'resource === "novels" ? renderUrlset(novels.map((item) => `/books/${item.slug}`))',
);

src = src.replace(
  /resource === "authors" \? renderUrlset\(\[\.\.\.authors\.map\(\(item\) => `\/authors\/\$\{item\.slug\}`\), \.\.\.authorQuotePaths\]\)/,
  'resource === "authors" ? renderUrlset(authors.map((item) => `/authors/${item.slug}`))',
);
src = src.replace(
  /resource === "authors" \? renderUrlset\(\[\.\.\.authors\.map\(\(item\) => `\/authors\/\$\{item\.slug\}`\)\]\)/,
  'resource === "authors" ? renderUrlset(authors.map((item) => `/authors/${item.slug}`))',
);

if (src === before) {
  console.log("[patch-seo-critical] no changes needed");
} else {
  fs.writeFileSync(target, src);
  console.log("[patch-seo-critical] applied sitemap cleanup");
}
process.exit(0);
