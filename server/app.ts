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
function renderUrlset(paths: string[]) {
  const uniquePaths = Array.from(new Set(paths));
  const body = uniquePaths.map((urlPath) => `<url><loc>${xmlEscape(`${SITE_URL}${urlPath}`)}</loc><changefreq>${urlPath === "/" ? "daily" : "weekly"}</changefreq><priority>${urlPath === "/" ? "1.0" : "0.7"}</priority></url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}
function renderSitemapIndex() {
  const files = ["novels", "authors", "genres", "series", "quotes"];
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${files.map((file) => `<sitemap><loc>${SITE_URL}/sitemap/${file}.xml</loc></sitemap>`).join("")}</sitemapindex>`;
}
function quoteCategorySlug(value: string) { return encodeURIComponent(value.trim().toLowerCase()).replace(/%20/g, "-"); }

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  const sitemapHandler = async (_req: express.Request, res: express.Response) => {
    try {
      const [novels, authors, genres, seriesList, quotes] = await Promise.all([listNovels(10000), listAuthors(), listGenres(), listSeries(), listQuotes(true)]);
      const quoteCategories = Array.from(new Set(quotes.map((item) => item.category).filter((category): category is string => Boolean(category?.trim()))));
      const authorQuotePaths = authors.map((item) => `/authors/${item.slug}/quotes`);
      const bookQuotePaths = novels.map((item) => `/books/${item.slug}/quotes`);
      const categoryQuotePaths = quoteCategories.map((category) => `/quotes/category/${quoteCategorySlug(category)}`);
      const staticPaths = ["/", "/explore", "/quotes", "/quotes/categories", "/discover", "/about", "/how-it-works", "/faq", "/contact", "/privacy", "/terms"];
      const urls = [...staticPaths, ...novels.map((item) => `/books/${item.slug}`), ...bookQuotePaths, ...authors.map((item) => `/authors/${item.slug}`), ...authorQuotePaths, ...genres.map((item) => `/genres/${item.slug}`), ...seriesList.map((item) => `/series/${item.slug}`), ...categoryQuotePaths, ...quotes.map((item) => `/quotes/${item.id}`)];
      const resource = String(_req.query.resource ?? "");
      const sitemap = resource === "index" || resource === "sitemap" ? renderSitemapIndex() : resource === "novels" ? renderUrlset([...novels.map((item) => `/books/${item.slug}`), ...bookQuotePaths]) : resource === "authors" ? renderUrlset([...authors.map((item) => `/authors/${item.slug}`), ...authorQuotePaths]) : resource === "genres" ? renderUrlset(genres.map((item) => `/genres/${item.slug}`)) : resource === "series" ? renderUrlset(seriesList.map((item) => `/series/${item.slug}`)) : resource === "quotes" ? renderUrlset([...categoryQuotePaths, ...quotes.map((item) => `/quotes/${item.id}`)]) : renderUrlset(urls);
      res.type("application/xml").set("Cache-Control", "public, max-age=0, s-maxage=0, must-revalidate").send(sitemap);
    } catch (error) {
      console.error("[SEO] sitemap generation failed", error);
      res.status(503).type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}/</loc></url></urlset>`);
    }
  };
  app.get("/sitemap.xml", sitemapHandler);
  app.get("/sitemap/:type.xml", (req, res) => { req.query.resource = req.params.type; return sitemapHandler(req, res); });
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
