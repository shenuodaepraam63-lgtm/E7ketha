#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
function patch(file, test, fn) {
  if (!fs.existsSync(file)) return;
  let s = fs.readFileSync(file, "utf8");
  if (test(s)) { console.log("[article-cluster] skip", path.basename(file)); return; }
  fs.writeFileSync(file, fn(s));
  console.log("[article-cluster] patched", path.basename(file));
}
const eng = path.join(root, "server/articleCluster.ts");
if (!fs.existsSync(eng) || !fs.readFileSync(eng, "utf8").includes("generateClusterDrafts")) {
  console.error("[article-cluster] missing server/articleCluster.ts with generateClusterDrafts");
  process.exit(1);
}
patch(path.join(root, "server/routers.ts"), (s) => s.includes("generateCluster"), (s) => {
  if (!s.includes("articleCluster")) s = s.replace("from './articles';", "from './articles';\nimport { generateClusterDrafts, listClusterArticlesForNovel } from './articleCluster';");
  const needle = "delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteArticle(input.id)),\n    }),";
  const insert = `delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteArticle(input.id)),
      generateCluster: adminProcedure
        .input(z.object({
          novelId: z.number().int().positive().optional(),
          slug: z.string().min(1).max(200).optional(),
          force: z.boolean().optional(),
          types: z.array(z.enum(['overview','summary','characters','themes','analysis','similar','author','reading-guide','faq','where-to-read'])).optional(),
        }).refine((v) => Boolean(v.novelId || v.slug), { message: 'novelId أو slug مطلوب' }))
        .mutation(({ input }) => generateClusterDrafts(input)),
      listCluster: adminProcedure.input(z.object({ novelId: z.number().int().positive() })).query(({ input }) => listClusterArticlesForNovel(input.novelId)),
    }),`;
  if (s.includes(needle)) s = s.replace(needle, insert);
  if (!s.includes("clusterArticles:")) {
    s = s.replace(
      "related: publicProcedure.input(novelSlugInput).query(({ input }) => getRelatedForNovel(input.slug)),",
      `related: publicProcedure.input(novelSlugInput).query(({ input }) => getRelatedForNovel(input.slug)),
    clusterArticles: publicProcedure.input(novelSlugInput).query(async ({ input }) => {
      const novel = await getNovelBySlug(input.slug);
      if (!novel) return [];
      const { listPublishedClusterForNovel } = await import('./articleCluster');
      return listPublishedClusterForNovel(Number(novel.id));
    }),`,
    );
  }
  return s;
});
patch(path.join(root, "server/articles.ts"), (s) => s.includes("clusterType: string | null"), (s) => {
  s = s.replace("  updatedAt: string;\n};", "  updatedAt: string;\n  novelId: number | null;\n  clusterType: string | null;\n};");
  s = s.replace("  publishedAt?: string | null;\n};", "  publishedAt?: string | null;\n  novelId?: number | null;\n  clusterType?: string | null;\n};");
  s = s.replace("    updatedAt: row.updatedAt,\n  };", "    updatedAt: row.updatedAt,\n    novelId: row.novelId == null ? null : Number(row.novelId),\n    clusterType: row.clusterType ?? null,\n  };");
  if (!s.includes("novelId: input.novelId")) s = s.replace("    tags: input.tags ?? null,", "    tags: input.tags ?? null,\n    novelId: input.novelId ?? null,\n    clusterType: input.clusterType ?? null,");
  if (!s.includes("input.novelId !== undefined")) s = s.replace("  if (input.tags !== undefined) payload.tags = input.tags;", "  if (input.tags !== undefined) payload.tags = input.tags;\n  if (input.novelId !== undefined) payload.novelId = input.novelId;\n  if (input.clusterType !== undefined) payload.clusterType = input.clusterType;");
  return s;
});
patch(path.join(root, "server/related.ts"), (s) => s.includes("mergedArticles"), (s) => {
  if (!s.includes("listPublishedClusterForNovel")) s = "import { listPublishedClusterForNovel } from './articleCluster';\n" + s;
  if (!s.includes("const clusterArticles = await listPublishedClusterForNovel")) {
    s = s.replace("  const novelId = Number(novel.id);", "  const novelId = Number(novel.id);\n  const clusterArticles = await listPublishedClusterForNovel(novelId).catch(() => []);");
  }
  return s.replace(
    "  return { similarNovels, relatedAuthors, relatedArticles };",
    `  const clusterAsArticles = (clusterArticles || []).map((a) => ({
    id: a.id, slug: a.slug, title: a.title, excerpt: a.excerpt, coverUrl: a.coverUrl,
    reason: a.label || 'ضمن شبكة الرواية',
  }));
  const mergedArticles = [...clusterAsArticles, ...relatedArticles]
    .filter((a, i, arr) => arr.findIndex((x) => x.slug === a.slug) === i)
    .slice(0, 12);
  return { similarNovels, relatedAuthors, relatedArticles: mergedArticles };`,
  );
});
const adminF = path.join(root, "client/src/pages/AdminNovelsManager.tsx");
patch(adminF, (s) => s.includes("generateCluster"), (s) => {
  s = s.replace(
    "  const remove = trpc.admin.novels.delete.useMutation({",
    `  const generateCluster = trpc.admin.articles.generateCluster.useMutation({
    onSuccess: (res) => {
      toast.success(\`شبكة المقالات: \${res?.created?.length ?? 0} مسودة، \${res?.skipped?.length ?? 0} موجود\`);
      void utils.admin.articles.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const remove = trpc.admin.novels.delete.useMutation({`,
  );
  s = s.replace(
    '              <button type="button" onClick={() => navigate(novelEditHref(novel.id))}',
    `              <button type="button" disabled={generateCluster.isPending} onClick={() => { if (window.confirm('توليد 10 مسودات مقالات؟ لن تُنشر تلقائيًا.')) generateCluster.mutate({ novelId: novel.id }); }} className="rounded-lg px-2 py-1 text-[10px] font-bold text-[#675de8] hover:bg-muted">شبكة مقالات</button>
              <button type="button" onClick={() => navigate(novelEditHref(novel.id))}`,
  );
  return s;
});
console.log("[article-cluster] wire done");
