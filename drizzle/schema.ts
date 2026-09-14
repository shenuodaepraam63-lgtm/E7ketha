import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);
export const seriesStatusEnum = pgEnum('series_status', ['completed', 'ongoing']);
export const novelStatusEnum = pgEnum('novel_status', ['standalone', 'completed', 'ongoing']);
export const readingStatusEnum = pgEnum('reading_status', ['want_to_read', 'reading', 'finished']);
export const reviewStatusEnum = pgEnum('review_status', ['published', 'pending', 'hidden']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  openId: varchar('openId', { length: 64 }).notNull().unique(),
  name: text('name'),
  email: varchar('email', { length: 320 }),
  loginMethod: varchar('loginMethod', { length: 64 }),
  role: userRoleEnum('role').default('user').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp('lastSignedIn', { withTimezone: true }).defaultNow().notNull(),
});

export const authors = pgTable('authors', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  bio: text('bio'),
  avatarUrl: varchar('avatarUrl', { length: 500 }),
  bookCount: integer('bookCount').default(0).notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const genres = pgTable('genres', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 120 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  description: text('description'),
  icon: varchar('icon', { length: 20 }),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
});

export const series = pgTable('series', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: seriesStatusEnum('status').default('completed').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
});

export const novels = pgTable('novels', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 160 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  authorId: integer('authorId').notNull(),
  seriesId: integer('seriesId'),
  coverUrl: varchar('coverUrl', { length: 500 }),
  description: text('description'),
  rightsNote: text('rightsNote'),
  rating: integer('rating').default(0).notNull(),
  ratingCount: integer('ratingCount').default(0).notNull(),
  parts: integer('parts').default(1).notNull(),
  status: novelStatusEnum('status').default('standalone').notNull(),
  publicationYear: integer('publicationYear'),
  language: varchar('language', { length: 32 }).default('ar').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export const novelGenres = pgTable(
  'novelGenres',
  {
    novelId: integer('novelId').notNull(),
    genreId: integer('genreId').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.novelId, table.genreId] }),
  }),
);

export const seriesBooks = pgTable(
  'seriesBooks',
  {
    seriesId: integer('seriesId').notNull(),
    novelId: integer('novelId').notNull(),
    order: integer('order').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.seriesId, table.novelId] }),
  }),
);

export const readingListItems = pgTable(
  'readingListItems',
  {
    id: serial('id').primaryKey(),
    userId: integer('userId').notNull(),
    novelId: integer('novelId').notNull(),
    status: readingStatusEnum('status').default('want_to_read').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userNovelUnique: uniqueIndex('readingListUserNovelUnique').on(table.userId, table.novelId),
  }),
);

export const ratings = pgTable(
  'ratings',
  {
    id: serial('id').primaryKey(),
    userId: integer('userId').notNull(),
    novelId: integer('novelId').notNull(),
    rating: integer('rating').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userNovelUnique: uniqueIndex('ratingsUserNovelUnique').on(table.userId, table.novelId),
  }),
);

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  userId: integer('userId').notNull(),
  novelId: integer('novelId').notNull(),
  rating: integer('rating'),
  body: text('body').notNull(),
  status: reviewStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Novel = typeof novels.$inferSelect;
export type Author = typeof authors.$inferSelect;
export type Genre = typeof genres.$inferSelect;
export type ReadingListItem = typeof readingListItems.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type Review = typeof reviews.$inferSelect;
