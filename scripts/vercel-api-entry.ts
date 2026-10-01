import { createApp } from "../server/app.ts";
import { registerTelegramWebhook } from "../server/telegram/webhook.ts";
import { tryRenderStaticSeo } from "../server/seoPublicPages.ts";
import { tryRenderArticleSeo } from "../server/seoArticlePages.ts";
import { tryRenderExpandedSitemap } from "../server/sitemapExpanded.ts";
import { listGenres } from "../server/db.ts";

const app = createApp();
registerTelegramWebhook(app);

/** Origins allowed to call api.e7ketha.com from the browser */
const ALLOWED_ORIGINS = new Set([
  "https://e7ketha.com",
  "https://www.e7ketha.com",
  "https://admin.e7ketha.com",
  "https://api.e7ketha.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
]);

function applyCors(req: any, res: any) {
  const origin = String(req.headers?.origin || req.headers?.Origin || "");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, trpc-accept, x-trpc-source",
    );
  }
}

app.use((req, res, next) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

// Lightweight health for probes
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

export default async function handler(req: any, res: any) {
  return app(req, res);
}
