import fs from 'node:fs';
function once(f,m,fn){if(!fs.existsSync(f))return;let s=fs.readFileSync(f,'utf8');if(s.includes(m)){console.log('skip',m);return;}fs.writeFileSync(f,fn(s));console.log('ok',m);}
once('server/seoPublicPages.ts','SSR_RICH_LISTS_SKIP',s=>{
  s=s.replace("'/explore':","'/_legacy_explore_unused':").replace("'/articles':","'/_legacy_articles_unused':");
  return '/* SSR_RICH_LISTS_SKIP */\n'+s;
});
once('server/app.ts','SSR_RICH_LISTS_IMPORT',s=>{
  if(s.includes('listPublishedArticles')) return s.includes('SSR_RICH_LISTS_IMPORT')?s:s+'\n/* SSR_RICH_LISTS_IMPORT */\n';
  return s.replace('import { getAuthorBySlug','import { listPublishedArticles } from "./articles";\n/* SSR_RICH_LISTS_IMPORT */\nimport { getAuthorBySlug');
});
once('server/app.ts','SSR_RICH_LISTS_ROUTES_REG',s=>{
  const n="app.get(['/quotes', '/quotes/', '/quotes/categories'], directSeoHandler);";
  if(!s.includes(n)||s.includes('SSR_RICH_LISTS_ROUTES_REG')) return s;
  return s.replace(n,n+"\n  app.get(['/explore', '/articles', '/search'], directSeoHandler); /* SSR_RICH_LISTS_ROUTES_REG */");
});
console.log('[ssr-rich-a] done');
