/** Client admin list UX patches at build time. */
import fs from 'node:fs';

function patchQuotesManager() {
  const f = 'client/src/pages/AdminQuotesManager.tsx';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('offset: (page - 1) * pageSize')) {
    console.log('[patch-admin-client] quotes already paginated');
    return;
  }
  if (!s.includes("from '@/components/AdminListControls'")) {
    s = "import { AdminSearch, AdminPager } from '@/components/AdminListControls';\n" + s;
  }
  const old = 'export default function AdminQuotesManager() {\n  const utils = trpc.useUtils();\n  const query = trpc.adminQuotes.list.useQuery();';
  const neu = `export default function AdminQuotesManager() {\n  const utils = trpc.useUtils();\n  const [q, setQ] = useState('');\n  const [page, setPage] = useState(1);\n  const pageSize = 30;\n  const query = trpc.adminQuotes.list.useQuery({ limit: pageSize, offset: (page - 1) * pageSize, q: q.trim() || undefined });\n  const quoteRows = Array.isArray(query.data) ? query.data : ((query.data as { items?: unknown[] } | undefined)?.items ?? []);\n  const quoteTotal = Array.isArray(query.data) ? query.data.length : Number((query.data as { total?: number } | undefined)?.total ?? 0);`;
  if (s.includes(old)) {
    s = s.replace(old, neu);
    s = s.replace('(query.data ?? []).map', '((quoteRows as any[]) ?? []).map');
    if (!s.includes('<AdminSearch')) {
      s = s.replace(
        '<div className="grid gap-3">{query.isLoading',
        `<div className="mb-4 flex flex-wrap items-center gap-3">\n      <AdminSearch value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="بحث في نص الاقتباس أو القائل أو الكتاب…" />\n      <AdminPager page={page} pageSize={pageSize} total={quoteTotal} onPage={setPage} />\n    </div>\n    <div className="grid gap-3">{query.isLoading`,
      );
    }
    fs.writeFileSync(f, s);
    console.log('[patch-admin-client] AdminQuotesManager');
  } else {
    console.log('[patch-admin-client] quotes pattern miss');
  }
}

function patchReports() {
  const f = 'client/src/pages/AdminReports.tsx';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('content.novels')) {
    console.log('[patch-admin-client] reports content exists');
    return;
  }
  if (!s.includes('const content =')) {
    s = s.replace(
      'const query = trpc.admin.reports.useQuery();',
      `const query = trpc.admin.reports.useQuery();\n  const content = (query.data as { content?: { novels: number; authors: number; quotes: number; articles: number; savedQuotes: number } } | undefined)?.content;`,
    );
  }
  const marker = '<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">';
  if (s.includes(marker) && !s.includes('{content &&')) {
    s = s.replace(
      marker,
      `{content && (\n        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">\n          <div className="rounded-[20px] border border-border bg-card p-5"><span className="text-xs text-muted-foreground">الروايات</span><strong className="mt-2 block text-3xl font-extrabold">{content.novels}</strong></div>\n          <div className="rounded-[20px] border border-border bg-card p-5"><span className="text-xs text-muted-foreground">الاقتباسات</span><strong className="mt-2 block text-3xl font-extrabold">{content.quotes}</strong></div>\n          <div className="rounded-[20px] border border-border bg-card p-5"><span className="text-xs text-muted-foreground">المؤلفون</span><strong className="mt-2 block text-3xl font-extrabold">{content.authors}</strong></div>\n          <div className="rounded-[20px] border border-border bg-card p-5"><span className="text-xs text-muted-foreground">المقالات / المحفوظ</span><strong className="mt-2 block text-3xl font-extrabold">{content.articles} / {content.savedQuotes}</strong></div>\n        </section>\n      )}\n      ` + marker,
    );
  }
  fs.writeFileSync(f, s);
  console.log('[patch-admin-client] AdminReports');
}

patchQuotesManager();
patchReports();
