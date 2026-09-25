/**
 * Build-time: admin list pagination + content stats for reports.
 * Idempotent — safe to run every deploy.
 */
import fs from 'node:fs';

function patchQuotesTs() {
  const f = 'server/quotes.ts';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes('offset = 0, q?: string') && s.includes('export async function listQuotes(publicOnly = false, limit = 200, offset = 0)')) {
    s = s.replace(
      'export async function listQuotes(publicOnly = false, limit = 200, offset = 0) {',
      'export async function listQuotes(publicOnly = false, limit = 200, offset = 0, q?: string) {',
    );
    s = s.replace(
      "const page = await request<QuoteRecord[]>(`quotes?select=*&${publicOnly ? 'status=eq.published&' : ''}order=created_at.desc&limit=${Math.min(pageSize, requested - rows.length)}&offset=${cursor}`);",
      `const statusPart = publicOnly ? 'status=eq.published&' : '';\n    const needle = (q ?? '').trim().replace(/[%*,()]/g, ' ').slice(0, 80);\n    const searchPart = needle\n      ? \`or=(quote_text.ilike.*\${needle}*,speaker.ilike.*\${needle}*,book_title.ilike.*\${needle}*)&\`\n      : '';\n    const page = await request<QuoteRecord[]>(\`quotes?select=*&\${statusPart}\${searchPart}order=created_at.desc&limit=\${Math.min(pageSize, requested - rows.length)}&offset=\${cursor}\`);`,
    );
  }
  if (!s.includes('export async function countQuotes')) {
    const insertAfter = s.indexOf('export async function getQuote');
    if (insertAfter > 0) {
      const block = `\nexport async function countQuotes(publicOnly = false, q?: string) {\n  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) return 0;\n  const statusPart = publicOnly ? 'status=eq.published&' : '';\n  const needle = (q ?? '').trim().replace(/[%*,()]/g, ' ').slice(0, 80);\n  const searchPart = needle\n    ? \`or=(quote_text.ilike.*\${needle}*,speaker.ilike.*\${needle}*,book_title.ilike.*\${needle}*)&\`\n    : '';\n  const response = await fetch(\n    \`\${ENV.supabaseUrl}/rest/v1/quotes?\${statusPart}\${searchPart}select=id\`,\n    { method: 'HEAD', headers: { apikey: ENV.supabaseSecretKey, Authorization: \`Bearer \${ENV.supabaseSecretKey}\`, Prefer: 'count=exact' } },\n  );\n  const range = response.headers.get('content-range');\n  if (range && range.includes('/')) {\n    const total = Number(range.split('/')[1]);\n    if (Number.isFinite(total)) return total;\n  }\n  return (await listQuotes(publicOnly, 2000, 0, q)).length;\n}\n\n`;
      s = s.slice(0, insertAfter) + block + s.slice(insertAfter);
    }
  }
  fs.writeFileSync(f, s);
  console.log('[patch-admin-lists] quotes.ts');
}

function patchRouters() {
  const f = 'server/routers.ts';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes("from './quotes'") && !s.includes('countQuotes')) {
    s = s.replace(
      /import \{([^}]+)\} from '\.\/quotes'/,
      (m, inner) => {
        if (inner.includes('countQuotes')) return m;
        return `import { countQuotes, ${inner.trim()} } from './quotes'`;
      },
    );
  }
  if (s.includes('adminQuotes: router({') && !s.includes('offset: z.number().int().min(0).default(0), q:')) {
    s = s.replace(
      /adminQuotes: router\(\{\s*list: adminProcedure\.query\(\(\) => listQuotes\(false\)\),/,
      `adminQuotes: router({\n    list: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(30), offset: z.number().int().min(0).default(0), q: z.string().max(200).optional() }).optional()).query(async ({ input }) => {\n      const limit = input?.limit ?? 30;\n      const offset = input?.offset ?? 0;\n      const q = input?.q?.trim() || undefined;\n      const [items, total] = await Promise.all([listQuotes(false, limit, offset, q), countQuotes(false, q)]);\n      return { items, total, limit, offset };\n    }),`,
    );
  }
  if (!s.includes('getContentStats')) {
    s = s.replace('getAdminSummary, getAuthorBySlug', 'getAdminSummary, getContentStats, getAuthorBySlug');
    s = s.replace(
      'reports: adminProcedure.query(() => getAdminReports()),',
      `reports: adminProcedure.query(async () => {\n      const [reports, content] = await Promise.all([\n        getAdminReports().catch(() => ({ summary: { impressions: 0, clicks: 0, campaigns: 0, published: 0 }, activity: [], daily: [], topActors: [] })),\n        getContentStats().catch(() => null),\n      ]);\n      return { ...reports, content };\n    }),`,
    );
  }
  fs.writeFileSync(f, s);
  console.log('[patch-admin-lists] routers.ts');
}

function patchDb() {
  const f = 'server/db.ts';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('export async function getContentStats')) {
    console.log('[patch-admin-lists] db stats exists');
    return;
  }
  s += `\nexport async function getContentStats() {\n  const [novelsCount, authorsCount, genresCount, seriesCount, quotesCount, articlesCount, savedQuotesCount, usersCount] = await Promise.all([\n    supabaseCount('novels'),\n    supabaseCount('authors'),\n    supabaseCount('genres'),\n    supabaseCount('series'),\n    supabaseCount('quotes'),\n    supabaseCount('articles').catch(() => 0),\n    supabaseCount('saved_quotes').catch(() => 0),\n    supabaseCount('users').catch(() => 0),\n  ]);\n  let topNovels = [];\n  try {\n    topNovels = await supabaseRest('novels', 'select=id,title,slug,rating,ratingCount&order=ratingCount.desc.nullslast,rating.desc&limit=8');\n  } catch {\n    topNovels = [];\n  }\n  return { novels: novelsCount, authors: authorsCount, genres: genresCount, series: seriesCount, quotes: quotesCount, articles: articlesCount, savedQuotes: savedQuotesCount, users: usersCount, topNovels };\n}\n`;
  fs.writeFileSync(f, s);
  console.log('[patch-admin-lists] db.ts content stats');
}

patchQuotesTs();
patchRouters();
patchDb();
