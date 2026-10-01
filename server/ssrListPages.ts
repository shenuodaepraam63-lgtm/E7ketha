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
  const desktopBg = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663961203840/avdJPpHUoodsoAYR.jpg";
  const mobileBg = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663961203840/EOMzsCxgoggbSFuS.jpg";
  return (
    "<div dir=\"rtl\" lang=\"ar\" style=\"background:#080b18;color:#fff;min-height:100vh;font-family:Arial,sans-serif\"><header style=\"padding:18px 5%;position:relative;z-index:2\"><a href=\"/\" style=\"color:#fff;font-weight:800;text-decoration:none\">𝐄𝟳𝐤𝐞𝐭𝐡𝐚</a> · <a href=\"/explore\" style=\"color:#ddd\">استكشف</a> · <a href=\"/quotes\" style=\"color:#ddd\">الاقتباسات</a> · <a href=\"/articles\" style=\"color:#ddd\">المقالات</a></header>" +
    "<main><section style=\"position:relative;overflow:hidden;min-height:620px;padding:72px 5%;background:#080b18\"><picture style=\"position:absolute;inset:0;z-index:0\"><source media=\"(max-width:767px)\" srcset=\"" + mobileBg + "\"><img src=\"" + desktopBg + "\" alt=\"\" style=\"width:100%;height:100%;object-fit:cover;opacity:.34\"></picture><div style=\"position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,11,24,.45),rgba(8,11,24,.94))\"></div><div style=\"position:relative;z-index:1;max-width:680px;padding-top:110px\"><p style=\"color:#bbb5ff;font-weight:700\">منصة اكتشاف الروايات العربية</p><h1 style=\"font-size:clamp(40px,7vw,78px);line-height:1.15;margin:18px 0;font-weight:900\">اكتشف روايتك القادمة.</h1><p style=\"color:rgba(255,255,255,.78);font-size:18px;line-height:2\">اكتشف الروايات العربية التي تستحق وقتك، وتعرّف على المؤلفين والتصنيفات والاقتباسات في مكان واحد.</p><p style=\"margin-top:28px\"><a href=\"/explore\" style=\"display:inline-block;background:#675de8;color:#fff;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:800\">استكشف الروايات</a></p></div></section>" +
    "<section style=\"padding:42px 5%;color:#18203d;background:#f7f8fc\"><h2>روايات مختارة</h2><ul>" +
    novelItems +
    "</ul><p><a href=\"/explore\">كل الروايات</a> · <a href=\"/quotes\">الاقتباسات</a> · <a href=\"/articles\">المقالات</a></p></section></main></div>"
  );
}
