import { listPublishedArticles } from "./articles";
import { listGenres, listNovels } from "./db";

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, String.fromCharCode(38) + "amp;")
    .replace(/</g, String.fromCharCode(38) + "lt;")
    .replace(/>/g, String.fromCharCode(38) + "gt;")
    .replace(/"/g, String.fromCharCode(38) + "quot;");
}

export async function tryRichListSeo(normalized: string, origin: string) {
  if (normalized === "/explore") {
    const novels = await listNovels(80);
    const genres = await listGenres().catch(() => [] as any[]);
    const novelItems = novels
      .map((n: any) => {
        const a = n.author ? " - " + esc(n.author) : "";
        return "<li><a href=" + JSON.stringify(origin + "/books/" + String(n.slug ?? "")) + ">" + esc(n.title) + "</a>" + a + "</li>";
      })
      .join("");
    const genreItems = (genres || [])
      .slice(0, 20)
      .map((g: any) => "<li><a href=" + JSON.stringify(origin + "/genres/" + String(g.slug ?? "")) + ">" + esc(g.name) + "</a></li>")
      .join("");
    const d = "Explore Arabic novels on E7ketha with direct links to titles and genres.";
    const h1 = "Explore Arabic novels";
    return {
      title: h1 + " | E7ketha",
      description: d,
      canonical: origin + "/explore",
      type: "collection",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: h1,
        description: d,
        url: origin + "/explore",
        inLanguage: "ar",
      },
      content:
        "<main lang=\"ar\" dir=\"rtl\"><nav><a href=\"" +
        origin +
        "/\">Home</a></nav><article><h1>" +
        h1 +
        "</h1><p>" +
        d +
        "</p><h2>Novels</h2><ul>" +
        novelItems +
        "</ul><h2>Genres</h2><ul>" +
        genreItems +
        "</ul></article></main>",
    };
  }
  if (normalized === "/articles") {
    const articles = await listPublishedArticles(40).catch(() => [] as any[]);
    const items =
      (articles || [])
        .map(
          (a: any) =>
            "<li><a href=" + JSON.stringify(origin + "/articles/" + String(a.slug ?? "")) + ">" + esc(a.title) + "</a></li>",
        )
        .join("") || "<li>No published articles yet.</li>";
    const d = "Literary articles and reading tips on E7ketha.";
    const h1 = "Articles";
    return {
      title: h1 + " | E7ketha",
      description: d,
      canonical: origin + "/articles",
      type: "collection",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: h1,
        description: d,
        url: origin + "/articles",
        inLanguage: "ar",
      },
      content:
        "<main lang=\"ar\" dir=\"rtl\"><nav><a href=\"" +
        origin +
        "/\">Home</a></nav><article><h1>" +
        h1 +
        "</h1><p>" +
        d +
        "</p><ul>" +
        items +
        "</ul></article></main>",
    };
  }
  if (normalized === "/search") {
    const novels = await listNovels(30).catch(() => [] as any[]);
    const items = (novels || [])
      .map((n: any) => {
        const a = n.author ? " - " + esc(n.author) : "";
        return "<li><a href=" + JSON.stringify(origin + "/books/" + String(n.slug ?? "")) + ">" + esc(n.title) + "</a>" + a + "</li>";
      })
      .join("");
    const d = "Search novels, authors, and genres on E7ketha. Starter titles below.";
    const h1 = "Search";
    return {
      title: h1 + " | E7ketha",
      description: d,
      canonical: origin + "/search",
      type: "website",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        url: origin,
        potentialAction: {
          "@type": "SearchAction",
          target: origin + "/search?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      content:
        "<main lang=\"ar\" dir=\"rtl\"><nav><a href=\"" +
        origin +
        "/\">Home</a></nav><article><h1>" +
        h1 +
        "</h1><p>" +
        d +
        "</p><h2>Starter titles</h2><ul>" +
        items +
        "</ul><p><a href=\"" +
        origin +
        "/explore\">Explore</a></p></article></main>",
    };
  }
  return null;
}

export function renderRichHomepageShell(
  siteUrl: string,
  novels: Array<{ slug: string; title: string; author?: string | null }>,
) {
  const novelItems = (novels || [])
    .slice(0, 24)
    .map((n) => {
      const a = n.author ? " - " + esc(n.author) : "";
      return "<li><a href=" + JSON.stringify(siteUrl + "/books/" + String(n.slug ?? "")) + ">" + esc(n.title) + "</a>" + a + "</li>";
    })
    .join("");
  return (
    "<div dir=\"rtl\" lang=\"ar\"><header><a href=\"/\">E7ketha</a> · <a href=\"/explore\">Explore</a> · <a href=\"/quotes\">Quotes</a> · <a href=\"/articles\">Articles</a> · <a href=\"/search\">Search</a></header>" +
    "<main><section><h1>Discover your next novel</h1>" +
    "<p>E7ketha is an Arabic novel discovery platform. We help you find what is worth your time via genres, authors, series, quotes, and articles. Discovery only — we do not host book files.</p>" +
    "<p>Start from search or the novel list, then open a book page for summary, author, genre, and related quotes.</p></section>" +
    "<section><h2>Selected novels</h2><ul>" +
    novelItems +
    "</ul><p><a href=\"/explore\">All novels</a> · <a href=\"/quotes\">Quotes</a> · <a href=\"/articles\">Articles</a></p></section>" +
    "<section><h2>How it works</h2>" +
    "<p>Pick a genre, follow an author, or read a quote that leads to a new book. After signup you can save quotes and build interests on Discover.</p></section></main></div>"
  );
}
