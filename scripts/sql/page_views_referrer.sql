-- Optional: already applied via migration on production project
ALTER TABLE public.page_views ADD COLUMN IF NOT EXISTS referrer_source text;
CREATE INDEX IF NOT EXISTS page_views_referrer_idx ON public.page_views (referrer_source);
