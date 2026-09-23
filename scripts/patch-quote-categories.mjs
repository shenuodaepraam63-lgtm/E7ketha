/**
 * listQuoteCategories was loading listQuotes(10000)+enrichQuotes (~5s on production).
 * Replace with category-only REST scan + 10min memory cache + early exit.
 */
import fs from "node:fs";
import path from "node:path";

const target = path.resolve("server/quotes.ts");
let src = fs.readFileSync(target, "utf8");
const MARKER = "/* PATCH_QUOTE_CATEGORIES */";
if (src.includes(MARKER)) {
  console.log("[patch-quote-categories] already applied");
  process.exit(0);
}

const neu = `let categoriesCache: { expires: number; data: string[] } | null = null;
export async function listQuoteCategories() {
  ${MARKER}
  if (categoriesCache && categoriesCache.expires > Date.now()) return categoriesCache.data;
  const unique = new Set<string>();
  let stagnant = 0;
  // Select ONLY category — no full rows, no enrichQuotes (was ~5s on production).
  for (let offset = 0; offset < 30000 && unique.size < 500; offset += 1000) {
    const page = await request<Array<{ category: string | null }>>(
      \`quotes?status=eq.published&select=category&category=not.is.null&order=id.asc&limit=1000&offset=\${offset}\`,
    );
    const before = unique.size;
    for (const row of page) {
      const c = (row.category || "").trim();
      if (c) unique.add(c);
    }
    if (unique.size === before) stagnant += 1;
    else stagnant = 0;
    if (stagnant >= 2 && unique.size > 0) break;
    if (page.length < 1000) break;
  }
  const data = Array.from(unique).sort((a, b) => a.localeCompare(b, "ar"));
  categoriesCache = { data, expires: Date.now() + 10 * 60 * 1000 };
  return data;
}`;

const re = /export async function listQuoteCategories\(\) \{ return Array\.from\(new Set\(\(await listQuotes\(true, 10000\)\)[\s\S]*?localeCompare\(b,\s*['"]ar['"]\)\); \}/;
if (!re.test(src)) {
  console.error("[patch-quote-categories] listQuoteCategories pattern not found");
  process.exit(1);
}
src = src.replace(re, neu);
fs.writeFileSync(target, src);
console.log("[patch-quote-categories] applied — category-only + cache");
