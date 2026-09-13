import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { listAuthors, listNovels } from "./db";
import { listQuotes } from "./quotes";

const SITE_URL = "https://e7ketha.vercel.app";
function xmlEscape(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.get("/api/sitemap.xml", async (_req, res) => {
    try {
      const [novels, authors, quotes] = await Promise.all([listNovels(10000), listAuthors(), listQuotes(true)]);
      const urls = ["/", "/explore", "/quotes", ...novels.map((item) => `/books/${item.slug}`), ...authors.map((item) => `/authors/${item.slug}`), ...quotes.map((item) => `/quotes/${item.id}`)];
      const body = urls.map((path) => `<url><loc>${xmlEscape(`${SITE_URL}${path}`)}</loc><changefreq>weekly</changefreq><priority>${path === "/" ? "1.0" : "0.7"}</priority></url>`).join("");
      res.type("application/xml").set("Cache-Control", "public, max-age=300, s-maxage=300").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
    } catch (error) {
      console.error("[SEO] sitemap generation failed", error);
      res.status(503).type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url></urlset>`);
    }
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  return app;
}
