-- E7ketha first-party analytics (run once in Supabase SQL Editor)
CREATE TABLE IF NOT EXISTS public.page_views (
  id bigserial PRIMARY KEY,
  visitor_id text NOT NULL,
  user_id integer NULL,
  page_type text NOT NULL,
  page_path text NOT NULL,
  entity_slug text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS page_views_path_idx ON public.page_views (page_path);
CREATE INDEX IF NOT EXISTS page_views_visitor_idx ON public.page_views (visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS page_views_type_idx ON public.page_views (page_type);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Service role (API) inserts via secret key. No public anon policies = clients cannot read/write directly.
