/** Wire analytics router + Admin visitors section. Idempotent. */
import fs from 'node:fs';

function patchRouters() {
  const f = 'server/routers.ts';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes("from './analytics'")) {
    s = "import { getVisitorAnalytics, trackPageView } from './analytics';\n" + s;
  }
  if (!s.includes('analytics: router')) {
    s = s.replace(
      '  novels: router({',
      `  analytics: router({
    trackPageView: publicProcedure
      .input(z.object({
        visitorId: z.string().min(8).max(64),
        pagePath: z.string().min(1).max(300),
        pageType: z.string().max(40).optional(),
        entitySlug: z.string().max(200).optional().nullable(),
        userId: z.number().int().positive().optional().nullable(),
        referrer: z.string().max(400).optional().nullable(),
        siteHost: z.string().max(120).optional().nullable(),
      }))
      .mutation(({ input }) => trackPageView(input)),
  }),
  novels: router({`,
    );
  } else if (!s.includes('referrer: z.string()')) {
    s = s.replace(
      'userId: z.number().int().positive().optional().nullable(),',
      `userId: z.number().int().positive().optional().nullable(),
        referrer: z.string().max(400).optional().nullable(),
        siteHost: z.string().max(120).optional().nullable(),`,
    );
  }
  if (!s.includes('visitors: adminProcedure')) {
    s = s.replace(
      'summary: adminProcedure.query(() => getEnhancedAdminSummary()),',
      `summary: adminProcedure.query(() => getEnhancedAdminSummary()),
    visitors: adminProcedure
      .input(z.object({ range: z.enum(['today', 'week', 'month']).default('today') }).optional())
      .query(({ input }) => getVisitorAnalytics(input?.range ?? 'today')),`,
    );
  }
  fs.writeFileSync(f, s);
  console.log('[patch-visitor-analytics] routers');
}

function patchAdmin() {
  const f = 'client/src/pages/AdminPage.tsx';
  if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8');
  if (!s.includes('AdminVisitors')) {
    s = s.replace(
      "import { AdminOverview } from './AdminOverview';",
      "import { AdminOverview } from './AdminOverview';\nimport { AdminVisitors } from './AdminVisitors';",
    );
  }
  if (!s.includes('Activity,') && s.includes('lucide-react')) {
    s = s.replace('BarChart3,', 'Activity, BarChart3,');
  }
  if (!s.includes("key: 'visitors'")) {
    s = s.replace(
      "{ key: 'reports', label: 'التقارير والإحصائيات', icon: BarChart3 },",
      "{ key: 'reports', label: 'التقارير والإحصائيات', icon: BarChart3 },\n  { key: 'visitors', label: 'الزوار والتحليلات', icon: Activity },",
    );
    s = s.replace(
      "{ key: 'reports', label: 'التقارير', icon: BarChart3 },",
      "{ key: 'reports', label: 'التقارير', icon: BarChart3 },\n      { key: 'visitors', label: 'الزوار والتحليلات', icon: Activity },",
    );
  }
  if (!s.includes("section === 'visitors'")) {
    s = s.replace(
      "{section === 'reports' && <AdminReports />}",
      "{section === 'reports' && <AdminReports />}\n            {section === 'visitors' && <AdminVisitors />}",
    );
  }
  fs.writeFileSync(f, s);
  console.log('[patch-visitor-analytics] admin');
}

patchRouters();
patchAdmin();
