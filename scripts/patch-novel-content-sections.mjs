import fs from 'fs';

function patch(path, apply) {
  if (!fs.existsSync(path)) {
    console.warn('[novel-content] skip missing', path);
    return;
  }
  let s = fs.readFileSync(path, 'utf8');
  const next = apply(s);
  if (next !== s) {
    fs.writeFileSync(path, next);
    console.log('[novel-content] patched', path);
  } else {
    console.log('[novel-content] no change', path);
  }
}

// 1) routers
patch('server/routers.ts', (s) => {
  if (!s.includes("from './novelDetails'") && !s.includes('from \"./novelDetails\"')) {
    s = s.replace(
      "import { createArticle,",
      "import { getNovelDetails, upsertNovelDetails } from './novelDetails';\nimport { createArticle,",
    );
    if (!s.includes('upsertNovelDetails')) {
      s = s.replace(
        "from './articles';",
        "from './articles';\nimport { getNovelDetails, upsertNovelDetails } from './novelDetails';",
      );
    }
  }
  if (!s.includes('details: await getNovelDetails')) {
    s = s.replace(
      'bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getNovelBySlug(input.slug)),',
      `bySlug: publicProcedure.input(novelSlugInput).query(async ({ input }) => {
      const novel = await getNovelBySlug(input.slug);
      if (!novel) return null;
      const details = await getNovelDetails(Number(novel.id)).catch(() => null);
      return { ...novel, details };
    }),`,
    );
  }
  if (!s.includes('details: z.object')) {
    s = s.replace(
      "const novelFields = z.object({ slug: z.string().min(1).max(160), title: z.string().min(1).max(255), authorId: z.number().int().positive(), coverUrl: z.string().url().max(500).optional(), description: z.string().max(10000).optional(), rightsNote: z.string().max(2000).optional(), parts: z.number().int().min(1).max(100).optional(), status: z.enum(['standalone', 'completed', 'ongoing']).optional(), publicationYear: z.number().int().min(0).max(3000).optional(), language: z.string().max(32).optional(), genreIds: z.array(z.number().int().positive()).max(30).optional(), links: z.array(novelLinkFields).max(20).optional() });",
      `const novelDetailFields = z.object({
  detailedSummary: z.string().max(20000).optional(),
  spoilerFreeSummary: z.string().max(20000).optional(),
  characters: z.string().max(20000).optional(),
  themes: z.string().max(20000).optional(),
  setting: z.string().max(20000).optional(),
  writingStyle: z.string().max(20000).optional(),
  literaryAnalysis: z.string().max(20000).optional(),
  whatMakesItDistinct: z.string().max(20000).optional(),
  recommendedFor: z.string().max(20000).optional(),
  notableDetails: z.string().max(20000).optional(),
  aboutAuthor: z.string().max(20000).optional(),
  similarWorks: z.string().max(20000).optional(),
  seriesGuide: z.string().max(20000).optional(),
  faq: z.string().max(20000).optional(),
  whereToRead: z.string().max(20000).optional(),
  keywords: z.string().max(2000).optional(),
}).partial();
const novelFields = z.object({ slug: z.string().min(1).max(160), title: z.string().min(1).max(255), authorId: z.number().int().positive(), coverUrl: z.string().url().max(500).optional(), description: z.string().max(10000).optional(), rightsNote: z.string().max(2000).optional(), parts: z.number().int().min(1).max(100).optional(), status: z.enum(['standalone', 'completed', 'ongoing']).optional(), publicationYear: z.number().int().min(0).max(3000).optional(), language: z.string().max(32).optional(), genreIds: z.array(z.number().int().positive()).max(30).optional(), links: z.array(novelLinkFields).max(20).optional(), details: novelDetailFields.optional() });`,
    );
  }
  if (!s.includes('upsertNovelDetails(Number(row.id)')) {
    s = s.replace(
      'create: adminProcedure.input(novelFields).mutation(({ input }) => createNovel(input)),',
      `create: adminProcedure.input(novelFields).mutation(async ({ input }) => {
        const { details, ...rest } = input;
        const row = await createNovel(rest);
        if (row?.id && details) await upsertNovelDetails(Number(row.id), details).catch((e) => console.warn('[novel-details]', e));
        return row;
      }),`,
    );
    s = s.replace(
      'update: adminProcedure.input(z.object({ id: z.number().int().positive(), data: novelFields.partial() })).mutation(({ input }) => updateNovel(input.id, input.data)),',
      `update: adminProcedure.input(z.object({ id: z.number().int().positive(), data: novelFields.partial() })).mutation(async ({ input }) => {
        const { details, ...rest } = input.data;
        const row = await updateNovel(input.id, rest);
        if (details) await upsertNovelDetails(input.id, details).catch((e) => console.warn('[novel-details]', e));
        return row;
      }),`,
    );
  }
  if (!s.includes('getDetails: adminProcedure')) {
    s = s.replace(
      'list: adminProcedure.query(() => listAdminNovels()),',
      `list: adminProcedure.query(() => listAdminNovels()),
      getDetails: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getNovelDetails(input.id)),`,
    );
  }
  if (s.includes('generateCluster:')) {
    s = s.replace(/\n\s*generateCluster: adminProcedure[\s\S]*?\.mutation\([\s\S]*?\),/, '\n');
  }
  return s;
});

