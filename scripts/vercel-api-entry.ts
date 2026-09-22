import { createApp } from "../server/app.ts";
import { tryRenderStaticSeo, tryRenderArticleSeo } from "../server/seoPublicPages.ts";
import { tryRenderExpandedSitemap } from "../server/sitemapExpanded.ts";

const app = createApp();

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
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,PATCH,DELETE");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, trpc-accept, x-trpc-source, x-requested-with",
    );
    res.setHeader("Access-Control-Max-Age", "86400");
    res.setHeader("Vary", "Origin");
  }
}

export default async function handler(req: any, res: any) {
  try {
    applyCors(req, res);
    if (String(req.method || "").toUpperCase() === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    // API host: never serve indexable HTML at /
    const host = String(req.headers?.host || req.headers?.Host || "")
      .split(":")[0]
      .toLowerCase();
    if (host === "api.e7ketha.com") {
      const path = String(req.url || "/").split("?")[0];
      if (path === "/" || path === "") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("X-Robots-Tag", "noindex, nofollow");
        res.end(
          JSON.stringify({
            name: "E7ketha API",
            description: "واجهة البيانات الرسمية — الطلبات عبر tRPC/JSON فقط",
            site: "https://e7ketha.com",
          }),
        );
        return;
      }
    }

    if (await tryRenderExpandedSitemap(req, res)) return;
    if (await tryRenderArticleSeo(req, res)) return;
    if (tryRenderStaticSeo(req, res)) return;
    return app(req, res);
  } catch (error) {
    console.error("[Vercel API] handler failed", error);
    if (!res.headersSent) res.status(500).json({ error: "API handler failed" });
  }
}
