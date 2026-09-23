# Production deploy notes (2026-09-23)

Build pipeline applies these fixes automatically:

1. `restore-db` — Postgres REST on Vercel (no 5s cold pool wait)
2. `restore-app-client` — full App.tsx with SEO isEntityPage guard
3. `patch-quotes-route` — `/quotes` uses `QuotesPage` (not broken `nt=` prop)
4. `patch-routers-cache` — in-memory TTL cache for public lists
5. `patch-search-filters` — `genreSlug` + `authorSlug` on REST searchNovels
6. `patch-quotes-enrich` — stop loading all novels/authors on every quotes page
7. Manus runtime stripped from production (vite.config)
8. GA4 G-HJM7WK3Y6L + SPA page_view
9. `/api/warm` cron every 5 minutes
10. Home parallel queries + skeletons

After deploy, verify:
- https://e7ketha.com/quotes shows quote cards
- https://e7ketha.com/genres/horror vs /genres/romance differ when novelGenres linked
- HTML size ~7KB (no manus-runtime)
