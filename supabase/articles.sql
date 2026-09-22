-- Articles table for E7ketha CMS
-- Run in Supabase SQL editor

DO $$ BEGIN
  CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS articles (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(300) NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  "coverUrl" VARCHAR(800),
  status article_status NOT NULL DEFAULT 'draft',
  "authorName" VARCHAR(160),
  "authorUserId" INTEGER,
  "seoTitle" VARCHAR(300),
  "seoDescription" TEXT,
  tags TEXT,
  "publishedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS articles_status_published_idx ON articles (status, "publishedAt" DESC);
CREATE INDEX IF NOT EXISTS articles_slug_idx ON articles (slug);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read published articles" ON articles;
CREATE POLICY "Public read published articles" ON articles
  FOR SELECT USING (status = 'published');
