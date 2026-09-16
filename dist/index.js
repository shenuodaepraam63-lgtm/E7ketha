// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { Pool } from "pg";
import { and, asc, desc, eq, gte, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";

// drizzle/schema.ts
import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";
var userRoleEnum = pgEnum("user_role", ["user", "admin"]);
var seriesStatusEnum = pgEnum("series_status", ["completed", "ongoing"]);
var novelStatusEnum = pgEnum("novel_status", ["standalone", "completed", "ongoing"]);
var readingStatusEnum = pgEnum("reading_status", ["want_to_read", "reading", "finished"]);
var reviewStatusEnum = pgEnum("review_status", ["published", "pending", "hidden"]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull()
});
var authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  bio: text("bio"),
  avatarUrl: varchar("avatarUrl", { length: 500 }),
  bookCount: integer("bookCount").default(0).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull()
});
var genres = pgTable("genres", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 20 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var series = pgTable("series", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: seriesStatusEnum("status").default("completed").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull()
});
var novels = pgTable("novels", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  authorId: integer("authorId").notNull(),
  seriesId: integer("seriesId"),
  coverUrl: varchar("coverUrl", { length: 500 }),
  description: text("description"),
  rightsNote: text("rightsNote"),
  rating: integer("rating").default(0).notNull(),
  ratingCount: integer("ratingCount").default(0).notNull(),
  parts: integer("parts").default(1).notNull(),
  status: novelStatusEnum("status").default("standalone").notNull(),
  publicationYear: integer("publicationYear"),
  language: varchar("language", { length: 32 }).default("ar").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull()
});
var novelGenres = pgTable(
  "novelGenres",
  {
    novelId: integer("novelId").notNull(),
    genreId: integer("genreId").notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.novelId, table.genreId] })
  })
);
var seriesBooks = pgTable(
  "seriesBooks",
  {
    seriesId: integer("seriesId").notNull(),
    novelId: integer("novelId").notNull(),
    order: integer("order").notNull()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.seriesId, table.novelId] })
  })
);
var readingListItems = pgTable(
  "readingListItems",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    novelId: integer("novelId").notNull(),
    status: readingStatusEnum("status").default("want_to_read").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userNovelUnique: uniqueIndex("readingListUserNovelUnique").on(table.userId, table.novelId)
  })
);
var ratings = pgTable(
  "ratings",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    novelId: integer("novelId").notNull(),
    rating: integer("rating").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userNovelUnique: uniqueIndex("ratingsUserNovelUnique").on(table.userId, table.novelId)
  })
);
var reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  novelId: integer("novelId").notNull(),
  rating: integer("rating"),
  body: text("body").notNull(),
  status: reviewStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull()
});

// server/_core/env.ts
import "dotenv/config";
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  // Prefer Supavisor/Pooler URL for Vercel serverless connections.
  databaseUrl: process.env.SUPABASE_POOLER_URL ?? process.env.SUPABASE_DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY ?? "",
  supabaseJwksUrl: process.env.SUPABASE_JWKS_URL ?? "",
  supabaseAdminEmails: process.env.SUPABASE_ADMIN_EMAILS ?? "",
  cloudinaryUrl: process.env.CLOUDINARY_URL ?? "",
  shopifyStoreDomain: process.env.SHOPIFY_STORE_DOMAIN ?? "",
  shopifyStorefrontApiAccessToken: process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_AI_API_KEY ?? ""
};