// 2) Admin form
patch('client/src/pages/AdminNovelsManager.tsx', (s) => {
  if (!s.includes('DETAILED_FIELDS')) {
    s = s.replace(
      'const emptyForm = {',
      `const DETAILED_FIELDS = [
  ['detailedSummary', 'ملخص تفصيلي'],
  ['spoilerFreeSummary', 'ملخص بدون حرق'],
  ['characters', 'الشخصيات'],
  ['themes', 'الأفكار والثيمات'],
  ['setting', 'المكان والزمان'],
  ['writingStyle', 'أسلوب الكاتب'],
  ['literaryAnalysis', 'مراجعة وتحليل أدبي'],
  ['whatMakesItDistinct', 'ما يميز الرواية'],
  ['recommendedFor', 'هل تناسبك؟'],
  ['notableDetails', 'تفاصيل جديرة بالملاحظة'],
  ['aboutAuthor', 'عن الكاتب وعلاقته بالعمل'],
  ['similarWorks', 'أعمال مشابهة'],
  ['seriesGuide', 'دليل القراءة / ترتيب الأجزاء'],
  ['faq', 'أسئلة شائعة'],
  ['whereToRead', 'أين تقرأها قانونيًا؟'],
  ['keywords', 'كلمات مفتاحية (مفصولة بفواصل)'],
] as const;

const emptyDetails = Object.fromEntries(DETAILED_FIELDS.map(([k]) => [k, ''])) as Record<(typeof DETAILED_FIELDS)[number][0], string>;

const emptyForm = {`,
    );
    s = s.replace(
      "  publicationYear: '',\n};",
      "  publicationYear: '',\n  details: emptyDetails,\n};",
    );
  }
  if (!s.includes('trpc.admin.novels.getDetails')) {
    s = s.replace(
      'const novels = trpc.admin.novels.list.useQuery();',
      `const novels = trpc.admin.novels.list.useQuery();
  const detailsQ = trpc.admin.novels.getDetails.useQuery(
    { id: editingId! },
    { enabled: Boolean(editingId && Number.isFinite(editingId) && editingId > 0) },
  );`,
    );
    s = s.replace(
      'setPrefilledId(editingId);\n  }, [editingId, novels.data, prefilledId]);',
      `setPrefilledId(editingId);
  }, [editingId, novels.data, prefilledId]);

  useEffect(() => {
    if (!editingId || !detailsQ.data) return;
    const d = detailsQ.data;
    setForm((f) => ({
      ...f,
      details: {
        ...emptyDetails,
        ...Object.fromEntries(
          DETAILED_FIELDS.map(([k]) => [k, (d as any)[k] != null ? String((d as any)[k]) : '']),
        ),
      },
    }));
  }, [editingId, detailsQ.data]);`,
    );
  }
  if (!s.includes('details: Object.fromEntries')) {
    s = s.replace(
      'publicationYear: form.publicationYear ? Number(form.publicationYear) : undefined,\n      genreIds,\n    };',
      `publicationYear: form.publicationYear ? Number(form.publicationYear) : undefined,
      genreIds,
      details: Object.fromEntries(
        DETAILED_FIELDS.map(([k]) => [k, (form.details?.[k] ?? '').trim() || undefined]),
      ),
    };`,
    );
  }
  if (!s.includes('محتوى إضافي للرواية')) {
    const descNeedle = 'value={form.description}';
    const di = s.indexOf(descNeedle);
    if (di > 0) {
      const after = s.indexOf('</label>', di);
      if (after > 0) {
        const block = `
          <div className="md:col-span-2 mt-4 rounded-2xl border border-border bg-muted/30 p-4">
            <h3 className="mb-1 text-sm font-extrabold">محتوى إضافي للرواية (يظهر في الصفحة وللمحركات)</h3>
            <p className="mb-4 text-[11px] text-muted-foreground">اكتب بنفسك. الأقسام الفارغة لن تظهر للزائر ولا للبوت.</p>
            <div className="grid gap-3">
              {DETAILED_FIELDS.map(([key, label]) => (
                <label key={key} className="grid gap-1.5 text-xs font-bold">
                  <span>{label}</span>
                  <textarea
                    rows={key === 'keywords' ? 2 : 4}
                    value={form.details?.[key] ?? ''}
                    onChange={(e) => setForm({ ...form, details: { ...form.details, [key]: e.target.value } })}
                    className="min-h-[72px] rounded-xl border border-border bg-background px-3 py-2 text-sm font-normal leading-7"
                    placeholder={\`اكتب \${label}…\`}
                  />
                </label>
              ))}
            </div>
          </div>`;
        s = s.slice(0, after + 8) + block + s.slice(after + 8);
      }
    }
  }
  s = s.replace(/\s*<button type="button" disabled=\{generateCluster[\s\S]*?شبكة مقالات<\/button>/g, '');
  s = s.replace(/\s*const generateCluster = trpc\.admin\.articles\.generateCluster[\s\S]*?\}\);/g, '');
  return s;
});

