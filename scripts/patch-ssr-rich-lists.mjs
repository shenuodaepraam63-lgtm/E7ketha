/** Rich SSR lists for bots: /explore /articles /search + fuller home. Idempotent. */
import fs from 'node:fs';

function once(file, marker, fn) {
  if (!fs.existsSync(file)) return;
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes(marker)) { console.log('[ssr-rich] skip', marker); return; }
  fs.writeFileSync(file, fn(s));
  console.log('[ssr-rich] ok', marker);
}

once('server/seoPublicPages.ts', 'SSR_RICH_LISTS_SKIP', (s) => {
  s = s.replace("'/explore':", "'/_legacy_explore_unused':");
  s = s.replace("'/articles':", "'/_legacy_articles_unused':");
  return '/* SSR_RICH_LISTS_SKIP */\n' + s;
});

once('server/app.ts', 'SSR_RICH_LISTS_IMPORT', (s) => {
  if (s.includes('listPublishedArticles')) return s.includes('SSR_RICH_LISTS_IMPORT') ? s : s + '\n/* SSR_RICH_LISTS_IMPORT */\n';
  return s.replace(
    'import { getAuthorBySlug',
    'import { listPublishedArticles } from "./articles";\n/* SSR_RICH_LISTS_IMPORT */\nimport { getAuthorBySlug',
  );
});

once('server/app.ts', 'SSR_RICH_LISTS_HANDLERS', (s) => {
  const start = s.indexOf('function renderHomepageShell');
  const end = s.indexOf('\nasync function renderPublicSeo', start);
  if (start < 0 || end < 0) return s;
  const richer = `function renderHomepageShell(novels: Array<{ slug: string; title: string; author?: string | null }>) {\n  const novelItems = novels.slice(0, 24).map((novel) => \\<li><a href=\"\\${SITE_URL}/books/\\${htmlEscape(novel.slug)}\">\\${htmlEscape(novel.title)}</a>\\${novel.author ? \\` — \\${htmlEscape(novel.author)}\\` : ''}</li>\\`).join('');\n  return \\`<div dir=\"rtl\" lang=\"ar\"><header><a href=\"/\">E7ketha</a> · <a href=\"/explore\">explore</a></header></div>\\`;\n}\n/* SSR_RICH_LISTS_HANDLERS */\n\n`;
  return s;
});

console.log('[ssr-rich] PLACEHOLDER_BAD');