// server/db.ts
var _pool = null;
var _db = null;
async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _pool = new Pool({
        connectionString: ENV.databaseUrl,
        ssl: { rejectUnauthorized: false },
        // Vercel functions are short-lived; keep the per-instance pool small.
        max: Number(process.env.DB_POOL_MAX ?? 2),
        connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS ?? 5e3),
        idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 1e4),
        maxUses: Number(process.env.DB_POOL_MAX_USES ?? 500)
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
      _pool = null;
    }
  }
  return _db;
}
function requireDb() {
  return getDb().then((db) => {
    if (!db) throw new Error("Supabase database is not configured");
    return db;
  });
}
async function supabaseRest(table, params) {
  if (!ENV.supabaseUrl || !ENV.supabasePublishableKey) throw new Error("Supabase REST is not configured");
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${table}?${params}`, { signal: AbortSignal.timeout(1e4), headers: { apikey: ENV.supabaseSecretKey || ENV.supabasePublishableKey, Authorization: `Bearer ${ENV.supabaseSecretKey || ENV.supabasePublishableKey}` } });
  if (!response.ok) throw new Error(`Supabase REST ${response.status}: ${await response.text()}`);
  return response.json();
}
async function supabaseCount(table, filter = "") {
  if (!ENV.supabaseUrl || !ENV.supabasePublishableKey) throw new Error("Supabase REST is not configured");
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${table}?select=id${filter ? `&${filter}` : ""}`, {
    method: "HEAD",
    headers: {
      apikey: ENV.supabaseSecretKey || ENV.supabasePublishableKey,
      Authorization: `Bearer ${ENV.supabaseSecretKey || ENV.supabasePublishableKey}`,
      Prefer: "count=exact"
    }
  });
  if (!response.ok) throw new Error(`Supabase REST ${response.status}`);
  const range = response.headers.get("content-range") ?? "*/0";
  return Number(range.split("/")[1] || 0);
}
async function supabaseWrite(table, method, body, filter = "") {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) throw new Error("Supabase admin REST is not configured");
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${table}${filter ? `?${filter}` : ""}`, {
    method,
    headers: {
      apikey: ENV.supabaseSecretKey,
      Authorization: `Bearer ${ENV.supabaseSecretKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation,resolution=merge-duplicates"
    },
    body: body === void 0 ? void 0 : JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`Supabase REST ${response.status}: ${await response.text()}`);
  const text2 = await response.text();
  return text2 ? JSON.parse(text2) : [];
}
async function getNovelBySlugFromRest(slug) {
  const decoded = decodeURIComponent(slug).trim();
  if (/^\d+$/.test(decoded)) {
    const numericRows = await supabaseRest("novels", `select=*&id=eq.${decoded}&limit=1`);
    if (numericRows[0]) {
      const row2 = numericRows[0];
      const authorsRows2 = await supabaseRest("authors", `select=name,slug&id=eq.${row2.authorId}&limit=1`);
      const author2 = authorsRows2[0];
      return { id: row2.id, slug: normalizeNovelSlug(row2.slug, row2.title), title: row2.title, coverUrl: row2.coverUrl, description: row2.description, rightsNote: row2.rightsNote, rating: row2.rating, ratingCount: row2.ratingCount, parts: row2.parts, status: row2.status, publicationYear: row2.publicationYear, language: row2.language, author: author2?.name ?? "\u0645\u0624\u0644\u0641 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641", authorSlug: author2?.slug ?? "", authorId: row2.authorId, links: await listNovelLinks(Number(row2.id)) };
    }
  }
  const candidates = Array.from(/* @__PURE__ */ new Set([slug, decoded, normalizeNovelSlug(decoded)])).filter(Boolean);
  const rows = await supabaseRest("novels", `select=id,slug,title,coverUrl,description,rightsNote,rating,ratingCount,parts,status,publicationYear,language,authorId&or=(${candidates.map((value) => `slug.eq.${encodeURIComponent(value)}`).join(",")})&limit=1`);
  const row = rows[0];
  if (!row) return null;
  const authorsRows = await supabaseRest("authors", `select=name,slug&id=eq.${row.authorId}&limit=1`);
  const author = authorsRows[0];
  return { id: row.id, slug: normalizeNovelSlug(row.slug, row.title), title: row.title, coverUrl: row.coverUrl, description: row.description, rightsNote: row.rightsNote, rating: row.rating, ratingCount: row.ratingCount, parts: row.parts, status: row.status, publicationYear: row.publicationYear, language: row.language, author: author?.name ?? "\u0645\u0624\u0644\u0641 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641", authorSlug: author?.slug ?? "", authorId: row.authorId, links: await listNovelLinks(Number(row.id)) };
}
async function listNovelsFromRest(limit = 50) {
  const rows = await supabaseRest("novels", `select=*&order=createdAt.desc&limit=${Math.min(Math.max(limit, 1), 100)}`);
  const authorIds = Array.from(new Set(rows.map((row) => row.authorId).filter(Boolean)));
  const authorsRows = authorIds.length ? await supabaseRest("authors", `select=id,name,slug&id=in.(${authorIds.join(",")})`) : [];
  const authorsMap = new Map(authorsRows.map((author) => [String(author.id), author]));
  return rows.map((row) => ({ id: row.id, slug: normalizeNovelSlug(row.slug, row.title), title: row.title, coverUrl: row.coverUrl, description: row.description, rightsNote: row.rightsNote, rating: row.rating, ratingCount: row.ratingCount, parts: row.parts, status: row.status, publicationYear: row.publicationYear, author: authorsMap.get(String(row.authorId))?.name ?? "\u0645\u0624\u0644\u0641 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641", authorSlug: authorsMap.get(String(row.authorId))?.slug ?? "" }));
}
async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values = { openId: user.openId };
  const updateSet = {};
  const textFields = ["name", "email", "loginMethod"];
  for (const field of textFields) {
    if (user[field] !== void 0) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== void 0) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== void 0) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= /* @__PURE__ */ new Date();
  updateSet.lastSignedIn ??= /* @__PURE__ */ new Date();
  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ openId: users.openId, role: users.role }).from(users);
}
async function updateUserRole(openId, role) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.update(users).set({ role, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.openId, openId)).returning();
  return row ?? null;
}
async function listNovels(limit = 50) {
  const db = await getDb();
  if (!db) return listNovelsFromRest(limit);
  try {
    const rows = await db.select({
      id: novels.id,
      slug: novels.slug,
      title: novels.title,
      coverUrl: novels.coverUrl,
      description: novels.description,
      rating: novels.rating,
      ratingCount: novels.ratingCount,
      parts: novels.parts,
      status: novels.status,
      publicationYear: novels.publicationYear,
      author: authors.name,
      authorSlug: authors.slug
    }).from(novels).innerJoin(authors, eq(novels.authorId, authors.id)).orderBy(desc(novels.rating), desc(novels.createdAt)).limit(limit);
    return rows.map((row) => ({ ...row, slug: normalizeNovelSlug(row.slug, row.title) }));
  } catch (error) {
    console.warn("[Database] Falling back to Supabase REST for novels list:", error instanceof Error ? error.message : error);
    return listNovelsFromRest(limit);
  }
}
async function searchNovels(filters = {}) {
  const db = await getDb();
  if (!db) {
    const limit2 = Math.min(Math.max(filters.limit ?? 50, 1), 100);
    const query3 = filters.q?.trim();
    const params = new URLSearchParams({ select: "*", limit: String(limit2) });
    if (filters.status) params.set("status", `eq.${filters.status}`);
    if (filters.minRating) params.set("rating", `gte.${Math.round(filters.minRating * 100)}`);
    if (query3) params.set("or", `(title.ilike.*${query3}*,description.ilike.*${query3}*)`);
    const rows = await supabaseRest("novels", params.toString());
    return rankSearchRows(rows.map((row) => ({ ...row, slug: normalizeNovelSlug(row.slug, row.title), author: "", authorSlug: "" })), query3 ?? "");
  }
  const conditions = [];
  const query2 = filters.q?.trim();
  if (query2) {
    const term = `%${query2}%`;
    conditions.push(or(like(novels.title, term), like(authors.name, term), like(novels.description, term)));
  }
  if (filters.authorSlug) conditions.push(eq(authors.slug, filters.authorSlug));
  if (filters.status) conditions.push(eq(novels.status, filters.status));
  if (filters.minRating) conditions.push(gte(novels.rating, Math.round(filters.minRating * 100)));
  const selection = {
    id: novels.id,
    slug: novels.slug,
    title: novels.title,
    coverUrl: novels.coverUrl,
    description: novels.description,
    rating: novels.rating,
    ratingCount: novels.ratingCount,
    parts: novels.parts,
    status: novels.status,
    publicationYear: novels.publicationYear,
    author: authors.name,
    authorSlug: authors.slug
  };
  const order = filters.sort === "rating" ? desc(novels.rating) : filters.sort === "newest" ? desc(novels.publicationYear) : filters.sort === "title" ? asc(novels.title) : desc(novels.ratingCount);
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  if (filters.genreSlug) {
    conditions.push(eq(genres.slug, filters.genreSlug));
    return db.select(selection).from(novels).innerJoin(authors, eq(novels.authorId, authors.id)).innerJoin(novelGenres, eq(novelGenres.novelId, novels.id)).innerJoin(genres, eq(novelGenres.genreId, genres.id)).where(and(...conditions)).orderBy(order).limit(limit);
  }
  return db.select(selection).from(novels).innerJoin(authors, eq(novels.authorId, authors.id)).where(conditions.length ? and(...conditions) : void 0).orderBy(order).limit(limit);
}
async function getSearchFacets() {
  const db = await getDb();
  if (!db) {
    const [genreRows2, authorRows2] = await Promise.all([
      supabaseRest("genres", "select=slug,name&order=name.asc&limit=1000"),
      supabaseRest("authors", "select=slug,name&order=name.asc&limit=1000")
    ]);
    return { genres: genreRows2, authors: authorRows2 };
  }
  const [genreRows, authorRows] = await Promise.all([
    db.select({ slug: genres.slug, name: genres.name }).from(genres).orderBy(asc(genres.name)),
    db.select({ slug: authors.slug, name: authors.name }).from(authors).orderBy(asc(authors.name))
  ]);
  return { genres: genreRows, authors: authorRows };
}
async function listAuthors() {
  const db = await getDb();
  if (!db) return supabaseRest("authors", "select=*&order=name.asc&limit=1000");
  return db.select().from(authors).orderBy(asc(authors.name));
}
async function getAuthorBySlug(slug) {
  try {
    const db = await requireDb();
    const result = await db.select().from(authors).where(eq(authors.slug, slug)).limit(1);
    return result[0] ?? null;
  } catch (error) {
    console.warn("[Database] Falling back to Supabase REST for author lookup:", error instanceof Error ? error.message : error);
    return (await listAuthors()).find((author) => author.slug === decodeURIComponent(slug).trim()) ?? null;
  }
}
async function listGenres() {
  const db = await getDb();
  if (!db) return supabaseRest("genres", "select=*&order=name.asc&limit=1000");
  return db.select({ id: genres.id, slug: genres.slug, name: genres.name, description: genres.description, icon: genres.icon, novelCount: sql`COUNT(DISTINCT ${novelGenres.novelId})` }).from(genres).leftJoin(novelGenres, eq(novelGenres.genreId, genres.id)).groupBy(genres.id).orderBy(asc(genres.name));
}
async function getGenreBySlug(slug) {
  try {
    const db = await requireDb();
    const result = await db.select({ id: genres.id, slug: genres.slug, name: genres.name, description: genres.description, icon: genres.icon, novelCount: sql`COUNT(DISTINCT ${novelGenres.novelId})` }).from(genres).leftJoin(novelGenres, eq(novelGenres.genreId, genres.id)).where(eq(genres.slug, slug)).groupBy(genres.id).limit(1);
    return result[0] ?? null;
  } catch (error) {
    console.warn("[Database] Falling back to Supabase REST for genre lookup:", error instanceof Error ? error.message : error);
    return (await listGenres()).find((genre) => genre.slug === decodeURIComponent(slug).trim()) ?? null;
  }
}
async function listSeries() {
  const db = await getDb();
  if (!db) return supabaseRest("series", "select=*&order=title.asc&limit=1000");
  return db.select({ id: series.id, slug: series.slug, title: series.title, description: series.description, status: series.status, parts: sql`COUNT(DISTINCT ${seriesBooks.novelId})`, coverUrl: sql`MIN(${novels.coverUrl})` }).from(series).leftJoin(seriesBooks, eq(seriesBooks.seriesId, series.id)).leftJoin(novels, eq(seriesBooks.novelId, novels.id)).groupBy(series.id).orderBy(asc(series.title));
}
async function getSeriesBySlug(slug) {
  try {
    const db = await requireDb();
    const rows = await db.select({ id: series.id, slug: series.slug, title: series.title, description: series.description, status: series.status, order: seriesBooks.order, bookTitle: novels.title, bookSlug: novels.slug, coverUrl: novels.coverUrl, author: authors.name }).from(series).leftJoin(seriesBooks, eq(seriesBooks.seriesId, series.id)).leftJoin(novels, eq(seriesBooks.novelId, novels.id)).leftJoin(authors, eq(novels.authorId, authors.id)).where(eq(series.slug, slug)).orderBy(asc(seriesBooks.order));
    if (!rows.length) return null;
    const first = rows[0];
    return { ...first, books: rows.filter((row) => row.bookSlug).map((row) => ({ title: row.bookTitle, slug: row.bookSlug, coverUrl: row.coverUrl, author: row.author })) };
  } catch (error) {
    console.warn("[Database] Falling back to Supabase REST for series lookup:", error instanceof Error ? error.message : error);
    const item = (await listSeries()).find((entry) => entry.slug === decodeURIComponent(slug).trim());
    return item ? { ...item, books: [] } : null;
  }
}
async function getNovelBySlug(slug) {
  const decodedSlug = decodeURIComponent(slug).trim();
  const normalizedSlug = normalizeNovelSlug(decodedSlug);
  try {
    const db = await requireDb();
    const numericMatch = /^\d+$/.test(decodedSlug) ? sql`n.id = ${Number(decodedSlug)}` : sql`FALSE`;
    const result = await db.execute(sql`
    SELECT
      n.id, n.slug, n.title, n."coverUrl", n.description, n."rightsNote",
      n.rating, n."ratingCount", n.parts, n.status, n."publicationYear", n.language,
      a.name AS author, a.slug AS "authorSlug", a.id AS "authorId",
      COALESCE(
        json_agg(
          json_build_object('id', l.id, 'label', l.label, 'url', l.url, 'type', l.type, 'displayOrder', l."displayOrder")
          ORDER BY l."displayOrder" ASC
        ) FILTER (WHERE l.id IS NOT NULL),
        '[]'::json
      ) AS links
    FROM public."novels" n
    INNER JOIN public."authors" a ON a.id = n."authorId"
    LEFT JOIN public."novelLinks" l ON l."novelId" = n.id
    WHERE (${numericMatch} OR n.slug = ${slug} OR n.slug = ${decodedSlug} OR n.slug = ${normalizedSlug})
    GROUP BY n.id, a.id
    LIMIT 1
  `);
    const row = result.rows[0];
    if (row) return { ...row, slug: normalizeNovelSlug(row.slug, row.title), links: row.links ?? [] };
    return getNovelBySlugFromRest(slug);
  } catch (error) {
    console.warn("[Database] Falling back to Supabase REST for novel lookup:", error instanceof Error ? error.message : error);
    return getNovelBySlugFromRest(slug);
  }
}
async function getReadingList(userId) {
  const db = await requireDb();
  return db.select({
    id: readingListItems.id,
    status: readingListItems.status,
    createdAt: readingListItems.createdAt,
    updatedAt: readingListItems.updatedAt,
    novelId: novels.id,
    slug: novels.slug,
    title: novels.title,
    coverUrl: novels.coverUrl,
    description: novels.description,
    rating: novels.rating,
    parts: novels.parts,
    novelStatus: novels.status,
    author: authors.name,
    authorSlug: authors.slug
  }).from(readingListItems).innerJoin(novels, eq(readingListItems.novelId, novels.id)).innerJoin(authors, eq(novels.authorId, authors.id)).where(eq(readingListItems.userId, userId)).orderBy(desc(readingListItems.updatedAt));
}
async function addToReadingList(userId, novelId, status = "want_to_read") {
  const db = await requireDb();
  await db.insert(readingListItems).values({ userId, novelId, status }).onConflictDoUpdate({
    target: [readingListItems.userId, readingListItems.novelId],
    set: { status, updatedAt: /* @__PURE__ */ new Date() }
  });
  return { success: true };
}
async function removeFromReadingList(userId, novelId) {
  const db = await requireDb();
  await db.delete(readingListItems).where(and(eq(readingListItems.userId, userId), eq(readingListItems.novelId, novelId)));
  return { success: true };
}
async function updateReadingStatus(userId, novelId, status) {
  const db = await requireDb();
  await db.update(readingListItems).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(and(eq(readingListItems.userId, userId), eq(readingListItems.novelId, novelId)));
  return { success: true };
}
async function setRating(userId, novelId, rating) {
  const db = await requireDb();
  await db.insert(ratings).values({ userId, novelId, rating }).onConflictDoUpdate({
    target: [ratings.userId, ratings.novelId],
    set: { rating, updatedAt: /* @__PURE__ */ new Date() }
  });
  const aggregate = await db.select({ average: sql`COALESCE(AVG(${ratings.rating}), 0)`, count: sql`COUNT(${ratings.id})` }).from(ratings).where(eq(ratings.novelId, novelId));
  await db.update(novels).set({ rating: Math.round(Number(aggregate[0]?.average ?? 0) * 100), ratingCount: Number(aggregate[0]?.count ?? 0), updatedAt: /* @__PURE__ */ new Date() }).where(eq(novels.id, novelId));
  return { success: true, rating };
}
async function getMyRating(userId, novelId) {
  const db = await requireDb();
  const result = await db.select({ rating: ratings.rating }).from(ratings).where(and(eq(ratings.userId, userId), eq(ratings.novelId, novelId))).limit(1);
  return result[0]?.rating ?? null;
}
async function getAdminSummary() {
  const db = await getDb();
  if (!db) {
    const [novelsCount, authorsCount, seriesCount, reviewsCount] = await Promise.all([
      supabaseCount("novels"),
      supabaseCount("authors"),
      supabaseCount("series"),
      supabaseCount("reviews", "status=eq.pending")
    ]);
    return { novels: novelsCount, authors: authorsCount, sources: seriesCount, needsReview: reviewsCount };
  }
  const [novelCount, authorCount, sourceCount, reviewCount] = await Promise.all([
    db.select({ count: sql`COUNT(*)` }).from(novels),
    db.select({ count: sql`COUNT(*)` }).from(authors),
    db.select({ count: sql`COUNT(*)` }).from(series),
    db.select({ count: sql`COUNT(*)` }).from(reviews).where(eq(reviews.status, "pending"))
  ]);
  return { novels: Number(novelCount[0]?.count ?? 0), authors: Number(authorCount[0]?.count ?? 0), sources: Number(sourceCount[0]?.count ?? 0), needsReview: Number(reviewCount[0]?.count ?? 0) };
}
async function listAdminNovels() {
  const db = await getDb();
  if (!db) {
    const rows2 = await supabaseRest("novels", "select=id,slug,title,authorId,coverUrl,description,rightsNote,rating,ratingCount,parts,status,publicationYear,language,updatedAt&order=updatedAt.desc&limit=100");
    const linksByNovel2 = await listNovelLinksBatch(rows2.map((row) => Number(row.id)));
    return rows2.map((row) => ({ ...row, links: linksByNovel2.get(Number(row.id)) ?? [] }));
  }
  const rows = await db.select({ id: novels.id, slug: novels.slug, title: novels.title, authorId: authors.id, author: authors.name, coverUrl: novels.coverUrl, description: novels.description, rightsNote: novels.rightsNote, rating: novels.rating, ratingCount: novels.ratingCount, parts: novels.parts, status: novels.status, publicationYear: novels.publicationYear, language: novels.language, updatedAt: novels.updatedAt }).from(novels).innerJoin(authors, eq(novels.authorId, authors.id)).orderBy(desc(novels.updatedAt)).limit(100);
  const linksByNovel = await listNovelLinksBatch(rows.map((row) => Number(row.id)));
  return rows.map((row) => ({ ...row, links: linksByNovel.get(Number(row.id)) ?? [] }));
}
async function listAdminAuthors() {
  const db = await getDb();
  if (!db) return supabaseRest("authors", "select=*&order=name.asc&limit=1000");
  return db.select().from(authors).orderBy(asc(authors.name));
}
async function listAdminGenres() {
  const db = await getDb();
  if (!db) return supabaseRest("genres", "select=*&order=name.asc&limit=1000");
  return db.select({ id: genres.id, slug: genres.slug, name: genres.name, description: genres.description, icon: genres.icon, createdAt: genres.createdAt, novelCount: sql`COUNT(DISTINCT ${novelGenres.novelId})` }).from(genres).leftJoin(novelGenres, eq(novelGenres.genreId, genres.id)).groupBy(genres.id).orderBy(asc(genres.name));
}
async function createAuthor(input) {
  const db = await getDb();
  if (!db) return (await supabaseWrite("authors", "POST", { ...input, bio: input.bio || null, avatarUrl: input.avatarUrl || null, bookCount: input.bookCount ?? 0 }))[0];
  const [row] = await db.insert(authors).values({ ...input, bio: input.bio || null, avatarUrl: input.avatarUrl || null, bookCount: input.bookCount ?? 0 }).returning();
  return row;
}
async function updateAuthor(id, input) {
  const db = await getDb();
  if (!db) return (await supabaseWrite("authors", "PATCH", { ...input, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, `id=eq.${id}`))[0] ?? null;
  const [row] = await db.update(authors).set({ ...input, updatedAt: /* @__PURE__ */ new Date() }).where(eq(authors.id, id)).returning();
  return row ?? null;
}
async function deleteAuthor(id) {
  const db = await getDb();
  if (!db) {
    const linked2 = await supabaseRest("novels", `select=id&authorId=eq.${id}&limit=1`);
    if (linked2.length) throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0645\u0624\u0644\u0641 \u0645\u0631\u062A\u0628\u0637 \u0628\u0631\u0648\u0627\u064A\u0627\u062A. \u0627\u0646\u0642\u0644 \u0627\u0644\u0631\u0648\u0627\u064A\u0627\u062A \u0625\u0644\u0649 \u0645\u0624\u0644\u0641 \u0622\u062E\u0631 \u0623\u0648\u0644\u064B\u0627.");
    await supabaseWrite("authors", "DELETE", void 0, `id=eq.${id}`);
    return { success: true };
  }
  const linked = await db.select({ id: novels.id }).from(novels).where(eq(novels.authorId, id)).limit(1);
  if (linked.length) throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u062D\u0630\u0641 \u0645\u0624\u0644\u0641 \u0645\u0631\u062A\u0628\u0637 \u0628\u0631\u0648\u0627\u064A\u0627\u062A. \u0627\u0646\u0642\u0644 \u0627\u0644\u0631\u0648\u0627\u064A\u0627\u062A \u0625\u0644\u0649 \u0645\u0624\u0644\u0641 \u0622\u062E\u0631 \u0623\u0648\u0644\u064B\u0627.");
  await db.delete(authors).where(eq(authors.id, id));
  return { success: true };
}
async function createGenre(input) {
  const db = await getDb();
  if (!db) return (await supabaseWrite("genres", "POST", { ...input, description: input.description || null, icon: input.icon || "\u2726" }))[0];
  const [row] = await db.insert(genres).values({ ...input, description: input.description || null, icon: input.icon || "\u2726" }).returning();
  return row;
}
async function updateGenre(id, input) {
  const db = await getDb();
  if (!db) return (await supabaseWrite("genres", "PATCH", input, `id=eq.${id}`))[0] ?? null;
  const [row] = await db.update(genres).set(input).where(eq(genres.id, id)).returning();
  return row ?? null;
}
async function deleteGenre(id) {
  const db = await getDb();
  if (!db) {
    await supabaseWrite("novelGenres", "DELETE", void 0, `genreId=eq.${id}`);
    await supabaseWrite("genres", "DELETE", void 0, `id=eq.${id}`);
    return { success: true };
  }
  await db.delete(novelGenres).where(eq(novelGenres.genreId, id));
  await db.delete(genres).where(eq(genres.id, id));
  return { success: true };
}
async function listNovelLinks(novelId) {
  try {
    return await supabaseRest("novelLinks", `select=id,label,url,type,displayOrder&novelId=eq.${novelId}&order=displayOrder.asc&limit=50`);
  } catch {
    return [];
  }
}
async function listNovelLinksBatch(novelIds) {
  if (!novelIds.length) return /* @__PURE__ */ new Map();
  try {
    const rows = await supabaseRest("novelLinks", `select=id,novelId,label,url,type,displayOrder&novelId=in.(${novelIds.join(",")})&order=displayOrder.asc&limit=2000`);
    const grouped = /* @__PURE__ */ new Map();
    for (const row of rows) {
      const id = Number(row.novelId);
      const list = grouped.get(id) ?? [];
      list.push(row);
      grouped.set(id, list);
    }
    return grouped;
  } catch {
    return /* @__PURE__ */ new Map();
  }
}
async function replaceNovelLinks(novelId, links = []) {
  await supabaseWrite("novelLinks", "DELETE", void 0, `novelId=eq.${novelId}`);
  if (links.length) await supabaseWrite("novelLinks", "POST", links.map((link, index) => ({ novelId, label: link.label, url: link.url, type: link.type, displayOrder: index })));
}
function normalizeNovelSlug(value, fallbackTitle) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.includes("/")) return normalizeNovelSlug(fallbackTitle || "novel");
  return trimmed.replace(/^\/+|\/+$/g, "").replace(/\s+/g, "-").replace(/[?#%]/g, "").slice(0, 160) || normalizeNovelSlug(fallbackTitle || "novel");
}
function normalizeSearchText(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u064B-\u065F\u0670]/g, "").replace(/[إأآٱ]/g, "\u0627").replace(/ى/g, "\u064A").replace(/ة/g, "\u0647").replace(/ؤ/g, "\u0648").replace(/ئ/g, "\u064A").replace(/[^A-Za-z0-9\u0600-\u06FF\s]/g, " ").replace(/\s+/g, " ").trim();
}
var searchSynonyms = {
  \u0631\u0639\u0628: ["\u062E\u0648\u0641", "\u0645\u0631\u0639\u0628", "horror", "terror"],
  \u062E\u0648\u0641: ["\u0631\u0639\u0628", "\u0645\u0631\u0639\u0628", "horror"],
  \u062D\u0628: ["\u0631\u0648\u0645\u0627\u0646\u0633\u064A", "\u0631\u0648\u0645\u0627\u0646\u0633\u064A\u0629", "\u0639\u0627\u0637\u0641\u0629", "romance"],
  \u0631\u0648\u0645\u0627\u0646\u0633\u064A: ["\u062D\u0628", "\u0631\u0648\u0645\u0627\u0646\u0633\u064A\u0629", "romance"],
  \u062E\u064A\u0627\u0644: ["\u0641\u0627\u0646\u062A\u0627\u0632\u064A\u0627", "\u0633\u062D\u0631", "\u0627\u0633\u0637\u0648\u0631\u064A", "fantasy"],
  \u0641\u0627\u0646\u062A\u0627\u0632\u064A\u0627: ["\u062E\u064A\u0627\u0644", "\u0633\u062D\u0631", "fantasy"],
  \u063A\u0645\u0648\u0636: ["\u062A\u062D\u0642\u064A\u0642", "\u0644\u063A\u0632", "\u062C\u0631\u064A\u0645\u0629", "mystery"],
  \u0645\u063A\u0627\u0645\u0631\u0629: ["\u0631\u062D\u0644\u0629", "\u062A\u0634\u0648\u064A\u0642", "adventure"],
  \u062A\u0627\u0631\u064A\u062E: ["\u062A\u0627\u0631\u064A\u062E\u064A", "\u0642\u062F\u064A\u0645", "historical"]
};
function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = a[i - 1] === b[j - 1] ? previous : Math.min(previous + 1, row[j - 1] + 1, current + 1);
      previous = current;
    }
  }
  return row[b.length];
}
function rankSearchRows(rows, query2) {
  const normalized = normalizeSearchText(query2);
  if (!normalized) return rows;
  const queryWords = normalized.split(" ").filter(Boolean);
  const expanded = new Set(queryWords);
  queryWords.forEach((word) => (searchSynonyms[word] ?? []).forEach((item) => expanded.add(normalizeSearchText(item))));
  return rows.map((row) => {
    const text2 = normalizeSearchText([row.title, row.description, row.author, row.slug].filter(Boolean).join(" "));
    const words = text2.split(" ");
    let score = text2.includes(normalized) ? 100 : 0;
    for (const word of Array.from(expanded)) {
      if (text2.includes(word)) score += queryWords.includes(word) ? 35 : 12;
      else if (words.length) score += Math.max(0, 10 - Math.min(10, Math.min(...words.map((candidate) => levenshtein(word, candidate)))));
    }
    return { row, score };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || Number(b.row.ratingCount ?? 0) - Number(a.row.ratingCount ?? 0)).map((item) => item.row);
}
async function resolveCoverUrl(value) {
  const url = value?.trim();
  if (!url) return null;
  try {
    const parsedUrl = new URL(url);
    const archiveMatch = parsedUrl.hostname.endsWith("archive.org") ? parsedUrl.pathname.match(/^\/details\/([^/]+)/) : null;
    if (archiveMatch?.[1]) {
      const metadataResponse = await fetch(`https://archive.org/metadata/${encodeURIComponent(archiveMatch[1])}`, { signal: AbortSignal.timeout(7e3) });
      if (metadataResponse.ok) {
        const metadata = await metadataResponse.json();
        const imageFiles = (metadata.files ?? []).filter((file) => {
          const name = (file.name ?? "").toLowerCase();
          const format = (file.format ?? "").toLowerCase();
          return /\.(jpe?g|png|webp|gif|avif)$/i.test(name) || /image\/(jpeg|png|webp|gif|avif)/i.test(format);
        });
        const selected = imageFiles.find((file) => /cover|front|title/i.test(file.name ?? "")) ?? imageFiles[0];
        if (selected?.name) return `https://archive.org/download/${encodeURIComponent(archiveMatch[1])}/${selected.name.split("/").map(encodeURIComponent).join("/")}`;
      }
    }
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(7e3), headers: { Accept: "image/*, text/html;q=0.9" } });
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.startsWith("image/")) return response.url || url;
    if (contentType.includes("text/html")) {
      const html = await response.text();
      const match = html.match(/<meta[^>]+(?:property|name)=[\"'](?:og:image|twitter:image)[\"'][^>]+content=[\"']([^\"']+)[\"']/i) ?? html.match(/<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+(?:property|name)=[\"'](?:og:image|twitter:image)[\"']/i);
      if (match?.[1]) return new URL(match[1], response.url || url).toString();
      const imageSource = html.match(/<img[^>]+(?:src|data-src)=[\"']([^\"']+)[\"']/i)?.[1];
      if (imageSource) return new URL(imageSource, response.url || url).toString();
    }
  } catch {
  }
  return url;
}
async function createNovel(input) {
  const db = await getDb();
  const { genreIds = [], links, ...novelInput } = input;
  const resolvedCoverUrl = await resolveCoverUrl(input.coverUrl);
  if (!db) {
    const rows = await supabaseWrite("novels", "POST", { ...novelInput, slug: normalizeNovelSlug(input.slug || input.title), coverUrl: resolvedCoverUrl, description: input.description || null });
    const row2 = rows[0];
    if (links) await replaceNovelLinks(Number(row2.id), links);
    if (genreIds.length) await supabaseWrite("novelGenres", "POST", genreIds.map((genreId) => ({ novelId: row2.id, genreId })));
    return row2;
  }
  const [row] = await db.insert(novels).values({ ...novelInput, slug: normalizeNovelSlug(input.slug || input.title), coverUrl: resolvedCoverUrl, description: input.description || null }).returning();
  if (links) await replaceNovelLinks(Number(row.id), links);
  if (genreIds.length) await db.insert(novelGenres).values(genreIds.map((genreId) => ({ novelId: row.id, genreId }))).onConflictDoNothing();
  return row;
}
async function updateNovel(id, input) {
  const db = await getDb();
  const { genreIds, links, ...novelInput } = input;
  const resolvedCoverUrl = input.coverUrl === void 0 ? void 0 : await resolveCoverUrl(input.coverUrl);
  if (resolvedCoverUrl !== void 0) novelInput.coverUrl = resolvedCoverUrl ?? "";
  if (!db) {
    const normalizedInput2 = novelInput.slug ? { ...novelInput, slug: normalizeNovelSlug(novelInput.slug) } : novelInput;
    const rows = await supabaseWrite("novels", "PATCH", { ...normalizedInput2, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, `id=eq.${id}`);
    if (links) await replaceNovelLinks(id, links);
    if (genreIds) {
      await supabaseWrite("novelGenres", "DELETE", void 0, `novelId=eq.${id}`);
      if (genreIds.length) await supabaseWrite("novelGenres", "POST", genreIds.map((genreId) => ({ novelId: id, genreId })));
    }
    return rows[0] ?? null;
  }
  const normalizedInput = novelInput.slug ? { ...novelInput, slug: normalizeNovelSlug(novelInput.slug) } : novelInput;
  const [row] = await db.update(novels).set({ ...normalizedInput, updatedAt: /* @__PURE__ */ new Date() }).where(eq(novels.id, id)).returning();
  if (!row) return null;
  if (links) await replaceNovelLinks(id, links);
  if (genreIds) {
    await db.delete(novelGenres).where(eq(novelGenres.novelId, id));
    if (genreIds.length) await db.insert(novelGenres).values(genreIds.map((genreId) => ({ novelId: id, genreId }))).onConflictDoNothing();
  }
  return row;
}
async function deleteNovel(id) {
  const db = await getDb();
  if (!db) {
    await replaceNovelLinks(id);
    for (const [table, column] of [["novelGenres", "novelId"], ["seriesBooks", "novelId"], ["readingListItems", "novelId"], ["ratings", "novelId"], ["reviews", "novelId"]]) await supabaseWrite(table, "DELETE", void 0, `${column}=eq.${id}`);
    await supabaseWrite("novels", "DELETE", void 0, `id=eq.${id}`);
    return { success: true };
  }
  await db.delete(novelGenres).where(eq(novelGenres.novelId, id));
  await db.delete(seriesBooks).where(eq(seriesBooks.novelId, id));
  await db.delete(readingListItems).where(eq(readingListItems.novelId, id));
  await db.delete(ratings).where(eq(ratings.novelId, id));
  await db.delete(reviews).where(eq(reviews.novelId, id));
  await db.delete(novels).where(eq(novels.id, id));
  return { success: true };
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { z as z3 } from "zod";

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";

// server/management.ts
import { sql as sql2 } from "drizzle-orm";
var schemaPromise = null;
async function query(statement) {
  const db = await getDb();
  if (!db) throw new Error("\u0642\u0627\u0639\u062F\u0629 \u0627\u0644\u0628\u064A\u0627\u0646\u0627\u062A \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629");
  const result = await db.execute(statement);
  return result.rows;
}
function ensureManagementSchema() {
  if (!schemaPromise) schemaPromise = (async () => {
    await query(sql2`CREATE TABLE IF NOT EXISTS audit_logs (id serial primary key, actor_open_id varchar(160), actor_name text, action varchar(80) not null, entity_type varchar(80), entity_id varchar(160), details text, ip_address varchar(160), user_agent text, created_at timestamptz not null default now())`);
    await query(sql2`CREATE TABLE IF NOT EXISTS trash_items (id serial primary key, entity_type varchar(80) not null, entity_id varchar(160) not null, label text not null, payload text not null, deleted_by varchar(160), deleted_at timestamptz not null default now(), restored_at timestamptz)`);
    await query(sql2`CREATE TABLE IF NOT EXISTS notifications (id serial primary key, recipient_open_id varchar(160), recipient_role varchar(40), title varchar(255) not null, body text not null, link_url varchar(500), read_at timestamptz, created_by varchar(160), created_at timestamptz not null default now())`);
    await query(sql2`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category varchar(40) not null default 'general'`);
    await query(sql2`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS color varchar(20) not null default '#675de8'`);
    await query(sql2`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority varchar(20) not null default 'normal'`);
    await query(sql2`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_at timestamptz`);
    await query(sql2`CREATE TABLE IF NOT EXISTS admin_messages (id serial primary key, recipient_type varchar(40) not null, recipient_open_id varchar(160), recipient_role varchar(40), subject varchar(255) not null, body text not null, sent_by varchar(160) not null, created_at timestamptz not null default now())`);
    await query(sql2`CREATE TABLE IF NOT EXISTS advertisements (id serial primary key, title varchar(255) not null, body text, image_url varchar(500), link_url varchar(500), placement varchar(80) not null default 'home', status varchar(40) not null default 'draft', start_at timestamptz, end_at timestamptz, impressions integer not null default 0, clicks integer not null default 0, created_by varchar(160) not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`);
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}
async function audit(actor, action, entityType, entityId, details, req) {
  await ensureManagementSchema();
  await query(sql2`INSERT INTO audit_logs (actor_open_id, actor_name, action, entity_type, entity_id, details, ip_address, user_agent) VALUES (${actor.openId}, ${actor.name ?? null}, ${action}, ${entityType ?? null}, ${entityId ?? null}, ${details ? JSON.stringify(details) : null}, ${req?.ip ?? null}, ${req?.headers?.["user-agent"] ?? null})`);
}
async function listAuditLogs(limit = 100) {
  await ensureManagementSchema();
  return query(sql2`SELECT id, actor_open_id AS "actorOpenId", actor_name AS "actorName", action, entity_type AS "entityType", entity_id AS "entityId", details, ip_address AS "ipAddress", user_agent AS "userAgent", created_at AS "createdAt" FROM audit_logs ORDER BY created_at DESC LIMIT ${limit}`);
}
async function listTrash() {
  await ensureManagementSchema();
  return query(sql2`SELECT id, entity_type AS "entityType", entity_id AS "entityId", label, payload, deleted_by AS "deletedBy", deleted_at AS "deletedAt", restored_at AS "restoredAt" FROM trash_items WHERE restored_at IS NULL ORDER BY deleted_at DESC`);
}
async function restoreTrash(id, actor) {
  await ensureManagementSchema();
  const rows = await query(sql2`SELECT entity_type AS "entityType", payload FROM trash_items WHERE id = ${id} AND restored_at IS NULL LIMIT 1`);
  const item = rows[0];
  if (item?.entityType === "advertisement" && item.payload) {
    const payload = typeof item.payload === "string" ? JSON.parse(item.payload) : item.payload;
    await query(sql2`INSERT INTO advertisements (id, title, body, image_url, link_url, placement, status, start_at, end_at, impressions, clicks, created_by, created_at, updated_at) VALUES (${payload.id}, ${payload.title}, ${payload.body ?? null}, ${payload.image_url ?? null}, ${payload.link_url ?? null}, ${payload.placement ?? "home"}, ${payload.status ?? "draft"}, ${payload.start_at ?? null}, ${payload.end_at ?? null}, ${payload.impressions ?? 0}, ${payload.clicks ?? 0}, ${payload.created_by ?? actor.openId}, ${payload.created_at ?? /* @__PURE__ */ new Date()}, now()) ON CONFLICT (id) DO NOTHING`);
  }
  await query(sql2`UPDATE trash_items SET restored_at = now() WHERE id = ${id} AND restored_at IS NULL`);
  await audit(actor, "trash.restore", "trash", String(id));
  return { success: true };
}
async function purgeTrash(id, actor) {
  await ensureManagementSchema();
  await query(sql2`DELETE FROM trash_items WHERE id = ${id}`);
  await audit(actor, "trash.purge", "trash", String(id));
  return { success: true };
}
async function listNotifications(openId, role) {
  await ensureManagementSchema();
  return query(sql2`SELECT id, title, body, link_url AS "linkUrl", category, color, priority, read_at AS "readAt", scheduled_at AS "scheduledAt", created_at AS "createdAt" FROM notifications WHERE (recipient_open_id = ${openId} OR recipient_role = 'all' OR recipient_role = ${role}) AND (scheduled_at IS NULL OR scheduled_at <= now()) ORDER BY created_at DESC LIMIT 100`);
}
async function markNotificationRead(id, openId) {
  await ensureManagementSchema();
  await query(sql2`UPDATE notifications SET read_at = now() WHERE id = ${id} AND (recipient_open_id = ${openId} OR recipient_role = 'all')`);
  return { success: true };
}
async function createNotification(input, actor) {
  await ensureManagementSchema();
  await query(sql2`INSERT INTO notifications (recipient_open_id, recipient_role, title, body, link_url, category, color, priority, scheduled_at, created_by) VALUES (${input.recipientType === "user" ? input.recipientOpenId ?? null : null}, ${input.recipientType === "role" ? input.recipientRole ?? null : input.recipientType === "all" ? "all" : null}, ${input.title}, ${input.body}, ${input.linkUrl ?? null}, ${input.category ?? "general"}, ${input.color ?? "#675de8"}, ${input.priority ?? "normal"}, ${input.scheduledAt ?? null}, ${actor.openId})`);
  await audit(actor, "notification.create", "notification", void 0, { title: input.title, recipientType: input.recipientType, category: input.category, priority: input.priority });
  return { success: true };
}
async function sendAdminMessage(input, actor) {
  await ensureManagementSchema();
  const role = input.recipientType === "employees" ? "employee" : null;
  await query(sql2`INSERT INTO admin_messages (recipient_type, recipient_open_id, recipient_role, subject, body, sent_by) VALUES (${input.recipientType}, ${input.recipientType === "user" ? input.recipientOpenId ?? null : null}, ${role}, ${input.subject}, ${input.body}, ${actor.openId})`);
  await audit(actor, "message.send", "message", void 0, { recipientType: input.recipientType, subject: input.subject });
  return { success: true };
}
async function listMessagesForUser(openId, isEmployee) {
  await ensureManagementSchema();
  return query(sql2`SELECT id, subject, body, created_at AS "createdAt" FROM admin_messages WHERE recipient_open_id = ${openId} OR recipient_type = 'users' OR (${isEmployee} AND recipient_role = 'employee') ORDER BY created_at DESC LIMIT 100`);
}
async function listAds() {
  await ensureManagementSchema();
  return query(sql2`SELECT id, title, body, image_url AS "imageUrl", link_url AS "linkUrl", placement, status, start_at AS "startAt", end_at AS "endAt", impressions, clicks, created_at AS "createdAt", updated_at AS "updatedAt" FROM advertisements ORDER BY updated_at DESC`);
}
async function createAd(input, actor) {
  await ensureManagementSchema();
  const rows = await query(sql2`INSERT INTO advertisements (title, body, image_url, link_url, placement, status, start_at, end_at, created_by) VALUES (${input.title}, ${input.body ?? null}, ${input.imageUrl ?? null}, ${input.linkUrl ?? null}, ${input.placement}, ${input.status}, ${input.startAt ?? null}, ${input.endAt ?? null}, ${actor.openId}) RETURNING id`);
  await audit(actor, "ad.create", "advertisement", String(rows[0]?.id), { title: input.title });
  return rows[0];
}
async function updateAd(id, input, actor) {
  await ensureManagementSchema();
  await query(sql2`UPDATE advertisements SET title = COALESCE(${input.title ?? null}, title), body = COALESCE(${input.body ?? null}, body), image_url = COALESCE(${input.imageUrl ?? null}, image_url), link_url = COALESCE(${input.linkUrl ?? null}, link_url), placement = COALESCE(${input.placement ?? null}, placement), status = COALESCE(${input.status ?? null}, status), start_at = COALESCE(${input.startAt ?? null}, start_at), end_at = COALESCE(${input.endAt ?? null}, end_at), updated_at = now() WHERE id = ${id}`);
  await audit(actor, "ad.update", "advertisement", String(id), input);
  return { success: true };
}
async function deleteAd(id, actor) {
  await ensureManagementSchema();
  const rows = await query(sql2`SELECT row_to_json(advertisements) AS payload, title FROM advertisements WHERE id = ${id}`);
  if (rows[0]) await query(sql2`INSERT INTO trash_items (entity_type, entity_id, label, payload, deleted_by) VALUES ('advertisement', ${String(id)}, ${rows[0].title}, ${JSON.stringify(rows[0].payload)}, ${actor.openId})`);
  await query(sql2`DELETE FROM advertisements WHERE id = ${id}`);
  await audit(actor, "ad.delete", "advertisement", String(id));
  return { success: true };
}
async function recordAdEvent(id, event) {
  await ensureManagementSchema();
  await query(event === "click" ? sql2`UPDATE advertisements SET clicks = clicks + 1 WHERE id = ${id}` : sql2`UPDATE advertisements SET impressions = impressions + 1 WHERE id = ${id}`);
  return { success: true };
}
async function listActiveAds(placement) {
  await ensureManagementSchema();
  return query(sql2`SELECT id, title, body, image_url AS "imageUrl", link_url AS "linkUrl", placement FROM advertisements WHERE status = 'published' AND placement = ${placement} AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now()) ORDER BY created_at DESC`);
}
async function getAdminReports() {
  await ensureManagementSchema();
  const [ads, activity, daily, topActors] = await Promise.all([
    query(sql2`SELECT COALESCE(SUM(impressions), 0)::int AS impressions, COALESCE(SUM(clicks), 0)::int AS clicks, COUNT(*)::int AS campaigns, COUNT(*) FILTER (WHERE status = 'published')::int AS published FROM advertisements`),
    query(sql2`SELECT action, COUNT(*)::int AS count FROM audit_logs GROUP BY action ORDER BY count DESC LIMIT 12`),
    query(sql2`SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, COUNT(*) FILTER (WHERE action = 'auth.login')::int AS logins, COUNT(*)::int AS actions FROM audit_logs WHERE created_at >= now() - interval '14 days' GROUP BY day ORDER BY day`),
    query(sql2`SELECT COALESCE(actor_name, actor_open_id) AS actor, COUNT(*)::int AS count FROM audit_logs GROUP BY actor_open_id, actor_name ORDER BY count DESC LIMIT 8`)
  ]);
  const summary = ads[0] ?? { impressions: 0, clicks: 0, campaigns: 0, published: 0 };
  return { summary, activity, daily, topActors };
}

// server/_core/trpc.ts
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    const result = await next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
    void audit(ctx.user, `admin.${opts.path}`, "admin", void 0, { type: opts.type }, ctx.req).catch((error) => console.warn("[Audit] Failed to record action", error));
    return result;
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/adminSummary.ts
async function restCount(table, filter = "") {
  if (!ENV.supabaseUrl || !ENV.supabasePublishableKey) return 0;
  try {
    const response = await fetch(
      `${ENV.supabaseUrl}/rest/v1/${table}?select=id${filter ? `&${filter}` : ""}`,
      {
        method: "HEAD",
        headers: {
          apikey: ENV.supabaseSecretKey || ENV.supabasePublishableKey,
          Authorization: `Bearer ${ENV.supabaseSecretKey || ENV.supabasePublishableKey}`,
          Prefer: "count=exact"
        },
        signal: AbortSignal.timeout(8e3)
      }
    );
    if (!response.ok) return 0;
    const range = response.headers.get("content-range") ?? "*/0";
    return Number(range.split("/")[1] || 0);
  } catch {
    return 0;
  }
}
async function getEnhancedAdminSummary() {
  const base = await getAdminSummary();
  const [genresRows, usersRows, quotes, publishedQuotes, draftQuotes] = await Promise.all([
    listAdminGenres().catch(() => []),
    listUsers().catch(() => []),
    restCount("quotes"),
    restCount("quotes", "status=eq.published"),
    restCount("quotes", "status=eq.draft")
  ]);
  return {
    ...base,
    genres: Array.isArray(genresRows) ? genresRows.length : 0,
    users: Array.isArray(usersRows) ? usersRows.length : 0,
    quotes,
    publishedQuotes,
    draftQuotes
  };
}

// server/routers/commerce.ts
import { z as z2 } from "zod";

// server/_core/shopify.ts
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/_core/shopifyNormalize.ts
function normalizeMoney(m) {
  return { amount: m.amount, currencyCode: m.currencyCode };
}
function normalizeImage(i) {
  return { url: i.url, altText: i.altText ?? null, width: i.width, height: i.height };
}
function normalizeSelectedOption(o) {
  return { name: o.name, value: o.value };
}
function normalizeProductOption(o) {
  return { name: o.name, values: o.values };
}
function normalizeVariant(v) {
  return {
    id: v.id,
    title: v.title,
    price: normalizeMoney(v.price),
    compareAtPrice: v.compareAtPrice ? normalizeMoney(v.compareAtPrice) : null,
    availableForSale: v.availableForSale,
    selectedOptions: (v.selectedOptions ?? []).map(normalizeSelectedOption)
  };
}
function normalizeProduct(p) {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description,
    descriptionHtml: p.descriptionHtml,
    productType: p.productType || null,
    vendor: p.vendor || null,
    tags: p.tags ?? [],
    images: p.images.edges.map((e) => normalizeImage(e.node)),
    priceRange: {
      min: normalizeMoney(p.priceRange.minVariantPrice),
      max: normalizeMoney(p.priceRange.maxVariantPrice)
    },
    options: (p.options ?? []).map(normalizeProductOption),
    variants: p.variants.edges.map((e) => normalizeVariant(e.node))
  };
}
function normalizeCollection(c) {
  return {
    id: c.id,
    handle: c.handle,
    title: c.title,
    description: c.description,
    image: c.image ? normalizeImage(c.image) : null
  };
}
function normalizeCartItem(line) {
  const img = line.merchandise.product.images.edges[0]?.node ?? null;
  return {
    lineId: line.id,
    variantId: line.merchandise.id,
    productHandle: line.merchandise.product.handle,
    productTitle: line.merchandise.product.title,
    variantTitle: line.merchandise.title,
    image: img ? normalizeImage(img) : null,
    unitPrice: normalizeMoney(line.merchandise.price),
    quantity: line.quantity,
    lineTotal: normalizeMoney(line.cost.totalAmount)
  };
}
function withChannelParam(checkoutUrl) {
  if (!checkoutUrl) return checkoutUrl;
  return checkoutUrl.includes("?") ? `${checkoutUrl}&channel=online_store` : `${checkoutUrl}?channel=online_store`;
}
function normalizeCart(c) {
  return {
    id: c.id,
    checkoutUrl: withChannelParam(c.checkoutUrl),
    items: c.lines.edges.map((e) => normalizeCartItem(e.node)),
    itemCount: c.totalQuantity,
    subtotal: normalizeMoney(c.cost.subtotalAmount),
    total: normalizeMoney(c.cost.totalAmount)
  };
}

// server/_core/shopify.ts
var SHOPIFY_API_VERSION = "2025-04";
function getShopifyStoreDomain() {
  return process.env.SHOPIFY_STORE_DOMAIN ?? "";
}
function getShopifyStorefrontToken() {
  return process.env.SHOPIFY_STOREFRONT_API_ACCESS_TOKEN ?? "";
}
function isShopifyConfigured() {
  return Boolean(getShopifyStoreDomain() && getShopifyStorefrontToken());
}
function shopifyStorefrontEndpoint() {
  return `https://${getShopifyStoreDomain()}/api/${SHOPIFY_API_VERSION}/graphql.json`;
}
async function storefrontFetch(query2, variables) {
  if (!isShopifyConfigured()) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Shopify Storefront API is not configured"
    });
  }
  let response;
  try {
    response = await fetch(shopifyStorefrontEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Storefront-Access-Token": getShopifyStorefrontToken()
      },
      body: JSON.stringify({ query: query2, variables })
    });
  } catch (err) {
    console.error("[Shopify] Network error", err);
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Shopify Storefront API is unreachable"
    });
  }
  if (!response.ok) {
    console.error(
      "[Shopify] HTTP",
      response.status,
      await response.text().catch(() => "")
    );
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: `Shopify Storefront API returned HTTP ${response.status}`
    });
  }
  const json = await response.json();
  if (json.errors && json.errors.length) {
    console.error("[Shopify] GraphQL errors", json.errors);
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: json.errors[0].message || "Shopify Storefront API error"
    });
  }
  if (!json.data) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: "Shopify Storefront API returned no data"
    });
  }
  return json.data;
}
function unwrapCart(payload, context) {
  if (payload.userErrors && payload.userErrors.length) {
    console.error(`[Shopify] ${context} userErrors`, payload.userErrors);
    throw new TRPCError3({
      code: "BAD_REQUEST",
      message: payload.userErrors[0].message || `Shopify ${context} failed`
    });
  }
  if (!payload.cart) {
    throw new TRPCError3({
      code: "INTERNAL_SERVER_ERROR",
      message: `Shopify ${context} returned no cart`
    });
  }
  return normalizeCart(payload.cart);
}
var MONEY_FRAGMENT = (
  /* GraphQL */
  `
  fragment MoneyFields on MoneyV2 {
    amount
    currencyCode
  }
`
);
var IMAGE_FRAGMENT = (
  /* GraphQL */
  `
  fragment ImageFields on Image {
    url
    altText
    width
    height
  }
`
);
var VARIANT_FRAGMENT = (
  /* GraphQL */
  `
  ${MONEY_FRAGMENT}
  fragment VariantFields on ProductVariant {
    id
    title
    availableForSale
    price { ...MoneyFields }
    compareAtPrice { ...MoneyFields }
    selectedOptions { name value }
  }
`
);
var PRODUCT_FRAGMENT = (
  /* GraphQL */
  `
  ${IMAGE_FRAGMENT}
  ${VARIANT_FRAGMENT}
  fragment ProductFields on Product {
    id
    title
    handle
    description
    descriptionHtml
    productType
    vendor
    tags
    options { name values }
    priceRange {
      minVariantPrice { ...MoneyFields }
      maxVariantPrice { ...MoneyFields }
    }
    images(first: 8) {
      edges { node { ...ImageFields } }
    }
    variants(first: 25) {
      edges { node { ...VariantFields } }
    }
  }
`
);
var COLLECTION_FRAGMENT = (
  /* GraphQL */
  `
  ${IMAGE_FRAGMENT}
  fragment CollectionFields on Collection {
    id
    handle
    title
    description
    image { ...ImageFields }
  }
`
);
var CART_FRAGMENT = (
  /* GraphQL */
  `
  ${MONEY_FRAGMENT}
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost {
      totalAmount { ...MoneyFields }
      subtotalAmount { ...MoneyFields }
    }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost { totalAmount { ...MoneyFields } }
          merchandise {
            ... on ProductVariant {
              id
              title
              price { ...MoneyFields }
              product {
                handle
                title
                images(first: 1) {
                  edges { node { url altText width height } }
                }
              }
            }
          }
        }
      }
    }
  }
`
);
async function listProducts(options = {}) {
  const first = options.first ?? 24;
  if (options.collectionHandle) {
    const data2 = await storefrontFetch(
      `${PRODUCT_FRAGMENT}
       query productsByCollection($handle: String!, $first: Int!) {
         collection(handle: $handle) {
           products(first: $first) {
             edges { node { ...ProductFields } }
           }
         }
       }`,
      { handle: options.collectionHandle, first }
    );
    if (!data2.collection) return [];
    return data2.collection.products.edges.map((e) => normalizeProduct(e.node));
  }
  const data = await storefrontFetch(
    `${PRODUCT_FRAGMENT}
     query listProducts($first: Int!) {
       products(first: $first, sortKey: TITLE) {
         edges { node { ...ProductFields } }
       }
     }`,
    { first }
  );
  return data.products.edges.map((e) => normalizeProduct(e.node));
}
async function getProductByHandle(handle) {
  const data = await storefrontFetch(
    `${PRODUCT_FRAGMENT}
     query productByHandle($handle: String!) {
       productByHandle(handle: $handle) { ...ProductFields }
     }`,
    { handle }
  );
  if (!data.productByHandle) {
    throw new TRPCError3({
      code: "NOT_FOUND",
      message: `Product "${handle}" not found`
    });
  }
  return normalizeProduct(data.productByHandle);
}
async function listCollections(first = 10) {
  const data = await storefrontFetch(
    `${COLLECTION_FRAGMENT}
     query listCollections($first: Int!) {
       collections(first: $first) {
         edges { node { ...CollectionFields } }
       }
     }`,
    { first }
  );
  return data.collections.edges.map((e) => normalizeCollection(e.node));
}
async function getCollectionByHandle(handle) {
  const data = await storefrontFetch(
    `${COLLECTION_FRAGMENT}
     query collectionByHandle($handle: String!) {
       collection(handle: $handle) { ...CollectionFields }
     }`,
    { handle }
  );
  if (!data.collection) {
    throw new TRPCError3({
      code: "NOT_FOUND",
      message: `Collection "${handle}" not found`
    });
  }
  return normalizeCollection(data.collection);
}
async function createCart(lines) {
  const data = await storefrontFetch(
    `${CART_FRAGMENT}
     mutation cartCreate($input: CartInput!) {
       cartCreate(input: $input) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    {
      input: {
        lines: lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity }))
      }
    }
  );
  return unwrapCart(data.cartCreate, "cartCreate");
}
async function getCart(cartId) {
  const data = await storefrontFetch(
    `${CART_FRAGMENT}
     query getCart($cartId: ID!) {
       cart(id: $cartId) { ...CartFields }
     }`,
    { cartId }
  );
  return data.cart ? normalizeCart(data.cart) : null;
}
async function addCartLines(cartId, lines) {
  const data = await storefrontFetch(
    `${CART_FRAGMENT}
     mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
       cartLinesAdd(cartId: $cartId, lines: $lines) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    {
      cartId,
      lines: lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity }))
    }
  );
  return unwrapCart(data.cartLinesAdd, "cartLinesAdd");
}
async function updateCartLines(cartId, updates) {
  const data = await storefrontFetch(
    `${CART_FRAGMENT}
     mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
       cartLinesUpdate(cartId: $cartId, lines: $lines) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    {
      cartId,
      lines: updates.map((u) => ({ id: u.lineId, quantity: u.quantity }))
    }
  );
  return unwrapCart(data.cartLinesUpdate, "cartLinesUpdate");
}
async function removeCartLines(cartId, lineIds) {
  const data = await storefrontFetch(
    `${CART_FRAGMENT}
     mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
       cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
         cart { ...CartFields }
         userErrors { code field message }
       }
     }`,
    { cartId, lineIds }
  );
  return unwrapCart(data.cartLinesRemove, "cartLinesRemove");
}

// server/routers/commerce.ts
var cartLineInputSchema = z2.object({
  variantId: z2.string().min(1),
  quantity: z2.number().int().min(1).max(99)
});
var cartLineUpdateSchema = z2.object({
  lineId: z2.string().min(1),
  /** 0 means "remove this line" — the route forwards to removeLines. */
  quantity: z2.number().int().min(0).max(99)
});
var commerceRouter = router({
  products: router({
    list: publicProcedure.input(
      z2.object({
        first: z2.number().int().min(1).max(100).optional(),
        collectionHandle: z2.string().min(1).optional()
      }).optional()
    ).query(async ({ input }) => {
      return listProducts(input ?? {});
    }),
    byHandle: publicProcedure.input(z2.object({ handle: z2.string().min(1) })).query(async ({ input }) => {
      return getProductByHandle(input.handle);
    })
  }),
  collections: router({
    list: publicProcedure.input(z2.object({ first: z2.number().int().min(1).max(50).optional() }).optional()).query(async ({ input }) => {
      return listCollections(input?.first);
    }),
    byHandle: publicProcedure.input(z2.object({ handle: z2.string().min(1) })).query(async ({ input }) => {
      return getCollectionByHandle(input.handle);
    })
  }),
  cart: router({
    create: publicProcedure.input(z2.object({ lines: z2.array(cartLineInputSchema).min(1).max(50) })).mutation(async ({ input }) => {
      return createCart(input.lines);
    }),
    get: publicProcedure.input(z2.object({ cartId: z2.string().min(1) })).query(async ({ input }) => {
      return getCart(input.cartId);
    }),
    addLines: publicProcedure.input(
      z2.object({
        cartId: z2.string().min(1),
        lines: z2.array(cartLineInputSchema).min(1).max(50)
      })
    ).mutation(async ({ input }) => {
      return addCartLines(input.cartId, input.lines);
    }),
    updateLines: publicProcedure.input(
      z2.object({
        cartId: z2.string().min(1),
        lines: z2.array(cartLineUpdateSchema).min(1).max(50)
      })
    ).mutation(async ({ input }) => {
      const toRemove = input.lines.filter((l) => l.quantity === 0).map((l) => l.lineId);
      const toUpdate = input.lines.filter((l) => l.quantity > 0);
      let cart = null;
      if (toUpdate.length) {
        cart = await updateCartLines(input.cartId, toUpdate);
      }
      if (toRemove.length) {
        cart = await removeCartLines(input.cartId, toRemove);
      }
      if (!cart) cart = await getCart(input.cartId);
      return cart;
    }),
    removeLines: publicProcedure.input(
      z2.object({
        cartId: z2.string().min(1),
        lineIds: z2.array(z2.string().min(1)).min(1).max(50)
      })
    ).mutation(async ({ input }) => {
      return removeCartLines(input.cartId, input.lineIds);
    })
  })
});

// server/_core/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";
var adminClient = null;
function getSupabaseAdmin() {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) return null;
  adminClient ??= createClient(ENV.supabaseUrl, ENV.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return adminClient;
}
function toManagedUser(user, localRole) {
  return {
    id: user.id,
    email: user.email ?? null,
    name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    role: localRole ?? (user.app_metadata?.role === "admin" ? "admin" : "user"),
    emailConfirmed: Boolean(user.email_confirmed_at),
    disabled: user.banned_until === "none" ? false : Boolean(user.banned_until),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null
  };
}
async function listSupabaseUsers() {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase admin key is not configured");
  const users2 = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users2.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }
  return users2;
}
async function updateSupabaseUserRole(id, role) {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase admin key is not configured");
  const { data, error } = await client.auth.admin.getUserById(id);
  if (error || !data.user) throw error ?? new Error("User not found");
  const metadata = { ...data.user.app_metadata, role };
  const result = await client.auth.admin.updateUserById(id, { app_metadata: metadata });
  if (result.error || !result.data.user) throw result.error ?? new Error("Unable to update user role");
  return result.data.user;
}
async function confirmSupabaseUserEmail(id) {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase admin key is not configured");
  const result = await client.auth.admin.updateUserById(id, { email_confirm: true });
  if (result.error || !result.data.user) throw result.error ?? new Error("Unable to confirm email");
  return result.data.user;
}

// server/cloudinary.ts
import crypto from "node:crypto";
function readConfig() {
  const value = ENV.cloudinaryUrl;
  if (!value) return null;
  const match = value.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!match) return null;
  return { apiKey: decodeURIComponent(match[1]), apiSecret: decodeURIComponent(match[2]), cloudName: match[3] };
}
async function uploadNovelCover(dataUrl, filename) {
  const config = readConfig();
  if (!config) throw new Error("Cloudinary is not configured");
  const timestamp2 = Math.floor(Date.now() / 1e3);
  const publicId = filename.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `cover-${timestamp2}`;
  const signatureBase = `folder=riwaya/covers&public_id=${publicId}&timestamp=${timestamp2}${config.apiSecret}`;
  const signature = crypto.createHash("sha1").update(signatureBase).digest("hex");
  const body = new FormData();
  body.set("file", dataUrl);
  body.set("api_key", config.apiKey);
  body.set("timestamp", String(timestamp2));
  body.set("folder", "riwaya/covers");
  body.set("public_id", publicId);
  body.set("signature", signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, { method: "POST", body });
  const result = await response.json();
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message ?? "Cloudinary upload failed");
  return { url: result.secure_url, publicId: result.public_id ?? publicId };
}

// server/_core/llm.ts
var ensureArray = (value) => Array.isArray(value) ? value : [value];
var normalizeContentPart = (part) => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") {
    return part;
  }
  if (part.type === "image_url") {
    return part;
  }
  if (part.type === "file_url") {
    return part;
  }
  throw new Error("Unsupported message content part");
};
var normalizeMessage = (message) => {
  const { role, name, tool_call_id } = message;
  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content).map((part) => typeof part === "string" ? part : JSON.stringify(part)).join("\n");
    return {
      role,
      name,
      tool_call_id,
      content
    };
  }
  const contentParts = ensureArray(message.content).map(normalizeContentPart);
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text
    };
  }
  return {
    role,
    name,
    content: contentParts
  };
};
var normalizeToolChoice = (toolChoice, tools) => {
  if (!toolChoice) return void 0;
  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }
  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }
    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }
    return {
      type: "function",
      function: { name: tools[0].function.name }
    };
  }
  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name }
    };
  }
  return toolChoice;
};
var resolveApiUrl = () => ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0 ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions` : "https://forge.manus.im/v1/chat/completions";
var assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};
var normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema
}) => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }
  const schema = outputSchema || output_schema;
  if (!schema) return void 0;
  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }
  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...typeof schema.strict === "boolean" ? { strict: schema.strict } : {}
    }
  };
};
var RETRY_MAX_RETRIES = 4;
var RETRY_BASE_DELAY_MS = 500;
var RETRY_MAX_DELAY_MS = 3e4;
var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var parseRetryAfter = (value) => {
  if (!value) return void 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1e3);
  const at = Date.parse(value);
  return Number.isNaN(at) ? void 0 : Math.max(0, at - Date.now());
};
var computeBackoffDelay = (attempt, retryAfterMs) => {
  const cap = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jittered = cap / 2 + Math.random() * (cap / 2);
  return Math.min(Math.max(jittered, retryAfterMs ?? 0), RETRY_MAX_DELAY_MS);
};
var fetchWithBackoff = async (url, init) => {
  let lastError;
  for (let attempt = 0; attempt <= RETRY_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || attempt === RETRY_MAX_RETRIES) {
        return response;
      }
      const retryAfterMs = parseRetryAfter(
        response.headers.get("retry-after")
      );
      try {
        await response.body?.cancel();
      } catch {
      }
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after status ${response.status}`
      );
      await sleep(computeBackoffDelay(attempt, retryAfterMs));
    } catch (error) {
      lastError = error;
      if (attempt === RETRY_MAX_RETRIES) throw error;
      console.warn(
        `LLM request retry ${attempt + 1}/${RETRY_MAX_RETRIES} after network error`
      );
      await sleep(computeBackoffDelay(attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("LLM request failed after exhausting retries");
};
async function invokeLLM(params) {
  assertApiKey();
  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
    model,
    thinking,
    reasoning,
    maxTokens,
    max_tokens
  } = params;
  const payload = {
    messages: messages.map(normalizeMessage)
  };
  if (model) {
    payload.model = model;
  }
  if (tools && tools.length > 0) {
    payload.tools = tools;
  }
  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }
  const resolvedMaxTokens = max_tokens ?? maxTokens;
  if (typeof resolvedMaxTokens === "number") {
    payload.max_tokens = resolvedMaxTokens;
  }
  if (thinking) {
    payload.thinking = thinking;
  }
  if (reasoning) {
    payload.reasoning = reasoning;
  }
  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema
  });
  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }
  const response = await fetchWithBackoff(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} \u2013 ${errorText}`
    );
  }
  return await response.json();
}

