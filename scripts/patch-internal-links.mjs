/** Wire novels.related + replace weak NovelRecommendations. Idempotent. */
import fs from 'node:fs';

function patchRouters() {
  const f = 'server/routers.ts';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes("from './related'")) {
    s = "import { getRelatedForNovel } from './related';\n" + s;
  }
  if (!s.includes('related: publicProcedure')) {
    s = s.replace(
      'bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getNovelBySlug(input.slug)),',
      `bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getNovelBySlug(input.slug)),\n    related: publicProcedure.input(novelSlugInput).query(({ input }) => getRelatedForNovel(input.slug)),`,
    );
  }
  fs.writeFileSync(f, s);
  console.log('[patch-internal-links] routers');
}

function patchNovelPage() {
  const f = 'client/src/pages/NovelPage.tsx';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  if (s.includes('novels.related.useQuery')) {
    console.log('[patch-internal-links] NovelPage already');
    return;
  }
  const old = `function NovelRecommendations({ currentSlug }: { currentSlug: string }) {\n  const query = trpc.novels.search.useQuery({ sort: 'popular', limit: 5 });\n  const items = (query.data ?? []).filter((item) => item.slug !== currentSlug).slice(0, 4).map(toNovel);\n  return <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">{items.map((item) => <NovelCard key={item.id} novel={item} />)}</div>;\n}`;
  const neu = `function NovelRecommendations({ currentSlug }: { currentSlug: string }) {\n  const query = trpc.novels.related.useQuery({ slug: currentSlug }, { staleTime: 300_000 });\n  if (query.isLoading) {\n    return <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[2/3] animate-pulse rounded-2xl bg-muted" />)}</div>;\n  }\n  const similar = query.data?.similarNovels ?? [];\n  const authors = query.data?.relatedAuthors ?? [];\n  const articles = query.data?.relatedArticles ?? [];\n  if (!similar.length && !authors.length && !articles.length) {\n    return <p className="text-xs text-muted-foreground">لا توجد اقتراحات مرتبطة حاليًا.</p>;\n  }\n  return (\n    <div className="grid gap-10">\n      {similar.length > 0 && (\n        <div>\n          <h3 className="mb-4 text-sm font-extrabold">روايات قد تعجبك</h3>\n          <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">\n            {similar.slice(0, 8).map((row) => (\n              <NovelCard key={row.id} novel={toNovel({ id: row.id, slug: row.slug, title: row.title, coverUrl: row.coverUrl, description: row.description, rating: row.rating, parts: row.parts, status: row.status, author: row.author, authorSlug: row.authorSlug })} />\n            ))}\n          </div>\n        </div>\n      )}\n      {authors.length > 0 && (\n        <div>\n          <h3 className="mb-4 text-sm font-extrabold">مؤلفون ذوو صلة</h3>\n          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">\n            {authors.map((a) => (\n              <Link key={a.id} href={\`/authors/\${a.slug}\`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-[#675de8]/40">\n                <span className="grid size-12 place-items-center rounded-2xl bg-[#efeeff] text-sm font-extrabold text-[#675de8]">{(a.name || '?').slice(0, 1)}</span>\n                <div className="min-w-0"><strong className="block truncate text-sm">{a.name}</strong><span className="text-[11px] text-muted-foreground">{a.reason}</span></div>\n              </Link>\n            ))}\n          </div>\n        </div>\n      )}\n      {articles.length > 0 && (\n        <div>\n          <h3 className="mb-4 text-sm font-extrabold">مقالات مرتبطة</h3>\n          <div className="grid gap-3 sm:grid-cols-2">\n            {articles.map((art) => (\n              <Link key={art.id} href={\`/articles/\${art.slug}\`} className="rounded-2xl border border-border bg-card p-4 transition hover:border-[#675de8]/40">\n                <strong className="block text-sm font-extrabold leading-6">{art.title}</strong>\n                {art.excerpt && <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{art.excerpt}</p>}\n                <span className="mt-2 inline-block text-[10px] font-bold text-[#675de8]">{art.reason}</span>\n              </Link>\n            ))}\n          </div>\n        </div>\n      )}\n    </div>\n  );\n}`;
  if (s.includes(old)) {
    s = s.replace(old, neu);
  } else if (s.includes('function NovelRecommendations')) {
    s = s.replace(/function NovelRecommendations\([\s\S]*?\n\}\n(?=function Stat|\s*$)/, neu + '\n');
  }
  s = s.replace(
    'title="المزيد من الروايات" subtitle="اكتشف بقية مكتبة رِواية من قاعدة البيانات."',
    'title="اكتشف ما يتصل بهذه الرواية" subtitle="روابط داخلية تلقائية: روايات مشابهة، مؤلفون، ومقالات."',
  );
  fs.writeFileSync(f, s);
  console.log('[patch-internal-links] NovelPage');
}

patchRouters();
patchNovelPage();
