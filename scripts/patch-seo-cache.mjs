import fs from "node:fs";
for (const file of ["server/seoPublicPages.ts", "server/app.ts"]) {
  if (!fs.existsSync(file)) continue;
  let s = fs.readFileSync(file, "utf8");
  const before = s;
  s = s.replaceAll(
    "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    "public, max-age=0, s-maxage=900, stale-while-revalidate=1800",
  );
  if (file.includes("seoPublicPages") && !s.includes("CDN-Cache-Control")) {
    s = s.replace(
      "res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900, stale-while-revalidate=1800');",
      "res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=900, stale-while-revalidate=1800');\n  res.setHeader('CDN-Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');",
    );
  }
  if (s !== before) {
    fs.writeFileSync(file, s);
    console.log("[patch-seo-cache]", file);
  }
}
