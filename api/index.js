// server/app.ts
import express from "express";
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
  databaseUrl: process.env.SUPABASE_DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? "",
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
        max: 10
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
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${table}?${params}`, { headers: { apikey: ENV.supabaseSecretKey || ENV.supabasePublishableKey, Authorization: `Bearer ${ENV.supabaseSecretKey || ENV.supabasePublishableKey}` } });
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
  const candidates = Array.from(/* @__PURE__ */ new Set([slug, decoded, normalizeNovelSlug(decoded)])).filter(Boolean);
  const rows = await supabaseRest("novels", `select=*&or=(${candidates.map((value) => `slug.eq.${encodeURIComponent(value)}`).join(",")})&limit=1`);
  const row = rows[0] ?? (await supabaseRest("novels", "select=*&limit=1000")).find((item) => normalizeNovelSlug(item.slug, item.title) === normalizeNovelSlug(decoded));
  if (!row) return null;
  const authorsRows = await supabaseRest("authors", `select=name,slug&id=eq.${row.authorId}&limit=1`);
  const author = authorsRows[0];
  return { id: row.id, slug: normalizeNovelSlug(row.slug, row.title), title: row.title, coverUrl: row.coverUrl, description: row.description, rating: row.rating, ratingCount: row.ratingCount, parts: row.parts, status: row.status, publicationYear: row.publicationYear, language: row.language, author: author?.name ?? "\u0645\u0624\u0644\u0641 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641", authorSlug: author?.slug ?? "", authorId: row.authorId };
}
async function listNovelsFromRest(limit = 50) {
  const rows = await supabaseRest("novels", `select=*&order=createdAt.desc&limit=${Math.min(Math.max(limit, 1), 100)}`);
  const authorIds = Array.from(new Set(rows.map((row) => row.authorId).filter(Boolean)));
  const authorsRows = authorIds.length ? await supabaseRest("authors", `select=id,name,slug&id=in.(${authorIds.join(",")})`) : [];
  const authorsMap = new Map(authorsRows.map((author) => [String(author.id), author]));
  return rows.map((row) => ({ id: row.id, slug: normalizeNovelSlug(row.slug, row.title), title: row.title, coverUrl: row.coverUrl, description: row.description, rating: row.rating, ratingCount: row.ratingCount, parts: row.parts, status: row.status, publicationYear: row.publicationYear, author: authorsMap.get(String(row.authorId))?.name ?? "\u0645\u0624\u0644\u0641 \u063A\u064A\u0631 \u0645\u0639\u0631\u0648\u0641", authorSlug: authorsMap.get(String(row.authorId))?.slug ?? "" }));
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
  const db = await requireDb();
  const result = await db.select().from(authors).where(eq(authors.slug, slug)).limit(1);
  return result[0] ?? null;
}
async function listGenres() {
  const db = await getDb();
  if (!db) return supabaseRest("genres", "select=*&order=name.asc&limit=1000");
  return db.select({ id: genres.id, slug: genres.slug, name: genres.name, description: genres.description, icon: genres.icon, novelCount: sql`COUNT(DISTINCT ${novelGenres.novelId})` }).from(genres).leftJoin(novelGenres, eq(novelGenres.genreId, genres.id)).groupBy(genres.id).orderBy(asc(genres.name));
}
async function getGenreBySlug(slug) {
  const db = await requireDb();
  const result = await db.select({ id: genres.id, slug: genres.slug, name: genres.name, description: genres.description, icon: genres.icon, novelCount: sql`COUNT(DISTINCT ${novelGenres.novelId})` }).from(genres).leftJoin(novelGenres, eq(novelGenres.genreId, genres.id)).where(eq(genres.slug, slug)).groupBy(genres.id).limit(1);
  return result[0] ?? null;
}
async function listSeries() {
  const db = await getDb();
  if (!db) return supabaseRest("series", "select=*&order=title.asc&limit=1000");
  return db.select({ id: series.id, slug: series.slug, title: series.title, description: series.description, status: series.status, parts: sql`COUNT(DISTINCT ${seriesBooks.novelId})`, coverUrl: sql`MIN(${novels.coverUrl})` }).from(series).leftJoin(seriesBooks, eq(seriesBooks.seriesId, series.id)).leftJoin(novels, eq(seriesBooks.novelId, novels.id)).groupBy(series.id).orderBy(asc(series.title));
}
async function getSeriesBySlug(slug) {
  const db = await requireDb();
  const rows = await db.select({ id: series.id, slug: series.slug, title: series.title, description: series.description, status: series.status, order: seriesBooks.order, bookTitle: novels.title, bookSlug: novels.slug, coverUrl: novels.coverUrl, author: authors.name }).from(series).leftJoin(seriesBooks, eq(seriesBooks.seriesId, series.id)).leftJoin(novels, eq(seriesBooks.novelId, novels.id)).leftJoin(authors, eq(novels.authorId, authors.id)).where(eq(series.slug, slug)).orderBy(asc(seriesBooks.order));
  if (!rows.length) return null;
  const first = rows[0];
  return { ...first, books: rows.filter((row) => row.bookSlug).map((row) => ({ title: row.bookTitle, slug: row.bookSlug, coverUrl: row.coverUrl, author: row.author })) };
}
async function getNovelBySlug(slug) {
  const db = await requireDb();
  const decodedSlug = decodeURIComponent(slug).trim();
  const normalizedSlug = normalizeNovelSlug(decodedSlug);
  try {
    const result = await db.select({
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
      language: novels.language,
      author: authors.name,
      authorSlug: authors.slug,
      authorId: authors.id
    }).from(novels).innerJoin(authors, eq(novels.authorId, authors.id)).where(or(eq(novels.slug, slug), eq(novels.slug, decodedSlug), eq(novels.slug, normalizedSlug))).limit(1);
    if (result[0]) return { ...result[0], slug: normalizeNovelSlug(result[0].slug, result[0].title) };
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
    const rows = await supabaseRest("novels", "select=*&order=updatedAt.desc&limit=1000");
    return rows;
  }
  return db.select({ id: novels.id, slug: novels.slug, title: novels.title, authorId: authors.id, author: authors.name, coverUrl: novels.coverUrl, description: novels.description, rating: novels.rating, ratingCount: novels.ratingCount, parts: novels.parts, status: novels.status, publicationYear: novels.publicationYear, language: novels.language, updatedAt: novels.updatedAt }).from(novels).innerJoin(authors, eq(novels.authorId, authors.id)).orderBy(desc(novels.updatedAt));
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
async function createNovel(input) {
  const db = await getDb();
  const { genreIds = [], ...novelInput } = input;
  if (!db) {
    const rows = await supabaseWrite("novels", "POST", { ...novelInput, slug: normalizeNovelSlug(input.slug || input.title), coverUrl: input.coverUrl || null, description: input.description || null });
    const row2 = rows[0];
    if (genreIds.length) await supabaseWrite("novelGenres", "POST", genreIds.map((genreId) => ({ novelId: row2.id, genreId })));
    return row2;
  }
  const [row] = await db.insert(novels).values({ ...novelInput, slug: normalizeNovelSlug(input.slug || input.title), coverUrl: input.coverUrl || null, description: input.description || null }).returning();
  if (genreIds.length) await db.insert(novelGenres).values(genreIds.map((genreId) => ({ novelId: row.id, genreId }))).onConflictDoNothing();
  return row;
}
async function updateNovel(id, input) {
  const db = await getDb();
  const { genreIds, ...novelInput } = input;
  if (!db) {
    const normalizedInput2 = novelInput.slug ? { ...novelInput, slug: normalizeNovelSlug(novelInput.slug) } : novelInput;
    const rows = await supabaseWrite("novels", "PATCH", { ...normalizedInput2, updatedAt: (/* @__PURE__ */ new Date()).toISOString() }, `id=eq.${id}`);
    if (genreIds) {
      await supabaseWrite("novelGenres", "DELETE", void 0, `novelId=eq.${id}`);
      if (genreIds.length) await supabaseWrite("novelGenres", "POST", genreIds.map((genreId) => ({ novelId: id, genreId })));
    }
    return rows[0] ?? null;
  }
  const normalizedInput = novelInput.slug ? { ...novelInput, slug: normalizeNovelSlug(novelInput.slug) } : novelInput;
  const [row] = await db.update(novels).set({ ...normalizedInput, updatedAt: /* @__PURE__ */ new Date() }).where(eq(novels.id, id)).returning();
  if (!row) return null;
  if (genreIds) {
    await db.delete(novelGenres).where(eq(novelGenres.novelId, id));
    if (genreIds.length) await db.insert(novelGenres).values(genreIds.map((genreId) => ({ novelId: id, genreId }))).onConflictDoNothing();
  }
  return row;
}
async function deleteNovel(id) {
  const db = await getDb();
  if (!db) {
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
function registerOAuthRoutes(app2) {
  app2.get("/api/oauth/callback", async (req, res) => {
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
function registerStorageProxy(app2) {
  app2.get("/manus-storage/*", async (req, res) => {
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
async function request(path, init = {}) {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) throw new Error("Supabase admin REST is not configured");
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${path}`, { ...init, headers: { apikey: ENV.supabaseSecretKey, Authorization: `Bearer ${ENV.supabaseSecretKey}`, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers ?? {} } });
  if (!response.ok) throw new Error(`Quotes API ${response.status}: ${await response.text()}`);
  const text2 = await response.text();
  return text2 ? JSON.parse(text2) : [];
}
async function listQuotes(publicOnly = false) {
  return request(`quotes?select=*&${publicOnly ? "status=eq.published&" : ""}order=created_at.desc&limit=200`);
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
async function improveQuote(input) {
  const prompt = `\u062D\u0633\u0651\u0646 \u0647\u0630\u0627 \u0627\u0644\u0627\u0642\u062A\u0628\u0627\u0633 \u062F\u0648\u0646 \u062A\u063A\u064A\u064A\u0631 \u0645\u0639\u0646\u0627\u0647\u060C \u0648\u0627\u0642\u062A\u0631\u062D \u062A\u0635\u0646\u064A\u0641\u064B\u0627 \u0645\u0646\u0627\u0633\u0628\u064B\u0627. \u0644\u0627 \u062A\u062E\u062A\u0631\u0639 \u0627\u0644\u0642\u0627\u0626\u0644 \u0623\u0648 \u0627\u0644\u0643\u062A\u0627\u0628 \u0625\u0630\u0627 \u0644\u0645 \u064A\u0630\u0643\u0631\u0647\u0645\u0627 \u0627\u0644\u0645\u0633\u062A\u062E\u062F\u0645. \u0623\u062E\u0631\u062C JSON \u0641\u0642\u0637 \u0628\u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D quote, speaker, book, category, note.
\u0627\u0644\u0646\u0635: ${input.quote}
\u0627\u0644\u0642\u0627\u0626\u0644 \u0625\u0646 \u0648\u062C\u062F: ${input.speaker ?? ""}
\u0627\u0644\u0643\u062A\u0627\u0628 \u0625\u0646 \u0648\u062C\u062F: ${input.book ?? ""}`;
  if (ENV.geminiApiKey) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(ENV.geminiApiKey)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: "\u0623\u0646\u062A \u0645\u062D\u0631\u0631 \u0645\u062D\u062A\u0648\u0649 \u0639\u0631\u0628\u064A \u062F\u0642\u064A\u0642 \u0644\u0645\u0646\u0635\u0629 \u0631\u0648\u0627\u064A\u0627\u062A. \u0644\u0627 \u062A\u0646\u0633\u0628 \u0642\u0648\u0644\u064B\u0627 \u062F\u0648\u0646 \u0645\u0635\u062F\u0631." }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }) });
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

