import { listPublishedArticles } from "./articles";
import { listGenres, listNovels } from "./db";

function esc(v: unknown) {
  return String(v ?? "")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

export async function tryRichListSeo(normalized: string, origin: string) {
  if (normalized === "/explore") {
    const novels = await listNovels(80);
    const genres = await listGenres().catch(() => [] as any[]);
    const novelItems = novels
      .map((n: any) => {
        const a = n.author ? " — " + esc(n.author) : "";
        return "<li><a href=\"" + origin + "/books/" + esc(n.slug) + "\">" + esc(n.title) + "</a>" + a + "</li>";
      })
      .join("");
    const genreItems = (genres || [])
      .slice(0, 20)
      .map((g: any) => "<li><a href=\"" + origin + "/genres/" + esc(g.slug) + "\">" + esc(g.name) + "</a></li>")
      .join("");
    const d = "استكشف مكتبة الروايات العربية على E7ketha مع روابط مباشرة للعناوين والتصنيفات.";
    return {
      title: "استكشف الروايات العربية | E7ketha",
      description: d,
      canonical: origin + "/explore",
      type: "collection",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "استكشف الروايات",
        description: d,
        url: origin + "/explore",
        inLanguage: "ar",
      },
      content:
        '<main lang="ar" dir="rtl"><nav><a href="' +
        origin +
        '/">الرئيسية</a></nav><article><h1>استكشف الروايات العربية</h1><p>' +
        d +
        "</p><h2>روايات من المكتبة</h2><ul>" +
        novelItems +
        "</ul><h2>التصنيفات</h2><ul>" +
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
            "<li><a href=\"" + origin + "/articles/" + esc(a.slug) + "\">" + esc(a.title) + "</a></li>",
        )
        .join("") || "<li>لا مقالات منشورة حاليًا.</li>";
    const d = "مقالات وترشيحات أدبية على E7ketha تساعدك تختار روايتك التالية.";
    return {
      title: "مقالات أدبية | E7ketha",
      description: d,
      canonical: origin + "/articles",
      type: "collection",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "المقالات",
        description: d,
        url: origin + "/articles",
        inLanguage: "ar",
      },
      content:
        '<main lang="ar" dir="rtl"><nav><a href="' +
        origin +
        '/">الرئيسية</a></nav><article><h1>المقالات الأدبية</h1><p>' +
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
        const a = n.author ? " — " + esc(n.author) : "";
        return "<li><a href=\"" + origin + "/books/" + esc(n.slug) + "\">" + esc(n.title) + "</a>" + a + "</li>";
      })
      .join("");
    const d = "ابحث في روايات ومؤلفين وتصنيفات E7ketha، أو تصفح العناوين أدناه.";
    return {
      title: "بحث الروايات | E7ketha",
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
        '<main lang="ar" dir="rtl"><nav><a href="' +
        origin +
        '/">الرئيسية</a></nav><article><h1>البحث في المكتبة</h1><p>' +
        d +
        "</p><h2>عناوين للبدء</h2><ul>" +
        items +
        '</ul><p><a href="' +
        origin +
        '/explore">استكشف</a></p></article></main>',
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
      const a = n.author ? " — " + esc(n.author) : "";
      return "<li><a href=\"" + siteUrl + "/books/" + esc(n.slug) + "\">" + esc(n.title) + "</a>" + a + "</li>";
    })
    .join("");
  return (
    '<div dir="rtl" lang="ar"><header><a href="/">E7ketha</a> · <a href="/explore">استكشف</a> · <a href="/quotes">اقتباسات</a> · <a href="/articles">مقالات</a> · <a href="/search">بحث</a></header>' +
    "<main><section><h1>اكتشف روايتك القادمة</h1>" +
    "<p>E7ketha منصة عربية لاكتشاف الروايات: نساعدك تختار ما يستحق وقتك عبر التصنيفات والمؤلفين والسلاسل والاقتباسات والمقالات. منصة اكتشاف ومعلومات — لا نستضيف ملفات الكتب ولا نقدّم تحميلًا غير قانوني.</p>" +
    "<p>ابدأ من البحث أو قائمة الروايات، ثم افتح صفحة العمل لقراءة الملخص وروابط المؤلف والتصنيف والاقتباسات. هدفنا تبسيط اكتشاف الأدب العربي بواجهة واضحة.</p></section>" +
    "<section><h2>روايات مختارة من المكتبة</h2><ul>" +
    novelItems +
    '</ul><p><a href="/explore">كل الروايات</a> · <a href="/quotes">الاقتباسات</a> · <a href="/articles">المقالات</a></p></section>' +
    "<section><h2>كيف تستخدم المنصة؟</h2>" +
    "<p>اختر تصنيفًا يناسب مزاجك، تابع مؤلفًا، أو اقرأ اقتباسًا يقودك لرواية جديدة. بعد التسجيل يمكنك حفظ الاقتباسات وبناء اهتمامات في صفحة الاكتشاف.</p></section></main></div>"
  );
}
