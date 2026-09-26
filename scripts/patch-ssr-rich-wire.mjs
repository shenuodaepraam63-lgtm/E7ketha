import fs from 'node:fs';
function once(file, marker, fn) {
  if (!fs.existsSync(file)) return;
  let s = fs.readFileSync(file, 'utf8');
  if (s.includes(marker)) { console.log('skip', marker); return; }
  fs.writeFileSync(file, fn(s));
  console.log('ok', marker);
}
once('server/seoPublicPages.ts', 'SSR_RICH_LISTS_SKIP', (s) => {
  s = s.replace("'/explore':", "'/_legacy_explore_unused':");
  s = s.replace("'/articles':", "'/_legacy_articles_unused':");
  return '/* SSR_RICH_LISTS_SKIP */\n' + s;
});
once('server/app.ts', 'SSR_RICH_LISTS_B', (s) => {
  if (!s.includes('tryRichListSeo')) {
    s = s.replace('import { getAuthorBySlug', 'import { tryRichListSeo, renderRichHomepageShell } from "./ssrListPages";\n/* SSR_RICH_LISTS_B */\nimport { getAuthorBySlug');
  }
  const old = "content: renderHomepageShell(novels) });\n  }";
  if (s.includes(old) && !s.includes('tryRichListSeo(normalized')) {
    s = s.replace(old, "content: renderRichHomepageShell(origin, novels) });\n  }\n\n  const richList = await tryRichListSeo(normalized, origin);\n  if (richList) {\n    return renderSeoDocument(readClientTemplate(), richList);\n  }");
  }
  return s;
});
once('server/app.ts', 'SSR_RICH_LISTS_ROUTES_REG', (s) => {
  const n = "app.get(['/quotes', '/quotes/', '/quotes/categories'], directSeoHandler);";
  if (!s.includes(n) || s.includes('SSR_RICH_LISTS_ROUTES_REG')) return s;
  return s.replace(n, n + "\n  app.get(['/explore', '/articles', '/search'], directSeoHandler); /* SSR_RICH_LISTS_ROUTES_REG */");
});
console.log('[ssr-rich-wire] done');
