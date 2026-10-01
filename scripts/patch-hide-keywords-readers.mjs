/**
 * Keywords: search engines only — hide from reader UI and visible bot body text.
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
  } else console.log('[hide-keywords] no change', path);
}

// 1) Client: exclude keywords from visible sections
patch('client/src/pages/NovelPage.tsx', (s) => {
  if (s.includes('keywords meta-only')) return s;
  s = s.replace(/\s*\['keywords', 'كلمات مفتاحية'\],\n?/g, '\n      /* keywords meta-only */\n');
  if (s.includes('contentSections = (() =>') && !s.includes("x.key !== 'keywords'")) {
    s = s.replace(
      '.filter(Boolean) as Array<{ key: string; label: string; value: string }>;',
      ".filter((x): x is { key: string; label: string; value: string } => Boolean(x) && x.key !== 'keywords');",
    );
  }
  return s;
});

// 2) novelDetails public sections helper
patch('server/novelDetails.ts', (s) => {
  if (s.includes("key === 'keywords'")) return s;
  s = s.replace(
    'return NOVEL_DETAIL_FIELDS.map(([key, label]) => {\n    const value = (details as any)[key];\n    if (typeof value !== \'string\' || !value.trim()) return null;\n    return { key, label, value: value.trim() };\n  }).filter(Boolean)',
    `return NOVEL_DETAIL_FIELDS.map(([key, label]) => {
    if (key === 'keywords') return null; // search engines only
    const value = (details as any)[key];
    if (typeof value !== 'string' || !value.trim()) return null;
    return { key, label, value: value.trim() };
  }).filter(Boolean)`,
  );
  return s;
});

// 3) SSR helper source (for future rebuilds of this file)
patch('scripts/patch-ssr-bot-html.mjs', (s) => {
  const oldKw =
    `"  const keywords = typeof details.keywords === 'string' && details.keywords.trim() ? '<p><strong>كلمات مفتاحية:</strong> ' + htmlEscape(details.keywords) + '</p>' : '';",`;
  const newKw = `"  const keywords = ''; // keywords are meta-only, not visible body text",`;
  if (s.includes(oldKw)) s = s.replace(oldKw, newKw);
  return s;
});

// 4) Live app.ts after SSR bot patch injected the helper
patch('server/app.ts', (s) => {
  if (!s.includes('function renderNovelDetailsHtml') && !s.includes('كلمات مفتاحية')) return s;
  s = s.replace(
    /const keywords = typeof details\.keywords === 'string' && details\.keywords\.trim\(\) \? '<p><strong>كلمات مفتاحية:<\/strong> ' \+ htmlEscape\(details\.keywords\) \+ '<\/p>' : '';/g,
    "const keywords = '';",
  );
  // Inject meta keywords into head when renderSeoDocument builds head
  if (s.includes('function renderSeoDocument') && !s.includes('name="keywords"')) {
    const patterns = [
      /(<meta name="description" content="\$\{[^}]+\}"\s*\/?>)/,
      /(<meta name='description' content='\$\{[^}]+\}'\s*\/?>)/,
    ];
    for (const re of patterns) {
      if (re.test(s)) {
        s = s.replace(
          re,
          `$1\n    \${Array.isArray(input.keywords) && input.keywords.length ? \`<meta name="keywords" content="\${htmlEscape(input.keywords.join(', '))}\">\` : ''}`,
        );
        break;
      }
    }
  }
  // Pass keywords from novelDetails into novel page SEO
  if (s.includes('richDetailsHtml') && !s.includes('novelMetaKeywords')) {
    s = s.replace(
      'const richDetailsHtml = renderNovelDetailsHtml(novelDetails);',
      `const richDetailsHtml = renderNovelDetailsHtml(novelDetails);
    const novelMetaKeywords = (novelDetails && typeof novelDetails.keywords === 'string' && novelDetails.keywords.trim())
      ? novelDetails.keywords.split(/[,،]/).map((x) => x.trim()).filter(Boolean).slice(0, 40)
      : undefined;`,
    );
    if (s.includes('novelMetaKeywords') && !s.includes('keywords: novelMetaKeywords')) {
      s = s.replace(
        /(return renderSeoDocument\(readClientTemplate\(\), \{)(\s*title:\s*`\$\{novel\.title\})/,
        '$1
      keywords: novelMetaKeywords,$2',
      );
    }
  }
  return s;
});

console.log('[hide-keywords] done');
