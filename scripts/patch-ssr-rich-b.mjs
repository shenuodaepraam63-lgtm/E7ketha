import fs from 'node:fs';
const f='server/app.ts';
if(!fs.existsSync(f)) process.exit(0);
let s=fs.readFileSync(f,'utf8');
if(!s.includes('SSR_RICH_LISTS_B')){
  if(!s.includes('tryRichListSeo')){
    s=s.replace(
      'import { getAuthorBySlug',
      'import { tryRichListSeo, renderRichHomepageShell } from "./ssrListPages";\n/* SSR_RICH_LISTS_B */\nimport { getAuthorBySlug'
    );
  }
  const marker="content: renderHomepageShell(novels) });\n  }";
  if(s.includes(marker) && !s.includes('tryRichListSeo(normalized')){
    const inject=`content: renderRichHomepageShell(origin, novels) });
  }

  const richList = await tryRichListSeo(normalized, origin);
  if (richList) {
    return renderSeoDocument(readClientTemplate(), richList);
  }`;
    if(s.includes('renderHomepageShell(novels)')){
      s=s.replace(
        "content: renderHomepageShell(novels) });\n  }",
        inject
      );
    }
  }
  if(!s.includes('SSR_RICH_LISTS_B')) s='/* SSR_RICH_LISTS_B */\n'+s;
  fs.writeFileSync(f,s);
  console.log('[ssr-rich-b] wired');
} else console.log('[ssr-rich-b] skip');
