-- Ratings & Reviews tables (idempotent) — run in Supabase SQL Editor if missing
DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('published', 'pending', 'hidden');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.ratings (
  id serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "novelId" integer NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "ratingsUserNovelUnique" ON public.ratings ("userId", "novelId");

CREATE TABLE IF NOT EXISTS public.reviews (
  id serial PRIMARY KEY,
  "userId" integer NOT NULL,
  "novelId" integer NOT NULL,
  rating integer,
  body text NOT NULL,
  status review_status NOT NULL DEFAULT 'pending',
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_novel_status_idx ON public.reviews ("novelId", status);
CREATE INDEX IF NOT EXISTS reviews_user_novel_idx ON public.reviews ("userId", "novelId");