// 3) NovelPage
patch('client/src/pages/NovelPage.tsx', (s) => {
  if (s.includes('data-content-sections-manual')) return s;
  const sig = 'function NovelDetails({ novel }: { novel: ReturnType<typeof toNovel> }) {';
  if (!s.includes(sig)) {
    console.warn('[novel-content] NovelDetails signature not found');
    return s;
  }
  const helper = `
  const details = novel.details;
  const contentSections = (() => {
    if (!details) return [] as Array<{ key: string; label: string; value: string }>;
    const fields: Array<[string, string]> = [
      ['detailedSummary', 'ملخص تفصيلي'],
      ['spoilerFreeSummary', 'ملخص بدون حرق'],
      ['characters', 'الشخصيات'],
      ['themes', 'الأفكار والثيمات'],
      ['setting', 'المكان والزمان'],
      ['writingStyle', 'أسلوب الكاتب'],
      ['literaryAnalysis', 'مراجعة وتحليل أدبي'],
      ['whatMakesItDistinct', 'ما يميز الرواية'],
      ['recommendedFor', 'هل تناسبك؟'],
      ['notableDetails', 'تفاصيل جديرة بالملاحظة'],
      ['aboutAuthor', 'عن الكاتب وعلاقته بالعمل'],
      ['similarWorks', 'أعمال مشابهة'],
      ['seriesGuide', 'دليل القراءة / ترتيب الأجزاء'],
      ['faq', 'أسئلة شائعة'],
      ['whereToRead', 'أين تقرأها قانونيًا؟'],
      ['keywords', 'كلمات مفتاحية'],
    ];
    return fields
      .map(([key, label]) => {
        const value = (details as Record<string, unknown>)[key];
        return typeof value === 'string' && value.trim() ? { key, label, value: value.trim() } : null;
      })
      .filter(Boolean) as Array<{ key: string; label: string; value: string }>;
  })();
`;
  s = s.replace(sig, sig + helper);
  const needle = "لا يوجد وصف منشور لهذه الرواية بعد.'}</p></div>";
  if (s.includes(needle) && !s.includes('data-content-sections-manual')) {
    s = s.replace(
      needle,
      `لا يوجد وصف منشور لهذه الرواية بعد.'}</p></div>
{contentSections.length > 0 ? (
  <div className="mt-6 space-y-4" data-content-sections-manual>
    {contentSections.map((sec) => (
      <section key={sec.key} className="rounded-[20px] border border-border bg-card p-5">
        <h2 className="mb-3 text-base font-extrabold">{sec.label}</h2>
        <p className="whitespace-pre-wrap text-sm leading-8 text-muted-foreground">{sec.value}</p>
      </section>
    ))}
  </div>
) : null}`,
    );
  }
  return s;
});

// 4) SSR fields
patch('scripts/patch-ssr-bot-html.mjs', (s) => {
  if (s.includes("['أسئلة شائعة', 'faq']")) return s;
  return s.replace(
    "['تفاصيل جديرة بالملاحظة', 'notableDetails'],",
    "['تفاصيل جديرة بالملاحظة', 'notableDetails'],\n      \"    ['عن الكاتب', 'aboutAuthor'], ['أعمال مشابهة', 'similarWorks'], ['دليل القراءة', 'seriesGuide'],\n      \"    ['أسئلة شائعة', 'faq'], ['أين تقرأها قانونيًا', 'whereToRead'],",
  );
});

// 5) skip auto generate cluster UI
patch('scripts/patch-article-cluster-wire.mjs', (s) => {
  if (s.includes('[article-cluster] skip generate UI')) return s;
  return s.replace(
    'patch(adminF, (s) => s.includes("generateCluster"), (s) => {',
    'patch(adminF, (s) => false && s.includes("generateCluster"), (s) => {\n  console.log("[article-cluster] skip generate UI");',
  );
});

// 6) toNovel passes details
patch('client/src/lib/data.ts', (s) => {
  if (s.includes('details?: Record<string, string | null>')) return s;
  s = s.replace(
    "links?: NovelLink[] };",
    "links?: NovelLink[]; details?: Record<string, string | null> | null };",
  );
  s = s.replace(
    "links?: NovelLink[] }): Novel {",
    "links?: NovelLink[]; details?: Record<string, string | null> | null }): Novel {",
  );
  s = s.replace(
    "links: row.links ?? [] };",
    "links: row.links ?? [], details: row.details ?? null };",
  );
  return s;
});

console.log('[novel-content] done');
