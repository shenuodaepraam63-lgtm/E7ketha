/**
 * Serve client index.html for SPA routes (login, profile, admin, …).
 * Without this, Express returns "Cannot GET /profile".
 */
import fs from "node:fs";

const f = "server/app.ts";
if (!fs.existsSync(f)) process.exit(0);
let s = fs.readFileSync(f, "utf8");
if (s.includes("/* SPA_FALLBACK */")) {
  console.log("[patch-spa-fallback] already applied");
  process.exit(0);
}

const needle = `  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  return app;
}`;

const insert = `  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  /* SPA_FALLBACK — client routes (login/profile/admin/…) must receive index.html */
  app.get("*", (req, res, next) => {
    const p = String(req.path || "");
    if (p.startsWith("/api") || p.startsWith("/sitemap") || p.includes(".")) {
      return next();
    }
    try {
      const html = readClientTemplate();
      res
        .status(200)
        .type("html")
        .set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300")
        .set("X-Robots-Tag", p === "/admin" || p.startsWith("/admin/") ? "noindex, nofollow" : "noindex")
        .send(html);
    } catch (err) {
      next(err);
    }
  });
  return app;
}`;

if (!s.includes(needle)) {
  const alt = /app\.use\(\s*"\/api\/trpc",\s*createExpressMiddleware\(\{[\s\S]*?\}\),\s*\);\s*return app;\s*\}/;
  if (alt.test(s)) {
    s = s.replace(alt, insert);
  } else {
    console.error("[patch-spa-fallback] trpc mount not found");
    process.exit(1);
  }
} else {
  s = s.replace(needle, insert);
}

fs.writeFileSync(f, s);
console.log("[patch-spa-fallback] applied");