// server/routers.ts
var novelSlugInput = z3.object({ slug: z3.string().min(1).max(160) });
var ratingInput = z3.object({ slug: z3.string().min(1).max(160), rating: z3.number().int().min(1).max(5) });
var authorFields = z3.object({ slug: z3.string().min(1).max(160), name: z3.string().min(1).max(255), bio: z3.string().max(5e3).optional(), avatarUrl: z3.string().url().max(500).optional(), bookCount: z3.number().int().min(0).optional() });
var genreFields = z3.object({ slug: z3.string().min(1).max(120), name: z3.string().min(1).max(120), description: z3.string().max(2e3).optional(), icon: z3.string().max(20).optional() });
var novelFields = z3.object({ slug: z3.string().min(1).max(160), title: z3.string().min(1).max(255), authorId: z3.number().int().positive(), coverUrl: z3.string().url().max(500).optional(), description: z3.string().max(1e4).optional(), parts: z3.number().int().min(1).max(100).optional(), status: z3.enum(["standalone", "completed", "ongoing"]).optional(), publicationYear: z3.number().int().min(0).max(3e3).optional(), language: z3.string().max(32).optional(), genreIds: z3.array(z3.number().int().positive()).max(30).optional() });
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
    summary: adminProcedure.query(() => getAdminSummary()),
    reports: adminProcedure.query(() => getAdminReports()),
    novels: router({
      list: adminProcedure.query(() => listAdminNovels()),
      create: adminProcedure.input(novelFields).mutation(({ input }) => createNovel(input)),
      update: adminProcedure.input(z3.object({ id: z3.number().int().positive(), data: novelFields.partial() })).mutation(({ input }) => updateNovel(input.id, input.data)),
      delete: adminProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(({ input }) => deleteNovel(input.id)),
      uploadCover: adminProcedure.input(coverUploadInput).mutation(({ input }) => uploadNovelCover(input.dataUrl, input.filename))
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
    list: publicProcedure.query(() => listQuotes(true))
  }),
  adminQuotes: router({
    list: adminProcedure.query(() => listQuotes(false)),
    create: adminProcedure.input(z3.object({ quote_text: z3.string().min(3).max(2e3), speaker: z3.string().max(255).nullable().optional(), book_title: z3.string().max(255).nullable().optional(), novel_id: z3.number().int().positive().nullable().optional(), category: z3.string().max(80).nullable().optional(), status: z3.enum(["draft", "published"]) })).mutation(({ input }) => createQuote({ ...input, speaker: input.speaker ?? null, book_title: input.book_title ?? null, novel_id: input.novel_id ?? null, category: input.category ?? null })),
    update: adminProcedure.input(z3.object({ id: z3.number().int().positive(), data: z3.object({ quote_text: z3.string().min(3).max(2e3).optional(), speaker: z3.string().max(255).nullable().optional(), book_title: z3.string().max(255).nullable().optional(), novel_id: z3.number().int().positive().nullable().optional(), category: z3.string().max(80).nullable().optional(), status: z3.enum(["draft", "published"]).optional() }) })).mutation(({ input }) => updateQuote(input.id, input.data)),
    delete: adminProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(({ input }) => deleteQuote(input.id)),
    improve: adminProcedure.input(z3.object({ quote: z3.string().min(3).max(2e3), speaker: z3.string().max(255).optional(), book: z3.string().max(255).optional() })).mutation(({ input }) => improveQuote(input))
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

// server/app.ts
function createApp() {
  const app2 = express();
  app2.use(express.json({ limit: "50mb" }));
  app2.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app2);
  registerOAuthRoutes(app2);
  app2.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app2;
}

// scripts/vercel-api-entry.ts
var app = createApp();
function handler(req, res) {
  try {
    return app(req, res);
  } catch (error) {
    console.error("[Vercel API] handler failed", error);
    if (!res.headersSent) res.status(500).json({ error: "API handler failed" });
  }
}
export {
  handler as default
};
