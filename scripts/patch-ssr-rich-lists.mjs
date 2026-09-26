/**
 * Rich bot-visible SSR for /explore, /articles, /search + richer homepage.
 * Runs at build time; idempotent.
 */
import fs from 'node:fs';

function once(file, marker, apply) {
  if (!fs.existsSync(file)) return;
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes(marker)) {
    console.log('[ssr-rich]', file, 'already has', marker);
    return;
  }
  s = apply(s);
  fs.writeFileSync(file, s);
  console.log('[ssr-rich]', file, 'applied', marker);
}

// 1) Remove /explore and /articles from static PAGES so createApp can SSR lists
once('server/seoPublicPages.ts', 'SSR_RICH_LISTS_SKIP', (s) => {
  s = s.replace("'/explore':", "'/_legacy_explore_unused':");
  s = s.replace("'/articles':", "'/_legacy_articles_unused':");
  return '/* SSR_RICH_LISTS_SKIP */\n' + s;
});

// 2) app.ts — import articles list
once('server/app.ts', 'SSR_RICH_LISTS_IMPORT', (s) => {
  if (!s.includes('from \./articles') && !s.includes('from "./articles"')) {
    s = s.replace(
      'import { getAuthorBySlug',
      'import { listPublishedArticles } from "./articles";\n/* SSR_RICH_LISTS_IMPORT */\nimport { getAuthorBySlug',
    );
  } else if (!s.includes('SSR_RICH_LISTS_IMPORT')) {
    s = s.replace('from "./articles"', 'from "./articles"; /* SSR_RICH_LISTS_IMPORT */');
    if (!s.includes('listPublishedArticles')) {
      s = s.replace(
        'import { getAuthorBySlug',
        'import { listPublishedArticles } from "./articles";\n/* SSR_RICH_LISTS_IMPORT */\nimport { getAuthorBySlug',
      );
    }
  }
  return s;
});

// 3) Enrich homepage shell + add /explore /articles /search handlers
once('server/app.ts', 'SSR_RICH_LISTS_HANDLERS', (s) => {
  if (s.includes('function renderHomepageShell(novels:')) {
    const start = s.indexOf('function renderHomepageShell');
    const end = s.indexOf('\nasync function renderPublicSeo', start);
    if (start >= 0 && end > start) {
      const richer = `function renderHomepageShell(novels: Array<{ slug: string; title: string; author?: string | null }>) {
  const novelItems = novels.slice(0, 24).map((novel) => \`<li><a href=\