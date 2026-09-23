#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = join(root, "server", "db.ts");
if (!existsSync(dbPath)) process.exit(0);
let t = readFileSync(dbPath, "utf8");
if (t.includes("select=novelId&genreId=eq.")) {
  console.log("[patch-search-filters] already applied");
  process.exit(0);
}
const anchor = "if (filters.minRating) params.set('rating', `gte.${Math.round(filters.minRating * 100)}`);";
const idx = t.indexOf(anchor);
if (idx < 0) {
  console.warn("[patch-search-filters] anchor missing");
  process.exit(0);
}
const insert = `
    if (filters.genreSlug) {
      try {
        const genreRows = await supabaseRest<any[]>(
          'genres',
          \`select=id&slug=eq.\${encodeURIComponent(filters.genreSlug)}&limit=1\`,
        );
        const genreId = genreRows?.[0]?.id;
        if (!genreId) return [];
        const links = await supabaseRest<any[]>(
          'novelGenres',
          \`select=novelId&genreId=eq.\${genreId}&limit=500\`,
        );
        const novelIds = Array.from(
          new Set((links ?? []).map((r) => Number(r.novelId)).filter(Boolean)),
        );
        if (!novelIds.length) return [];
        params.set('id', \`in.(\${novelIds.join(',')})\`);
      } catch (e) {
        console.warn('[searchNovels] genre filter failed', e);
        return [];
      }
    }
    if (filters.authorSlug) {
      try {
        const authorRows = await supabaseRest<any[]>(
          'authors',
          \`select=id&slug=eq.\${encodeURIComponent(filters.authorSlug)}&limit=1\`,
        );
        const authorId = authorRows?.[0]?.id;
        if (!authorId) return [];
        params.set('authorId', \`eq.\${authorId}\`);
      } catch (e) {
        console.warn('[searchNovels] author filter failed', e);
        return [];
      }
    }`;
t = t.slice(0, idx + anchor.length) + insert + t.slice(idx + anchor.length);
writeFileSync(dbPath, t);
console.log("[patch-search-filters] applied");
