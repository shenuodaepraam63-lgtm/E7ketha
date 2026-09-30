# SEO app.ts restore shards

Build uses `scripts/restore-seo-app-if-placeholder.mjs`:
1. `gz_*.b64` here (gzip+base64 of full server/app.ts) if present
2. Fallback: `scripts/app-parts/cXX.b64` or `gz_p*.b64`

Do not commit `PLACEHOLDER` as server/app.ts. Broken plain `p*.b64` shards are ignored.
