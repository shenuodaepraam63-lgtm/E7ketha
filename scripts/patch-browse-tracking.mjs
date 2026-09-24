import fs from "node:fs";

function ensureImport(src, line) {
  if (src.includes(line)) return src;
  return line + "\n" + src;
}

// NovelPage
{
  const f = "client/src/pages/NovelPage.tsx";
  if (fs.existsSync(f)) {
    let s = fs.readFileSync(f, "utf8");
    if (!s.includes("trackNovelView")) {
      s = ensureImport(s, "import { trackNovelView } from '@/lib/browseRecs';");
      if (!s.includes("useEffect") || !/from ['\"]react['\"]/.test(s)) {
        s = ensureImport(s, "import { useEffect } from 'react';");
      }
      const old = "const query = trpc.novels.bySlug.useQuery({ slug }, { enabled: Boolean(slug) });";
      if (s.includes(old) && !s.includes("trackNovelView(query.data")) {
        s = s.replace(
          old,
          old +
            "\n  useEffect(() => {\n    if (query.data?.slug) trackNovelView(query.data.slug, query.data.title);\n  }, [query.data?.slug, query.data?.title]);",
        );
      }
      fs.writeFileSync(f, s);
      console.log("[patch-browse-tracking] NovelPage");
    } else console.log("[patch-browse-tracking] NovelPage skip");
  }
}

// ExplorePages SearchPage
{
  const f = "client/src/pages/ExplorePages.tsx";
  if (fs.existsSync(f)) {
    let s = fs.readFileSync(f, "utf8");
    if (!s.includes("trackSearch")) {
      s = ensureImport(s, "import { trackSearch, trackGenreView } from '@/lib/browseRecs';");
      if (!s.includes("useEffect")) {
        s = s.replace("import { useMemo, useState }", "import { useEffect, useMemo, useState }");
      }
      const old = "  const query = params.get('q') ?? '';\n  const [activeTab, setActiveTab]";
      if (s.includes(old)) {
        s = s.replace(
          old,
          "  const query = params.get('q') ?? '';\n  useEffect(() => { if (query.trim().length >= 2) trackSearch(query); }, [query]);\n  const [activeTab, setActiveTab]",
        );
      }
      if (s.includes("const [genreFilter, setGenreFilter] = useState('all');") && !s.includes("trackGenreView(genreFilter)")) {
        s = s.replace(
          "const [genreFilter, setGenreFilter] = useState('all');",
          "const [genreFilter, setGenreFilter] = useState('all');\n  useEffect(() => { if (genreFilter !== 'all') trackGenreView(genreFilter); }, [genreFilter]);",
        );
      }
      fs.writeFileSync(f, s);
      console.log("[patch-browse-tracking] ExplorePages");
    } else console.log("[patch-browse-tracking] ExplorePages skip");
  }
}

// GenrePage in ProfilePages
{
  const f = "client/src/pages/ProfilePages.tsx";
  if (fs.existsSync(f)) {
    let s = fs.readFileSync(f, "utf8");
    if (!s.includes("trackGenreView")) {
      s = ensureImport(s, "import { trackGenreView } from '@/lib/browseRecs';");
      if (!s.includes("useEffect")) {
        s = s.replace("import { useState }", "import { useEffect, useState }");
      }
      const old =
        "export function GenrePage() { const [, params] = useRoute('/genres/:slug'); const slug = params?.slug ?? ''; const genreQuery = trpc.genres.bySlug.useQuery({ slug }, { enabled: Boolean(slug) });";
      if (s.includes(old)) {
        s = s.replace(
          old,
          old +
            " useEffect(() => { if (genreQuery.data) trackGenreView(slug, (genreQuery.data as { name?: string }).name); }, [slug, genreQuery.data]);",
        );
      }
      fs.writeFileSync(f, s);
      console.log("[patch-browse-tracking] ProfilePages GenrePage");
    } else console.log("[patch-browse-tracking] ProfilePages skip");
  }
}

// Home BrowseRecommendations
{
  const f = "client/src/pages/Home.tsx";
  if (fs.existsSync(f)) {
    let s = fs.readFileSync(f, "utf8");
    if (!s.includes("BrowseRecommendations")) {
      s = ensureImport(s, "import { BrowseRecommendations } from '@/components/BrowseRecommendations';");
    }
    if (!s.includes("<BrowseRecommendations")) {
      const marker =
        '<section className="relative mt-20 overflow-hidden rounded-[28px] border border-white/10 bg-[#0c1430]';
      if (s.includes(marker)) {
        s = s.replace(marker, "<BrowseRecommendations />\n        " + marker);
      } else if (s.includes("{seriesItems.length > 0 && (")) {
        s = s.replace("{seriesItems.length > 0 && (", "<BrowseRecommendations />\n        {seriesItems.length > 0 && (");
      }
    }
    fs.writeFileSync(f, s);
    console.log("[patch-browse-tracking] Home");
  }
}
