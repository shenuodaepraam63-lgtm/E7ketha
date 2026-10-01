/**
 * Keywords: for search engines / admin only — never show as a section to readers or in bot body HTML.
 */
import fs from 'fs';

function patch(path, apply) {
  if (!fs.existsSync(path)) {
    console.warn('[hide-keywords] skip', path);
    return;
  }
  const s0 = fs.readFileSync(path, 'utf8');
  const next = apply(s0);
  if (next !== s0) {
    fs.writeFileSync(path, next);
    console.log('[hide-keywords] patched', path);
  } else {
    console.log('[hide-keywords] no change', path);
  }
}

// 1) Client NovelPage: remove keywords from visible sections
patch('client/src/pages/NovelPage.tsx', (s) => {
  if (s.includes('keywords meta-only')) return s;
  s = s.replace(/\s*\['keywords', 'كلمات مفتاحية'\],\n?/g, '\n      /* keywords meta-only */\n');
  return s;
});

// 2) novelDetails helper used by any public renderer
patch('server/novelDetails.ts', (s) => {
  if (s.includes("key === 'keywords'")) return s;
  const needle = 'return NOVEL_DETAIL_FIELDS.map(([key, label]) => {';
  if (!s.includes(needle)) return s;
  s = s.replace(
    needle,
    "return NOVEL_DETAIL_FIELDS.map(([key, label]) => {\n    if (key === 'keywords') return null;",
  );
  return s;
});

// 3) Source template for SSR helper
patch('scripts/patch-ssr-bot-html.mjs', (s) => {
  const oldKw =
    "\"  const keywords = typeof details.keywords === 'string' && details.keywords.trim() ? '<p><strong>كلمات مفتاحية:</strong> ' + htmlEscape(details.keywords) + '</p>' : '';\",";
  const newKw = "\"  const keywords = ''; // meta-only, not shown in body\",";
  if (s.includes(oldKw)) return s.replace(oldKw, newKw);
  return s;
});

// 4) app.ts after bot-html injected the helper — strip visible keywords paragraph
patch('server/app.ts', (s) => {
  if (!s.includes('كلمات مفتاحية') && !s.includes('renderNovelDetailsHtml')) return s;
  s = s.replace(
    /const keywords = typeof details\.keywords === 'string' && details\.keywords\.trim\(\) \? '<p><strong>كلمات مفتاحية:<\/strong> ' \+ htmlEscape\(details\.keywords\) \+ '<\/p>' : '';/g,
    "const keywords = '';",
  );
  return s;
});

console.log('[hide-keywords] done');