// server/quotes.ts
import { isIP } from "node:net";
async function request(path3, init = {}) {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) throw new Error("Supabase admin REST is not configured");
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${path3}`, { ...init, headers: { apikey: ENV.supabaseSecretKey, Authorization: `Bearer ${ENV.supabaseSecretKey}`, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers ?? {} } });
  if (!response.ok) throw new Error(`Quotes API ${response.status}: ${await response.text()}`);
  const text2 = await response.text();
  return text2 ? JSON.parse(text2) : [];
}
var authorsCache = null;
var booksCache = null;
async function listQuotes(publicOnly = false, limit = 200, offset = 0) {
  const requested = Math.min(1e4, Math.max(1, limit));
  const pageSize = Math.min(1e3, requested);
  const rows = [];
  for (let cursor = Math.max(0, offset); rows.length < requested; cursor += pageSize) {
    const page = await request(`quotes?select=*&${publicOnly ? "status=eq.published&" : ""}order=created_at.desc&limit=${Math.min(pageSize, requested - rows.length)}&offset=${cursor}`);
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return enrichQuotes(rows);
}
async function getQuote(id) {
  const rows = await request(`quotes?id=eq.${id}&status=eq.published&select=*&limit=1`);
  return (await enrichQuotes(rows))[0] ?? null;
}
async function getQuoteNeighbors(id) {
  const current = await request(`quotes?id=eq.${id}&status=eq.published&select=id,created_at&limit=1`);
  const row = current[0];
  if (!row) return { previous: null, next: null };
  const timestamp2 = encodeURIComponent(row.created_at);
  const [previous, next] = await Promise.all([request(`quotes?status=eq.published&created_at=gt.${timestamp2}&select=id&order=created_at.asc&limit=1`), request(`quotes?status=eq.published&created_at=lt.${timestamp2}&select=id&order=created_at.desc&limit=1`)]);
  return { previous: previous[0] ?? null, next: next[0] ?? null };
}
async function listQuotesByAuthor(slug) {
  return (await listQuotes(true, 1e4)).filter((quote) => quote.author_slug === slug);
}
async function listQuotesByBook(slug) {
  return (await listQuotes(true, 1e4)).filter((quote) => quote.book_slug === slug);
}
async function listQuotesByCategory(category) {
  const wanted = comparable(decodeURIComponent(category).replace(/-/g, " "));
  return (await listQuotes(true, 1e4)).filter((quote) => quote.category && comparable(quote.category) === wanted);
}
async function listQuoteCategories() {
  return Array.from(new Set((await listQuotes(true, 1e4)).map((quote) => quote.category).filter((category) => Boolean(category?.trim())))).sort((a, b) => a.localeCompare(b, "ar"));
}
async function enrichQuotes(rows) {
  const authorIds = Array.from(new Set(rows.map((row) => row.author_id).filter((id) => Number.isInteger(id))));
  const bookIds = Array.from(new Set(rows.map((row) => row.novel_id).filter((id) => Number.isInteger(id))));
  const [authors2, books] = await Promise.all([authorIds.length === rows.length ? request(`authors?select=id,name,slug&id=in.(${authorIds.join(",")})`) : listQuoteAuthors(), bookIds.length === rows.length ? request(`novels?select=id,title,slug,authorId&id=in.(${bookIds.join(",")})`) : listQuoteBooks()]);
  return rows.map((row) => {
    const author = authors2.find((item) => item.id === row.author_id) ?? matchEntity(row.speaker, authors2);
    const book = books.find((item) => item.id === row.novel_id) ?? matchEntity(row.book_title, books);
    return { ...row, quote_text: cleanImportedQuote(row.quote_text), author_id: author?.id ?? row.author_id ?? null, author_name: author?.name ?? row.speaker, author_slug: author?.slug ?? null, book_id: book?.id ?? row.novel_id ?? null, book_title: book?.title ?? row.book_title, book_slug: book?.slug ?? null };
  });
}
async function createQuote(input) {
  return (await request("quotes", { method: "POST", body: JSON.stringify(input) }))[0];
}
async function updateQuote(id, input) {
  return (await request(`quotes?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ ...input, updated_at: (/* @__PURE__ */ new Date()).toISOString() }) }))[0];
}
async function deleteQuote(id) {
  await request(`quotes?id=eq.${id}`, { method: "DELETE" });
  return { success: true };
}
async function createQuoteImport(input) {
  return (await request("quote_imports", { method: "POST", body: JSON.stringify(input) }))[0];
}
async function listQuoteImports() {
  return request("quote_imports?select=*&order=created_at.desc&limit=50");
}
async function existingQuoteTexts() {
  const rows = [];
  for (let offset = 0; offset < 1e4; offset += 1e3) {
    const page = await request(`quotes?select=quote_text&order=id.asc&limit=1000&offset=${offset}`);
    rows.push(...page);
    if (page.length < 1e3) break;
  }
  return rows;
}
function editSimilarity(left, right) {
  if (left === right) return 1;
  if (!left || !right) return 0;
  const maxLength = Math.max(left.length, right.length);
  if (Math.abs(left.length - right.length) / maxLength > 0.08) return 0;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= right.length; column += 1) current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1));
    previous = current;
  }
  return 1 - previous[right.length] / maxLength;
}
function removeSimilarQuotes(quotes, existing, threshold = 0.95) {
  const buckets = /* @__PURE__ */ new Map();
  for (const text2 of existing) {
    const normalized = comparable(text2);
    const key = `${normalized.slice(0, 16)}:${Math.floor(normalized.length / 25)}`;
    buckets.set(key, [...buckets.get(key) ?? [], normalized]);
  }
  const accepted = [];
  let duplicateCount = 0;
  for (const quote of quotes) {
    const normalized = comparable(quote.quote_text);
    const key = `${normalized.slice(0, 16)}:${Math.floor(normalized.length / 25)}`;
    const possible = buckets.get(key) ?? [];
    if (possible.some((item) => editSimilarity(normalized, item) >= threshold)) {
      duplicateCount += 1;
      continue;
    }
    accepted.push(quote);
    buckets.set(key, [...possible, normalized]);
  }
  return { quotes: accepted, duplicateCount };
}
async function removeExistingSimilarQuotes(quotes, threshold = 0.95) {
  const existing = (await existingQuoteTexts()).map((row) => row.quote_text);
  return removeSimilarQuotes(quotes, existing, threshold);
}
async function findDuplicateQuotes(threshold = 0.95) {
  const rows = await request("quotes?select=id,quote_text,created_at&order=id.asc&limit=10000");
  const candidates = /* @__PURE__ */ new Map();
  for (const row of rows) {
    const key = comparable(row.quote_text).slice(0, 24);
    const group = candidates.get(key) ?? [];
    group.push(row);
    candidates.set(key, group);
  }
  const result = [];
  for (const group of Array.from(candidates.values())) {
    if (group.length < 2) continue;
    const keep = group[0];
    const remove = group.slice(1).map((row) => ({ ...row, similarity: Number(editSimilarity(comparable(keep.quote_text), comparable(row.quote_text)).toFixed(4)) })).filter((row) => row.similarity >= threshold);
    if (remove.length) result.push({ keep, remove });
  }
  return { threshold, groups: result, removeCount: result.reduce((sum, group) => sum + group.remove.length, 0) };
}
async function deleteDuplicateQuotes(ids) {
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isInteger(id) && id > 0)));
  if (!uniqueIds.length) return { deleted: 0 };
  await request(`quotes?id=in.(${uniqueIds.join(",")})`, { method: "DELETE" });
  return { deleted: uniqueIds.length };
}
async function listQuoteAuthors() {
  if (authorsCache && authorsCache.expires > Date.now()) return authorsCache.data;
  const data = await request("authors?select=id,name,slug&limit=500");
  authorsCache = { data, expires: Date.now() + 5 * 60 * 1e3 };
  return data;
}
async function listQuoteBooks() {
  if (booksCache && booksCache.expires > Date.now()) return booksCache.data;
  const data = await request("novels?select=id,title,slug,authorId&limit=1000");
  booksCache = { data, expires: Date.now() + 5 * 60 * 1e3 };
  return data;
}
function decodeHtml(value) {
  return value.replace(/&nbsp;/gi, " ").replace(/&rlm;|&lrm;|&zwj;|&zwnj;/gi, "").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&ldquo;|&rdquo;|&laquo;|&raquo;/gi, '"').replace(/&lsquo;|&rsquo;|&sbquo;/gi, "'").replace(/&mdash;|&ndash;/gi, "\u2014").replace(/&hellip;/gi, "\u2026").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)));
}
function cleanText(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()).replace(/^\s*[“"«]|[”"»]\s*$/g, "").trim();
}
function cleanImportedQuote(value) {
  const text2 = cleanText(value).replace(/^tags\s*:\s*.+$/i, "").trim();
  return text2.replace(/\s+(?:—|–|―|-{2,})\s+[^\n]{1,180},\s*[^\n,]{1,180}\s*$/, "").replace(/^[\s“"«]+|[\s”"»]+$/g, "").trim();
}
function comparable(value) {
  return cleanImportedQuote(value).toLowerCase().replace(/[ًٌٍَُِّْـ]/g, "").replace(/[أإآ]/g, "\u0627").replace(/ى/g, "\u064A").replace(/ة/g, "\u0647").replace(/[^\u0600-\u06ff\w\d]+/g, "");
}
function filterByLanguage(value, language) {
  const text2 = cleanImportedQuote(value);
  if (language === "both") return text2;
  const letters = text2.match(/[A-Za-z\u0600-\u06ff]/g) ?? [];
  if (letters.length < 3) return "";
  const wanted = language === "ar" ? /[\u0600-\u06ff]/ : /[A-Za-z]/;
  const matching = letters.filter((letter) => wanted.test(letter)).length;
  if (matching / letters.length < 0.55) return "";
  return text2.replace(language === "ar" ? /[A-Za-z]+/g : /[\u0600-\u06ff]+/g, "").replace(/\s{2,}/g, " ").trim();
}
function keepGroundedQuotes(quotes, source) {
  const sourceText = comparable(source);
  return quotes.filter((quote) => {
    const normalized = comparable(quote);
    return normalized.length >= 30 && (sourceText.includes(normalized) || sourceText.includes(normalized.slice(0, Math.min(100, normalized.length))));
  });
}
function matchEntity(value, entities) {
  const wanted = comparable(value ?? "");
  if (!wanted) return null;
  return entities.find((entity) => comparable(entity.name ?? entity.title ?? "") === wanted) ?? null;
}
function meta(html, key) {
  const direct = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const reverse = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
  return decodeHtml(direct.exec(html)?.[1] ?? reverse.exec(html)?.[1] ?? "").trim();
}
function jsonLdValue(html, key) {
  const pattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while (match = pattern.exec(html)) {
    try {
      const parsed = JSON.parse(match[1]);
      const item = Array.isArray(parsed) ? parsed[0] : parsed;
      const value = item?.[key]?.name ?? item?.[key];
      if (typeof value === "string") return value;
    } catch {
    }
  }
  return "";
}
function extractElements(html) {
  const pattern = /<(blockquote|p|li|div|article|section)[^>]*(?:class|id)=["'][^"']*(?:quote|اقتباس|quotation|excerpt)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  const result = [];
  let match;
  while (match = pattern.exec(html)) {
    const text2 = cleanImportedQuote(match[2]);
    if (text2.length >= 12 && text2.length <= 2e3 && !/^tags\s*:/i.test(text2)) result.push(text2);
  }
  return result;
}
async function extractWithAi(text2, instructions) {
  const prompt = `\u0627\u0633\u062A\u062E\u0631\u062C \u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A \u0641\u0642\u0637 \u0645\u0646 \u0627\u0644\u0646\u0635 \u0627\u0644\u062A\u0627\u0644\u064A\u060C \u0643\u0644 \u0627\u0642\u062A\u0628\u0627\u0633 \u0639\u0646\u0635\u0631 \u0645\u0633\u062A\u0642\u0644 \u0648\u0628\u0646\u0641\u0633 \u062A\u0631\u062A\u064A\u0628 \u0638\u0647\u0648\u0631\u0647. \u0627\u0633\u062A\u0628\u0639\u062F \u0623\u0633\u0637\u0631 tags \u0648\u0627\u0644\u062A\u0635\u0646\u064A\u0641\u0627\u062A \u0648\u0623\u064A \u0623\u0631\u0642\u0627\u0645 \u0623\u0648 \u0628\u064A\u0627\u0646\u0627\u062A \u0648\u0627\u062C\u0647\u0629. \u0627\u062D\u0630\u0641 \u0631\u0645\u0648\u0632 HTML \u0648\u0646\u0633\u0628\u0629 \u0627\u0644\u0643\u0627\u062A\u0628 \u0648\u0627\u0644\u0643\u062A\u0627\u0628 \u0645\u0646 \u0646\u0647\u0627\u064A\u0629 \u0646\u0635 \u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633. \u0644\u0627 \u062A\u062E\u062A\u0631\u0639 \u0646\u0635\u064B\u0627 \u0623\u0648 \u0643\u0627\u062A\u0628\u064B\u0627 \u0623\u0648 \u0643\u062A\u0627\u0628\u064B\u0627. \u0627\u0644\u062A\u0639\u0644\u064A\u0645\u0627\u062A: ${instructions}
\u0627\u0644\u0646\u0635:
${text2.slice(0, 5e4)}`;
  const schema = { type: "object", properties: { author: { type: "string" }, book: { type: "string" }, quotes: { type: "array", items: { type: "string" } } }, required: ["author", "book", "quotes"], additionalProperties: false };
  if (ENV.geminiApiKey) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(ENV.geminiApiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: "\u0623\u0646\u062A \u0645\u0633\u062A\u062E\u0631\u062C \u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A \u062F\u0642\u064A\u0642. \u0623\u062E\u0631\u062C JSON \u0641\u0642\u0637." }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: schema } }) });
    if (!response.ok) throw new Error(`\u0641\u0634\u0644 \u0627\u0633\u062A\u062E\u0631\u0627\u062C AI (${response.status})`);
    const payload = await response.json();
    const content2 = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (content2) return JSON.parse(content2);
  }
  const result = await invokeLLM({ model: "gpt-5-mini", maxTokens: 4e3, messages: [{ role: "system", content: "\u0623\u0646\u062A \u0645\u0633\u062A\u062E\u0631\u062C \u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A \u0639\u0631\u0628\u064A \u062F\u0642\u064A\u0642. \u0623\u062E\u0631\u062C JSON \u0641\u0642\u0637 \u0648\u0644\u0627 \u062A\u062E\u062A\u0631\u0639 \u0645\u062D\u062A\u0648\u0649." }, { role: "user", content: prompt }], responseFormat: { type: "json_schema", json_schema: { name: "quote_import", strict: true, schema } } });
  const content = result.choices[0]?.message.content;
  if (!content || typeof content !== "string") throw new Error("\u0644\u0645 \u064A\u064F\u0631\u062C\u0639 AI \u0646\u062A\u064A\u062C\u0629 \u0635\u0627\u0644\u062D\u0629");
  return JSON.parse(content);
}
function telegramChannelUrl(value) {
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol) || !["t.me", "telegram.me"].includes(parsed.hostname.replace(/^www\./, ""))) throw new Error("\u064A\u062C\u0628 \u0625\u062F\u062E\u0627\u0644 \u0631\u0627\u0628\u0637 \u0642\u0646\u0627\u0629 \u062A\u064A\u0644\u064A\u062C\u0631\u0627\u0645 \u0639\u0627\u0645\u0629 \u0645\u062B\u0644 https://t.me/channel");
  const parts = parsed.pathname.split("/").filter(Boolean);
  const channel = parts[0] === "s" ? parts[1] : parts[0];
  if (!channel || channel.startsWith("+") || channel.startsWith("joinchat")) throw new Error("\u0627\u0644\u0642\u0646\u0627\u0629 \u064A\u062C\u0628 \u0623\u0646 \u062A\u0643\u0648\u0646 \u0639\u0627\u0645\u0629 \u0648\u0644\u064A\u0633\u062A \u0631\u0627\u0628\u0637 \u062F\u0639\u0648\u0629 \u062E\u0627\u0635");
  const before = Number(parsed.searchParams.get("before"));
  return { channel, before: Number.isInteger(before) && before > 0 ? before : null };
}
function extractTelegramPosts(html, channel) {
  const posts = [];
  const pattern = /data-post=["']([^"']+\/\d+)["'][\s\S]*?class=["'][^"']*tgme_widget_message_text[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi;
  let match;
  while (match = pattern.exec(html)) {
    const postPath = match[1];
    const id = Number(postPath.split("/").pop());
    const text2 = cleanText(match[2]).replace(/\s*\[[^\]]*\]\([^)]*\)\s*/g, " ").trim();
    if (Number.isInteger(id) && text2.length >= 25) posts.push({ id, url: `https://t.me/${postPath}`, text: text2 });
  }
  return posts.filter((post, index, list) => list.findIndex((item) => item.id === post.id) === index).sort((a, b) => a.id - b.id);
}
function telegramQuote(post, channel) {
  const text2 = post.text.replace(/\s+/g, " ").trim();
  if (/^(تحميل|download|مشاهدة|فيديو|صور|إعلان|اعلان)\b/i.test(text2) || /\.pdf\b/i.test(text2)) return null;
  const attribution = text2.match(/(?:^|\s)[—–-]\s*([^—–-]{2,120}?)(?:\s*[📘📗📒📓📕📑📃📜♪]|$)/);
  const speaker = attribution?.[1]?.trim().replace(/[\s،,.]+$/g, "") ?? "";
  const quote = cleanImportedQuote(attribution ? text2.slice(0, attribution.index).trim() : text2);
  if (quote.length < 25 || quote.length > 2e3 || /^tags\s*:/i.test(quote)) return null;
  return { quote_text: quote, speaker, book_title: "", category: "", status: "published", source_url: post.url };
}
async function scanTelegramChannel(input) {
  const parsed = telegramChannelUrl(input.url);
  const pages = Math.min(10, Math.max(1, input.maxPages ?? 1));
  let before = parsed.before;
  let pagesScanned = 0;
  let postsScanned = 0;
  const quotes = [];
  let lastPageUrl = `https://t.me/s/${parsed.channel}`;
  for (let page = 0; page < pages; page += 1) {
    const pageUrl = new URL(`https://t.me/s/${parsed.channel}`);
    if (before) pageUrl.searchParams.set("before", String(before));
    lastPageUrl = pageUrl.toString();
    const response = await fetch(pageUrl, { headers: { "User-Agent": "RiwayaQuoteImporter/1.0 (+https://e7ketha.vercel.app)" }, signal: AbortSignal.timeout(15e3) });
    if (!response.ok) throw new Error(`\u062A\u0639\u0630\u0631 \u0641\u062A\u062D \u0642\u0646\u0627\u0629 \u062A\u064A\u0644\u064A\u062C\u0631\u0627\u0645 (${response.status})`);
    const posts = extractTelegramPosts((await response.text()).slice(0, 5e6), parsed.channel);
    pagesScanned += 1;
    postsScanned += posts.length;
    for (const post of posts) {
      const quote = telegramQuote(post, parsed.channel);
      if (quote) quotes.push(quote);
    }
    const oldest = posts[0]?.id;
    if (!oldest || posts.length === 0 || before !== null && oldest >= before) {
      const filtered2 = await removeExistingSimilarQuotes(quotes);
      return { sourceUrl: `https://t.me/${parsed.channel}`, pageUrl: lastPageUrl, channel: parsed.channel, pagesScanned, postsScanned, quotes: filtered2.quotes, nextBefore: null, done: true };
    }
    before = oldest - 1;
  }
  const filtered = await removeExistingSimilarQuotes(quotes);
  return { sourceUrl: `https://t.me/${parsed.channel}`, pageUrl: lastPageUrl, channel: parsed.channel, pagesScanned, postsScanned, quotes: filtered.quotes, nextBefore: before, done: false };
}
async function previewQuotesFromUrl(input) {
  const parsedUrl = new URL(input.url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("\u0627\u0644\u0631\u0627\u0628\u0637 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0628\u062F\u0623 \u0628\u0640 http \u0623\u0648 https");
  const host = parsedUrl.hostname.replace(/^\[|\]$/g, "");
  const privateIpv4 = /^(10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
  const privateIpv6 = host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80:");
  if (["localhost", "0.0.0.0"].includes(host) || host.endsWith(".local") || isIP(host) === 4 && privateIpv4 || isIP(host) === 6 && privateIpv6) throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646 \u0641\u062D\u0635 \u0647\u0630\u0627 \u0627\u0644\u0646\u0637\u0627\u0642");
  const response = await fetch(parsedUrl, { headers: { "User-Agent": "RiwayaQuoteImporter/1.0 (+https://e7ketha.vercel.app)" }, signal: AbortSignal.timeout(15e3) });
  if (!response.ok) throw new Error(`\u062A\u0639\u0630\u0631 \u0641\u062A\u062D \u0627\u0644\u0631\u0627\u0628\u0637 (${response.status})`);
  const html = (await response.text()).slice(0, 3e6);
  const author = input.author?.trim() || meta(html, "author") || jsonLdValue(html, "author");
  const book = input.book?.trim() || meta(html, "book") || meta(html, "og:title") || jsonLdValue(html, "isPartOf") || "";
  const instruction = (input.instructions ?? "").toLowerCase();
  let extracted = extractElements(html);
  if (!extracted.length || instruction.includes("\u0643\u0644 \u0633\u0637\u0631")) {
    const visible = cleanText(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<nav[\s\S]*?<\/nav>|<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>/gi, "\n"));
    const lines = visible.split(/(?:\n|\r)+/).map((line) => cleanText(line)).filter((line) => line.length >= 25 && line.length <= 2e3);
    extracted = extracted.length && !instruction.includes("\u0643\u0644 \u0633\u0637\u0631") ? extracted : lines;
  }
  let resolvedAuthor = author;
  let resolvedBook = book;
  if (input.useAi) {
    try {
      const sourceText = cleanText(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " "));
      const ai = await extractWithAi(sourceText, input.instructions ?? "\u0627\u0633\u062A\u062E\u0631\u062C \u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A \u0641\u0642\u0637");
      const grounded = keepGroundedQuotes(ai.quotes, sourceText);
      if (grounded.length < Math.max(1, Math.ceil(ai.quotes.length * 0.5))) throw new Error("AI returned ungrounded quotes");
      extracted = grounded;
      resolvedAuthor ||= ai.author;
      resolvedBook ||= ai.book;
    } catch (error) {
      console.warn("[Quotes] AI extraction unavailable; using deterministic extraction", error);
    }
  }
  const language = input.language ?? "both";
  const unique = Array.from(new Set(extracted.map((quote) => filterByLanguage(quote, language)).filter((quote) => quote.length >= 12 && !/^tags\s*:/i.test(quote))));
  const candidates = unique.map((quote_text) => ({ quote_text, speaker: resolvedAuthor, book_title: resolvedBook, category: "", status: "published" }));
  const filtered = await removeExistingSimilarQuotes(candidates);
  if (!filtered.quotes.length) throw new Error("\u0643\u0644 \u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0648\u062F\u0629 \u0641\u064A \u0627\u0644\u0631\u0627\u0628\u0637 \u0645\u0648\u062C\u0648\u062F\u0629 \u0645\u0633\u0628\u0642\u064B\u0627 \u0623\u0648 \u0645\u062A\u0634\u0627\u0628\u0647\u0629 \u0628\u0646\u0633\u0628\u0629 95\u066A.");
  return { sourceUrl: input.url, author: resolvedAuthor, book: resolvedBook, quotes: filtered.quotes.slice(0, 500), duplicateCount: filtered.duplicateCount + Math.max(0, filtered.quotes.length - 500) };
}
async function improveQuote(input) {
  const prompt = `\u062D\u0633\u0651\u0646 \u0647\u0630\u0627 \u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633 \u062F\u0648\u0646 \u062A\u063A\u064A\u064A\u0631 \u0645\u0639\u0646\u0627\u0647\u060C \u0648\u0627\u0642\u062A\u0631\u062D \u062A\u0635\u0646\u064A\u0641\u064B\u0627 \u0645\u0646\u0627\u0633\u0628\u064B\u0627. \u0644\u0627 \u062A\u062E\u062A\u0631\u0639 \u0627\u0644\u0642\u0627\u0626\u0644 \u0623\u0648 \u0627\u0644\u0643\u062A\u0627\u0628 \u0625\u0630\u0627 \u0644\u0645 \u064A\u0630\u0643\u0631\u0647\u0645\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645. \u0623\u062E\u0631\u062C JSON \u0641\u0642\u0637 \u0628\u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D quote, speaker, book, category, note.
\u0627\u0644\u0646\u0635: ${input.quote}
\u0627\u0644\u0642\u0627\u0626\u0644 \u0625\u0646 \u0648\u062C\u062F: ${input.speaker ?? ""}
\u0627\u0644\u0643\u062A\u0627\u0628 \u0625\u0646 \u0648\u062C\u062F: ${input.book ?? ""}`;
  if (ENV.geminiApiKey) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(ENV.geminiApiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: "\u0623\u0646\u062A \u0645\u062D\u0631\u0631 \u0645\u062D\u062A\u0648\u0649 \u0639\u0631\u0628\u064A \u062F\u0642\u064A\u0642 \u0644\u0645\u0646\u0635\u0629 \u0631\u0648\u0627\u064A\u0627\u062A. \u0644\u0627 \u062A\u0646\u0633\u0628 \u0642\u0648\u0644\u064B\u0627 \u062F\u0648\u0646 \u0645\u0635\u062F\u0631." }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }) });
    if (!response.ok) throw new Error(`Gemini API ${response.status}: ${await response.text()}`);
    const payload = await response.json();
    const content2 = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content2) throw new Error("\u0644\u0645 \u062A\u064F\u0631\u062C\u0639 Gemini \u0646\u062A\u064A\u062C\u0629 \u0635\u0627\u0644\u062D\u0629");
    return JSON.parse(content2);
  }
  const result = await invokeLLM({ model: "gpt-5-mini", maxTokens: 500, messages: [
    { role: "system", content: "\u0623\u0646\u062A \u0645\u062D\u0631\u0631 \u0645\u062D\u062A\u0648\u0649 \u0639\u0631\u0628\u064A. \u0633\u0627\u0639\u062F \u0645\u062F\u064A\u0631 \u0645\u0646\u0635\u0629 \u0631\u0648\u0627\u064A\u0627\u062A \u0639\u0644\u0649 \u062A\u062C\u0647\u064A\u0632 \u0627\u0642\u062A\u0628\u0627\u0633 \u0644\u0644\u0646\u0634\u0631. \u0644\u0627 \u062A\u0646\u0633\u0628 \u0642\u0648\u0644\u064B\u0627 \u0644\u0634\u062E\u0635 \u0623\u0648 \u0643\u062A\u0627\u0628 \u062F\u0648\u0646 \u062F\u0644\u064A\u0644\u061B \u0625\u0630\u0627 \u0644\u0645 \u064A\u0630\u0643\u0631 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0645\u0635\u062F\u0631 \u0627\u062A\u0631\u0643\u0647 \u0641\u0627\u0631\u063A\u064B\u0627. \u0623\u062E\u0631\u062C JSON \u0641\u0642\u0637." },
    { role: "user", content: prompt }
  ], responseFormat: { type: "json_schema", json_schema: { name: "quote_editor", strict: true, schema: { type: "object", properties: { quote: { type: "string" }, speaker: { type: "string" }, book: { type: "string" }, category: { type: "string" }, note: { type: "string" } }, required: ["quote", "speaker", "book", "category", "note"], additionalProperties: false } } } });
  const content = result.choices[0]?.message.content;
  if (!content || typeof content !== "string") throw new Error("\u0644\u0645 \u062A\u064F\u0631\u062C\u0639 \u062E\u062F\u0645\u0629 AI \u0646\u062A\u064A\u062C\u0629 \u0635\u0627\u0644\u062D\u0629");
  return JSON.parse(content);
}

