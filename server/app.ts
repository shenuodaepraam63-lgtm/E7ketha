import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { listAuthors, listGenres, listNovels, listSeries } from "./db";
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
  const sitemapHandler = async (_req: express.Request, res: express.Response) => {
    try {
      const [novels, authors, genres, seriesList, quotes] = await Promise.all([listNovels(10000), listAuthors(), listGenres(), listSeries(), listQuotes(true)]);
      const staticPaths = ["/", "/explore", "/quotes", "/discover", "/about", "/how-it-works", "/faq", "/contact", "/privacy", "/terms"];
      const urls = [...staticPaths, ...novels.map((item) => `/books/${item.id}`), ...authors.map((item) => `/authors/${item.slug}`), ...genres.map((item) => `/genres/${item.slug}`), ...seriesList.map((item) => `/series/${item.slug}`), ...quotes.map((item) => `/quotes/${item.id}`)];
      const uniqueUrls = Array.from(new Set(urls));
      const body = uniqueUrls.map((path) => `<url><loc>${xmlEscape(`${SITE_URL}${path}`)}</loc><changefreq>${path === "/" ? "daily" : "weekly"}</changefreq><priority>${path === "/" ? "1.0" : staticPaths.includes(path) ? "0.8" : "0.7"}</priority></url>`).join("");
      res.type("application/xml").set("Cache-Control", "public, max-age=0, s-maxage=0, must-revalidate").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`);
    } catch (error) {
      console.error("[SEO] sitemap generation failed", error);
      res.status(503).type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url></urlset>`);
    }
  };
  app.get("/sitemap.xml", sitemapHandler);
  app.get("/api/sitemap.xml", sitemapHandler);
  app.get("/", (req, res, next) => req.query.resource === "sitemap" ? sitemapHandler(req, res) : next());
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  return app;
}
