-- Topic cluster columns (also applied via Supabase migration article_cluster_columns)
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS "novelId" integer REFERENCES public.novels(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "clusterType" varchar(40);

CREATE INDEX IF NOT EXISTS articles_novel_id_idx ON public.articles ("novelId");
CREATE INDEX IF NOT EXISTS articles_cluster_type_idx ON public.articles ("clusterType");

CREATE UNIQUE INDEX IF NOT EXISTS articles_novel_cluster_unique
  ON public.articles ("novelId", "clusterType")
  WHERE "novelId" IS NOT NULL AND "clusterType" IS NOT NULL;