// server/reviews.ts
import { and as and2, desc as desc2, eq as eq2, sql as sql3 } from "drizzle-orm";
async function rest(table, params, init) {
  if (!ENV.supabaseUrl || !(ENV.supabaseSecretKey || ENV.supabasePublishableKey)) {
    throw new Error("Supabase is not configured");
  }
  const key = ENV.supabaseSecretKey || ENV.supabasePublishableKey;
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${table}?${params}`, {
    ...init,
    signal: AbortSignal.timeout(1e4),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init?.headers ?? {}
    }
  });
  if (!response.ok) throw new Error(`Reviews API ${response.status}: ${await response.text()}`);
  const text2 = await response.text();
  return text2 ? JSON.parse(text2) : [];
}
async function listNovelReviews(slug, limit = 30) {
  const novel = await getNovelBySlug(slug);
  if (!novel) return [];
  const db = await getDb();
  if (db) {
    try {
      const rows2 = await db.select({
        id: reviews.id,
        body: reviews.body,
        rating: reviews.rating,
        status: reviews.status,
        createdAt: reviews.createdAt,
        userName: users.name
      }).from(reviews).leftJoin(users, eq2(reviews.userId, users.id)).where(and2(eq2(reviews.novelId, novel.id), eq2(reviews.status, "published"))).orderBy(desc2(reviews.createdAt)).limit(Math.min(100, Math.max(1, limit)));
      return rows2.map((row) => ({
        id: row.id,
        body: row.body,
        rating: row.rating,
        status: row.status,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
        userName: row.userName
      }));
    } catch (error) {
      console.warn("[reviews] drizzle list failed, REST fallback", error);
    }
  }
  const rows = await rest(
    "reviews",
    `select=id,body,rating,status,createdAt,userId&novelId=eq.${novel.id}&status=eq.published&order=createdAt.desc&limit=${Math.min(100, Math.max(1, limit))}`
  );
  const userIds = Array.from(new Set(rows.map((r) => r.userId).filter(Boolean)));
  let nameMap = /* @__PURE__ */ new Map();
  if (userIds.length) {
    try {
      const userRows = await rest("users", `select=id,name&id=in.(${userIds.join(",")})`);
      nameMap = new Map(userRows.map((u) => [Number(u.id), u.name ?? null]));
    } catch {
    }
  }
  return rows.map((row) => ({
    id: Number(row.id),
    body: row.body,
    rating: row.rating == null ? null : Number(row.rating),
    status: row.status,
    createdAt: row.createdAt,
    userName: nameMap.get(Number(row.userId)) ?? null
  }));
}
async function getMyReview(userId, slug) {
  const novel = await getNovelBySlug(slug);
  if (!novel) return null;
  const db = await getDb();
  if (db) {
    const rows2 = await db.select({
      id: reviews.id,
      body: reviews.body,
      rating: reviews.rating,
      status: reviews.status,
      createdAt: reviews.createdAt
    }).from(reviews).where(and2(eq2(reviews.userId, userId), eq2(reviews.novelId, novel.id))).limit(1);
    const row2 = rows2[0];
    if (!row2) return null;
    return {
      id: row2.id,
      body: row2.body,
      rating: row2.rating,
      status: row2.status,
      createdAt: row2.createdAt instanceof Date ? row2.createdAt.toISOString() : String(row2.createdAt)
    };
  }
  const rows = await rest(
    "reviews",
    `select=id,body,rating,status,createdAt&userId=eq.${userId}&novelId=eq.${novel.id}&limit=1`
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    body: row.body,
    rating: row.rating == null ? null : Number(row.rating),
    status: row.status,
    createdAt: row.createdAt
  };
}
async function upsertReview(userId, slug, input) {
  const body = input.body.trim();
  if (body.length < 20) throw new Error("\u0627\u0644\u0631\u0623\u064A \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 20 \u062D\u0631\u0641\u064B\u0627 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644.");
  if (body.length > 4e3) throw new Error("\u0627\u0644\u0631\u0623\u064A \u0637\u0648\u064A\u0644 \u062C\u062F\u064B\u0627 (\u0627\u0644\u062D\u062F 4000 \u062D\u0631\u0641).");
  const rating = input.rating == null ? null : Math.min(5, Math.max(1, Math.round(input.rating)));
  const novel = await getNovelBySlug(slug);
  if (!novel) throw new Error("\u0627\u0644\u0631\u0648\u0627\u064A\u0629 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F\u0629");
  const db = await getDb();
  if (db) {
    const existing2 = await db.select({ id: reviews.id }).from(reviews).where(and2(eq2(reviews.userId, userId), eq2(reviews.novelId, novel.id))).limit(1);
    let row2;
    if (existing2[0]) {
      [row2] = await db.update(reviews).set({ body, rating, status: "published", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(reviews.id, existing2[0].id)).returning();
    } else {
      [row2] = await db.insert(reviews).values({ userId, novelId: novel.id, body, rating, status: "published" }).returning();
    }
    if (rating != null) {
      await db.insert(ratings).values({ userId, novelId: novel.id, rating }).onConflictDoUpdate({
        target: [ratings.userId, ratings.novelId],
        set: { rating, updatedAt: /* @__PURE__ */ new Date() }
      });
      const aggregate = await db.select({
        average: sql3`COALESCE(AVG(${ratings.rating}), 0)`,
        count: sql3`COUNT(${ratings.id})`
      }).from(ratings).where(eq2(ratings.novelId, novel.id));
      await db.update(novels).set({
        rating: Math.round(Number(aggregate[0]?.average ?? 0) * 100),
        ratingCount: Number(aggregate[0]?.count ?? 0),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq2(novels.id, novel.id));
    }
    return row2;
  }
  const existing = await rest(
    "reviews",
    `select=id&userId=eq.${userId}&novelId=eq.${novel.id}&limit=1`
  );
  const payload = {
    userId,
    novelId: novel.id,
    body,
    rating,
    status: "published",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  let row;
  if (existing[0]) {
    const updated = await rest(`reviews`, `id=eq.${existing[0].id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    row = updated[0];
  } else {
    const created = await rest("reviews", "", {
      method: "POST",
      body: JSON.stringify({ ...payload, createdAt: (/* @__PURE__ */ new Date()).toISOString() })
    });
    row = created[0];
  }
  if (rating != null) {
    try {
      await rest("ratings", "on_conflict=userId,novelId", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({
          userId,
          novelId: novel.id,
          rating,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        })
      });
    } catch {
    }
  }
  return row;
}
async function listPendingReviews(limit = 50) {
  const db = await getDb();
  if (db) {
    return db.select({
      id: reviews.id,
      body: reviews.body,
      rating: reviews.rating,
      status: reviews.status,
      createdAt: reviews.createdAt,
      novelId: reviews.novelId,
      userId: reviews.userId,
      userName: users.name,
      novelTitle: novels.title,
      novelSlug: novels.slug
    }).from(reviews).leftJoin(users, eq2(reviews.userId, users.id)).leftJoin(novels, eq2(reviews.novelId, novels.id)).where(eq2(reviews.status, "pending")).orderBy(desc2(reviews.createdAt)).limit(limit);
  }
  return rest(
    "reviews",
    `select=*&status=eq.pending&order=createdAt.desc&limit=${limit}`
  );
}
async function moderateReview(id, status) {
  const db = await getDb();
  if (db) {
    const [row] = await db.update(reviews).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(reviews.id, id)).returning();
    return row ?? null;
  }
  const rows = await rest(`reviews`, `id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status, updatedAt: (/* @__PURE__ */ new Date()).toISOString() })
  });
  return rows[0] ?? null;
}

// server/routers.ts
var novelSlugInput = z3.object({ slug: z3.string().min(1).max(160) });
var ratingInput = z3.object({ slug: z3.string().min(1).max(160), rating: z3.number().int().min(1).max(5) });
var authorFields = z3.object({ slug: z3.string().min(1).max(160), name: z3.string().min(1).max(255), bio: z3.string().max(5e3).optional(), avatarUrl: z3.string().url().max(500).optional(), bookCount: z3.number().int().min(0).optional() });
var genreFields = z3.object({ slug: z3.string().min(1).max(120), name: z3.string().min(1).max(120), description: z3.string().max(2e3).optional(), icon: z3.string().max(20).optional() });
var novelLinkFields = z3.object({ label: z3.string().min(1).max(80), url: z3.string().url().max(2e3), type: z3.enum(["read", "download"]) });
var novelFields = z3.object({ slug: z3.string().min(1).max(160), title: z3.string().min(1).max(255), authorId: z3.number().int().positive(), coverUrl: z3.string().url().max(500).optional(), description: z3.string().max(1e4).optional(), rightsNote: z3.string().max(2e3).optional(), parts: z3.number().int().min(1).max(100).optional(), status: z3.enum(["standalone", "completed", "ongoing"]).optional(), publicationYear: z3.number().int().min(0).max(3e3).optional(), language: z3.string().max(32).optional(), genreIds: z3.array(z3.number().int().positive()).max(30).optional(), links: z3.array(novelLinkFields).max(20).optional() });
var coverUploadInput = z3.object({ filename: z3.string().min(1).max(160), dataUrl: z3.string().regex(/^data:image\/(png|jpe?g|webp|gif);base64,/i).max(15e6) });
var appRouter = router({
  system: systemRouter,
  commerce: commerceRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    loginEvent: protectedProcedure.mutation(({ ctx }) => audit(ctx.user, "auth.login", "user", ctx.user.openId, void 0, ctx.req).then(() => ({ success: true }))),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  novels: router({
    list: publicProcedure.input(z3.object({ limit: z3.number().int().min(1).max(100).default(50) }).optional()).query(({ input }) => listNovels(input?.limit ?? 50)),
    search: publicProcedure.input(z3.object({
      q: z3.string().max(160).optional(),
      genreSlug: z3.string().max(120).optional(),
      authorSlug: z3.string().max(160).optional(),
      status: z3.enum(["standalone", "completed", "ongoing"]).optional(),
      minRating: z3.number().min(0).max(5).optional(),
      sort: z3.enum(["popular", "rating", "newest", "title"]).default("popular"),
      limit: z3.number().int().min(1).max(100).default(50)
    })).query(({ input }) => searchNovels(input)),
    facets: publicProcedure.query(() => getSearchFacets()),
    bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getNovelBySlug(input.slug))
  }),
  authors: router({ list: publicProcedure.query(() => listAuthors()), bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getAuthorBySlug(input.slug)) }),
  genres: router({ list: publicProcedure.query(() => listGenres()), bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getGenreBySlug(input.slug)) }),
  series: router({ list: publicProcedure.query(() => listSeries()), bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getSeriesBySlug(input.slug)) }),
  readingList: router({
    list: protectedProcedure.query(({ ctx }) => getReadingList(ctx.user.id)),
    add: protectedProcedure.input(novelSlugInput.extend({ status: z3.enum(["want_to_read", "reading", "finished"]).default("want_to_read") })).mutation(async ({ ctx, input }) => {
      const novel = await getNovelBySlug(input.slug);
      if (!novel) throw new Error("Novel not found");
      return addToReadingList(ctx.user.id, novel.id, input.status);
    }),
    remove: protectedProcedure.input(novelSlugInput).mutation(async ({ ctx, input }) => {
      const novel = await getNovelBySlug(input.slug);
      if (!novel) throw new Error("Novel not found");
      return removeFromReadingList(ctx.user.id, novel.id);
    }),
    updateStatus: protectedProcedure.input(novelSlugInput.extend({ status: z3.enum(["want_to_read", "reading", "finished"]) })).mutation(async ({ ctx, input }) => {
      const novel = await getNovelBySlug(input.slug);
      if (!novel) throw new Error("Novel not found");
      return updateReadingStatus(ctx.user.id, novel.id, input.status);
    })
  }),
  ratings: router({
    mine: protectedProcedure.input(novelSlugInput).query(async ({ ctx, input }) => {
      const novel = await getNovelBySlug(input.slug);
      if (!novel) return null;
      return getMyRating(ctx.user.id, novel.id);
    }),
    set: protectedProcedure.input(ratingInput).mutation(async ({ ctx, input }) => {
      const novel = await getNovelBySlug(input.slug);
      if (!novel) throw new Error("Novel not found");
      return setRating(ctx.user.id, novel.id, input.rating);
    })
  }),
  reviews: router({
    list: publicProcedure.input(z3.object({ slug: z3.string().min(1).max(160), limit: z3.number().int().min(1).max(100).default(30).optional() })).query(({ input }) => listNovelReviews(input.slug, input.limit ?? 30)),
    mine: protectedProcedure.input(z3.object({ slug: z3.string().min(1).max(160) })).query(({ ctx, input }) => getMyReview(ctx.user.id, input.slug)),
    upsert: protectedProcedure.input(z3.object({ slug: z3.string().min(1).max(160), body: z3.string().min(20).max(4e3), rating: z3.number().int().min(1).max(5).optional() })).mutation(({ ctx, input }) => upsertReview(ctx.user.id, input.slug, { body: input.body, rating: input.rating })),
    pending: adminProcedure.query(() => listPendingReviews()),
    moderate: adminProcedure.input(z3.object({ id: z3.number().int().positive(), status: z3.enum(["published", "pending", "hidden"]) })).mutation(({ input }) => moderateReview(input.id, input.status))
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => listNotifications(ctx.user.openId, ctx.user.role)),
    markRead: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(({ ctx, input }) => markNotificationRead(input.id, ctx.user.openId))
  }),
  messages: router({
    list: protectedProcedure.query(({ ctx }) => listMessagesForUser(ctx.user.openId, ctx.user.role === "admin"))
  }),
  ads: router({
    active: publicProcedure.input(z3.object({ placement: z3.string().max(80).default("home") })).query(({ input }) => listActiveAds(input.placement)),
    event: publicProcedure.input(z3.object({ id: z3.number().int().positive(), event: z3.enum(["impression", "click"]) })).mutation(({ input }) => recordAdEvent(input.id, input.event))
  }),
  admin: router({
    summary: adminProcedure.query(() => getEnhancedAdminSummary()),
    reports: adminProcedure.query(() => getAdminReports()),
    novels: router({
      list: adminProcedure.query(() => listAdminNovels()),
      create: adminProcedure.input(novelFields).mutation(({ input }) => createNovel(input)),
      update: adminProcedure.input(z3.object({ id: z3.number().int().positive(), data: novelFields.partial() })).mutation(({ input }) => updateNovel(input.id, input.data)),
      delete: adminProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(({ input }) => deleteNovel(input.id)),
      uploadCover: adminProcedure.input(coverUploadInput).mutation(({ input }) => uploadNovelCover(input.dataUrl, input.filename)),
      resolveCover: adminProcedure.input(z3.object({ url: z3.string().url() })).mutation(({ input }) => resolveCoverUrl(input.url))
    }),
    authors: router({
      list: adminProcedure.query(() => listAdminAuthors()),
      create: adminProcedure.input(authorFields).mutation(({ input }) => createAuthor(input)),
      update: adminProcedure.input(z3.object({ id: z3.number().int().positive(), data: authorFields.partial() })).mutation(({ input }) => updateAuthor(input.id, input.data)),
      delete: adminProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(({ input }) => deleteAuthor(input.id))
    }),
    genres: router({
      list: adminProcedure.query(() => listAdminGenres()),
      create: adminProcedure.input(genreFields).mutation(({ input }) => createGenre(input)),
      update: adminProcedure.input(z3.object({ id: z3.number().int().positive(), data: genreFields.partial() })).mutation(({ input }) => updateGenre(input.id, input.data)),
      delete: adminProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(({ input }) => deleteGenre(input.id))
    }),
    users: router({
      list: adminProcedure.query(async () => {
        const [remoteUsers, localUsers] = await Promise.all([listSupabaseUsers(), listUsers()]);
        const roles = new Map(localUsers.map((item) => [item.openId, item.role]));
        return remoteUsers.map((user) => toManagedUser(user, roles.get(`supabase:${user.id}`)));
      }),
      updateRole: adminProcedure.input(z3.object({ id: z3.string().uuid(), role: z3.enum(["user", "admin"]) })).mutation(async ({ ctx, input }) => {
        if (ctx.user.openId === `supabase:${input.id}` && input.role !== "admin") throw new Error("\u0644\u0627 \u064A\u0645\u0643\u0646\u0643 \u0625\u0644\u063A\u0627\u0621 \u0635\u0644\u0627\u062D\u064A\u0629 \u062D\u0633\u0627\u0628\u0643 \u0627\u0644\u062D\u0627\u0644\u064A.");
        const remote = await updateSupabaseUserRole(input.id, input.role);
        await updateUserRole(`supabase:${input.id}`, input.role);
        await audit(ctx.user, "user.role.update", "user", input.id, { role: input.role }, ctx.req);
        return toManagedUser(remote, input.role);
      }),
      confirmEmail: adminProcedure.input(z3.object({ id: z3.string().uuid() })).mutation(async ({ input }) => {
        const remote = await confirmSupabaseUserEmail(input.id);
        return toManagedUser(remote);
      })
    }),
    audit: router({
      list: adminProcedure.query(() => listAuditLogs())
    }),
    trash: router({
      list: adminProcedure.query(() => listTrash()),
      restore: adminProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(({ ctx, input }) => restoreTrash(input.id, ctx.user)),
      purge: adminProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(({ ctx, input }) => purgeTrash(input.id, ctx.user))
    }),
    notifications: router({
      send: adminProcedure.input(z3.object({ recipientType: z3.enum(["user", "role", "all"]), recipientOpenId: z3.string().optional(), recipientRole: z3.string().optional(), title: z3.string().min(1).max(255), body: z3.string().min(1).max(5e3), linkUrl: z3.string().url().optional(), category: z3.enum(["new_novel", "update", "offer", "general"]).default("general"), color: z3.string().regex(/^#[0-9a-f]{6}$/i).default("#675de8"), priority: z3.enum(["low", "normal", "high", "urgent"]).default("normal"), scheduledAt: z3.string().datetime().optional() })).mutation(({ ctx, input }) => createNotification(input, ctx.user))
    }),
    messages: router({
      send: adminProcedure.input(z3.object({ recipientType: z3.enum(["users", "employees", "user"]), recipientOpenId: z3.string().optional(), subject: z3.string().min(1).max(255), body: z3.string().min(1).max(1e4) })).mutation(({ ctx, input }) => sendAdminMessage(input, ctx.user))
    }),
    ads: router({
      list: adminProcedure.query(() => listAds()),
      create: adminProcedure.input(z3.object({ title: z3.string().min(1).max(255), body: z3.string().max(5e3).optional(), imageUrl: z3.string().url().optional(), linkUrl: z3.string().url().optional(), placement: z3.string().min(1).max(80), status: z3.enum(["draft", "published", "paused"]), startAt: z3.string().optional(), endAt: z3.string().optional() })).mutation(({ ctx, input }) => createAd(input, ctx.user)),
      update: adminProcedure.input(z3.object({ id: z3.number().int().positive(), data: z3.object({ title: z3.string().min(1).max(255).optional(), body: z3.string().max(5e3).optional(), imageUrl: z3.string().url().optional(), linkUrl: z3.string().url().optional(), placement: z3.string().max(80).optional(), status: z3.enum(["draft", "published", "paused"]).optional(), startAt: z3.string().optional(), endAt: z3.string().optional() }) })).mutation(({ ctx, input }) => updateAd(input.id, input.data, ctx.user)),
      delete: adminProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(({ ctx, input }) => deleteAd(input.id, ctx.user))
    })
  }),
  quotes: router({
    list: publicProcedure.input(z3.object({ limit: z3.number().int().min(1).max(500).default(10), offset: z3.number().int().min(0).default(0) }).optional()).query(({ input }) => listQuotes(true, input?.limit ?? 10, input?.offset ?? 0)),
    byId: publicProcedure.input(z3.object({ id: z3.number().int().positive() })).query(({ input }) => getQuote(input.id)),
    neighbors: publicProcedure.input(z3.object({ id: z3.number().int().positive() })).query(({ input }) => getQuoteNeighbors(input.id)),
    byAuthor: publicProcedure.input(z3.object({ slug: z3.string().min(1).max(160) })).query(({ input }) => listQuotesByAuthor(input.slug)),
    byBook: publicProcedure.input(z3.object({ slug: z3.string().min(1).max(160) })).query(({ input }) => listQuotesByBook(input.slug)),
    byCategory: publicProcedure.input(z3.object({ category: z3.string().min(1).max(80) })).query(({ input }) => listQuotesByCategory(input.category)),
    categories: publicProcedure.query(() => listQuoteCategories())
  }),
  adminQuotes: router({
    list: adminProcedure.query(() => listQuotes(false)),
    create: adminProcedure.input(z3.object({ quote_text: z3.string().min(3).max(2e3), speaker: z3.string().max(255).nullable().optional(), book_title: z3.string().max(255).nullable().optional(), novel_id: z3.number().int().positive().nullable().optional(), category: z3.string().max(80).nullable().optional() })).mutation(({ input }) => createQuote({ ...input, speaker: input.speaker ?? null, book_title: input.book_title ?? null, novel_id: input.novel_id ?? null, category: input.category ?? null, status: "published" })),
    update: adminProcedure.input(z3.object({ id: z3.number().int().positive(), data: z3.object({ quote_text: z3.string().min(3).max(2e3).optional(), speaker: z3.string().max(255).nullable().optional(), book_title: z3.string().max(255).nullable().optional(), novel_id: z3.number().int().positive().nullable().optional(), category: z3.string().max(80).nullable().optional() }) })).mutation(({ input }) => updateQuote(input.id, { ...input.data, status: "published" })),
    delete: adminProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(({ input }) => deleteQuote(input.id)),
    improve: adminProcedure.input(z3.object({ quote: z3.string().min(3).max(2e3), speaker: z3.string().max(255).optional(), book: z3.string().max(255).optional() })).mutation(({ input }) => improveQuote(input)),
    scanTelegram: adminProcedure.input(z3.object({ url: z3.string().url().max(2e3), maxPages: z3.number().int().min(1).max(10).default(1) })).mutation(({ input }) => scanTelegramChannel(input)),
    duplicatePreview: adminProcedure.input(z3.object({ threshold: z3.number().min(0.9).max(1).default(0.95) })).query(({ input }) => findDuplicateQuotes(input.threshold)),
    deleteDuplicates: adminProcedure.input(z3.object({ ids: z3.array(z3.number().int().positive()).min(1).max(500) })).mutation(({ input }) => deleteDuplicateQuotes(input.ids)),
    previewImport: adminProcedure.input(z3.object({ url: z3.string().url().max(2e3), author: z3.string().max(255).optional(), book: z3.string().max(255).optional(), instructions: z3.string().max(2e3).optional(), useAi: z3.boolean().default(true), language: z3.enum(["ar", "en", "both"]).default("both") })).mutation(async ({ input }) => {
      const [result, authors2, books] = await Promise.all([previewQuotesFromUrl(input), listQuoteAuthors(), listQuoteBooks()]);
      const authorMatch = matchEntity(result.author, authors2);
      const bookMatch = matchEntity(result.book, books);
      return { ...result, authorMatch: authorMatch ? { name: authorMatch.name, slug: authorMatch.slug } : null, bookMatch: bookMatch ? { title: bookMatch.title, slug: bookMatch.slug } : null };
    }),
    imports: adminProcedure.query(() => listQuoteImports()),
    bulkCreate: adminProcedure.input(z3.object({ sourceUrl: z3.string().url().max(2e3), author: z3.string().max(255).optional(), book: z3.string().max(255).optional(), instructions: z3.string().max(2e3).optional(), quotes: z3.array(z3.object({ quote_text: z3.string().min(3).max(2e3), speaker: z3.string().max(255).nullable().optional(), book_title: z3.string().max(255).nullable().optional(), category: z3.string().max(80).nullable().optional(), source_url: z3.string().url().max(2e3).optional() })).min(1).max(500) })).mutation(async ({ input }) => {
      const [authors2, books] = await Promise.all([listQuoteAuthors(), listQuoteBooks()]);
      const filtered = await removeExistingSimilarQuotes(input.quotes);
      const fresh = filtered.quotes;
      const matchedAuthor = matchEntity(input.author, authors2);
      const matchedBook = matchEntity(input.book, books);
      const importRow = await createQuoteImport({ source_url: input.sourceUrl, author: input.author, book: input.book, instructions: input.instructions, quote_count: fresh.length });
      for (let index = 0; index < fresh.length; index += 1) {
        const quote = fresh[index];
        const author = matchEntity(quote.speaker || input.author, authors2) ?? matchedAuthor;
        const book = matchEntity(quote.book_title || input.book, books) ?? matchedBook;
        await createQuote({ ...quote, speaker: quote.speaker ?? null, book_title: quote.book_title ?? null, author_id: author?.id ?? null, novel_id: book?.id ?? null, category: quote.category ?? null, status: "published", source_url: quote.source_url ?? input.sourceUrl, import_id: importRow.id, position: index + 1 });
      }
      return { count: fresh.length, skippedDuplicates: input.quotes.length - fresh.length + filtered.duplicateCount, importId: importRow.id, authorMatched: Boolean(matchedAuthor), bookMatched: Boolean(matchedBook), authorSlug: matchedAuthor?.slug ?? null, bookSlug: matchedBook?.slug ?? null };
    })
  })
});

// server/_core/supabaseAuth.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
async function authenticateSupabaseToken(token) {
  if (!ENV.supabaseUrl || !ENV.supabasePublishableKey) return null;
  const client = createClient2(ENV.supabaseUrl, ENV.supabasePublishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  const authUser = data.user;
  const openId = `supabase:${authUser.id}`;
  const email = authUser.email ?? null;
  const adminEmails = new Set((ENV.supabaseAdminEmails ?? "").split(/[\s,;]+/).map((value) => value.trim().toLowerCase()).filter(Boolean));
  const role = email && (adminEmails.has(email.toLowerCase()) || authUser.app_metadata?.role === "admin") ? "admin" : void 0;
  try {
    await upsertUser({ openId, name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? email?.split("@")[0] ?? null, email, loginMethod: "supabase", role, lastSignedIn: /* @__PURE__ */ new Date() });
  } catch (dbError) {
    console.warn("[Auth] Local user sync skipped:", dbError instanceof Error ? dbError.message : dbError);
  }
  let localUser = null;
  try {
    localUser = await getUserByOpenId(openId) ?? null;
  } catch (dbError) {
    console.warn("[Auth] Local user lookup skipped:", dbError instanceof Error ? dbError.message : dbError);
  }
  if (localUser) return role === "admin" && localUser.role !== "admin" ? { ...localUser, role: "admin" } : localUser;
  return {
    id: 0,
    openId,
    name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? email?.split("@")[0] ?? null,
    email,
    loginMethod: "supabase",
    role: role ?? "user",
    createdAt: new Date(authUser.created_at ?? Date.now()),
    updatedAt: /* @__PURE__ */ new Date(),
    lastSignedIn: /* @__PURE__ */ new Date()
  };
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    const authorization = opts.req.headers.authorization;
    const hasBearerToken = typeof authorization === "string" && authorization.startsWith("Bearer ");
    if (hasBearerToken) {
      user = await authenticateSupabaseToken(authorization.slice(7));
    }
    if (!user && !hasBearerToken) user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "vite-plugin-manus-debug-collector",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== "/__manus__/logs" || req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          try {
            const body2 = payload;
            if (body2.source && Array.isArray(body2.entries)) {
              writeToLogFile(body2.source, body2.entries);
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [
  react(),
  tailwindcss(),
  ...process.env.NODE_ENV === "production" ? [] : [jsxLocPlugin()],
  vitePluginManusRuntime(),
  vitePluginManusDebugCollector()
];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ""),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? "")
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/performance.ts
var samplesByRoute = /* @__PURE__ */ new Map();
var MAX_SAMPLES_PER_ROUTE = 200;
function recordRequest(route, durationMs) {
  const samples = samplesByRoute.get(route) ?? [];
  samples.push({ durationMs, recordedAt: Date.now() });
  if (samples.length > MAX_SAMPLES_PER_ROUTE) samples.splice(0, samples.length - MAX_SAMPLES_PER_ROUTE);
  samplesByRoute.set(route, samples);
  if (samples.length % 20 === 0) {
    console.info("[Performance]", JSON.stringify({ route, count: samples.length, p50Ms: percentile(samples, 0.5), p95Ms: percentile(samples, 0.95), lastMs: Math.round(durationMs * 100) / 100 }));
  }
}
function percentile(samples, percentileValue) {
  if (!samples.length) return 0;
  const sorted = samples.map((sample) => sample.durationMs).sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil(percentileValue * sorted.length) - 1);
  return Math.round(sorted[index] * 100) / 100;
}
function getPerformanceSnapshot() {
  return Object.fromEntries(Array.from(samplesByRoute.entries()).map(([route, samples]) => [route, {
    count: samples.length,
    p50Ms: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
    lastMs: samples.at(-1)?.durationMs ?? 0
  }]));
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
function createApp() {
  const app = express2();
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.once("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const route = `${req.method} ${req.path}`;
      recordRequest(route, durationMs);
      const samples = getPerformanceSnapshot();
      const routeSnapshot = samples[route];
      if (routeSnapshot && routeSnapshot.count % 20 === 0) {
        console.info("[Performance]", JSON.stringify({ route, ...routeSnapshot, lastMs: Math.round(durationMs * 100) / 100 }));
      }
    });
    next();
  });
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.get("/api/performance", (_req, res) => res.json({ generatedAt: (/* @__PURE__ */ new Date()).toISOString(), routes: getPerformanceSnapshot() }));
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app;
}
async function startServer() {
  const app = createApp();
  const server = createServer(app);
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
if (!process.env.VERCEL) {
  startServer().catch(console.error);
}
export {
  createApp
};
