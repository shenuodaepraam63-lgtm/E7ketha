/**
 * On Vercel, getDb() returns null and listGenres uses plain REST without novelCount.
 * Home/Explore then show "0 رواية". Enrich REST path with novelGenres counts.
 */
import fs from "node:fs";
import path from "node:path";

const target = path.resolve("server/db.ts");
let src = fs.readFileSync(target, "utf8");

const MARKER = "/* PATCH_GENRE_COUNTS */";
if (src.includes(MARKER)) {
  console.log("[patch-genre-counts] already applied");
  process.exit(0);
}

const altOld = `if (!db) return supabaseRest<any[]>('genres', 'select=*&order=name.asc&limit=1000');`;
const altNew = `if (!db) {
    ${MARKER}
    const [rows, links] = await Promise.all([
      supabaseRest<any[]>('genres', 'select=*&order=name.asc&limit=1000'),
      supabaseRest<any[]>('novelGenres', 'select=genreId,novelId&limit=20000'),
    ]);
    const counts = new Map();
    for (const link of links) {
      const gid = Number(link.genreId);
      const nid = Number(link.novelId);
      if (!Number.isFinite(gid) || !Number.isFinite(nid)) continue;
      if (!counts.has(gid)) counts.set(gid, new Set());
      counts.get(gid).add(nid);
    }
    return rows.map((row) => ({
      ...row,
      novelCount: counts.get(Number(row.id))?.size ?? 0,
    }));
  }`;

if (!src.includes(altOld)) {
  console.error("[patch-genre-counts] could not find genres REST stub");
  process.exit(1);
}

src = src.replace(altOld, altNew);
fs.writeFileSync(target, src);
console.log("[patch-genre-counts] applied — REST listGenres includes novelCount");
