import express from "express";
import fs from "node:fs";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";
import { getAuthorBySlug, getGenreBySlug, getNovelBySlug, getSeriesBySlug, listAuthors, listGenres, listNovels, listSeries } from "./db";
import { getQuote, listQuotes, listQuotesByCategory } from "./quotes";

const SITE_URL = "https://e7ketha.vercel.app";
function xmlEscape(value: unknown) {
  return String(value ?? "").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """).replace(/'/g, "'");
}
function renderUrlset(paths: string[]) {
  const uniquePaths = Array.from(new Set(paths));
  const body = uniquePaths.map((urlPath) => `<url><loc>${xmlEscape(`${SITE_URL}${urlPath}`)}</loc><changefreq>${urlPath === "/" ? "daily" : "weekly"}</changefreq><priority>${urlPath === "/" ? "1.0" : urlPath.startsWith("/quotes/") ? "0.8" : "0.7"}</priority></url>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}
function renderSitemapIndex() {
  const files = ["novels", "authors", "genres", "series", "quotes"];
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${files.map((file) => `<sitemap><loc>${SITE_URL}/sitemap/${file}.xml</loc></sitemap>`).join("")}</sitemapindex>`;
}
function quoteCategorySlug(value: string) { return encodeURIComponent(value.trim().toLowerCase()).replace(/%20/g, "-"); }

function htmlEscape(value: unknown) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ '&': '&', '<': '<', '>': '>', "'": '&#39;', '"': '"' })[character] ?? character);
}

function stripHtml(value: unknown, max = 180) {
  return String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function readClientTemplate() {
  const candidates = [
    path.resolve(process.cwd(), 'dist/public/index.html'),
    path.resolve(import.meta.dirname, 'public/index.html'),
    path.resolve(import.meta.dirname, '../../client/index.html'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf8');
  }
  return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>رِواية</title></head><body><div id="root"></div></body></html>';
}

function renderSeoDocument(template: string, input: { title: string; description: string; canonical: string; type?: string; image?: string; jsonLd: unknown; content: string; status?: number }) {
  const head = `<title>${htmlEscape(input.title)}</title><meta name="description" content="${htmlEscape(input.description)}"><meta name="robots" content="index,follow"><link rel="canonical" href="${htmlEscape(input.canonical)}"><meta property="og:type" content="${htmlEscape(input.type ?? 'website')}"><meta property="og:title" content="${htmlEscape(input.title)}"><meta property="og:description" content="${htmlEscape(input.description)}"><meta property="og:url" content="${htmlEscape(input.canonical)}">${input.image ? `<meta property="og:image" content="${htmlEscape(input.image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${htmlEscape(input.image)}">` : ''}<script type="application/ld+json">${JSON.stringify(input.jsonLd).replace(/</g, '\\u003c')}</script>`;
  const cleanTemplate = template
    .replace(/<title>[\s\S]*?<\/title>/gi, '')
    .replace(/<meta[^>]+(?:name|property)=["'](?:description|robots|twitter:[^"']+|og:[^"']+)["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script[^>]+type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi, '');
  const withContent = cleanTemplate.replace('</head>', `${head}</head>`).replace('<div id="root"></div>', `<div id="root">${input.content}</div>`);
  return { html: withContent, status: input.status ?? 200 };
}

// FULL FILE CONTINUES - this is truncated in this attempt. Please use the web editor method if this fails.
export function createApp() { const app = express(); return app; }
