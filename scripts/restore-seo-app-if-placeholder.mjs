#!/usr/bin/env node
/**
 * Restores server/app.ts when PLACEHOLDER or truncated.
 * Prefers gzip+base64 shards in scripts/seo-app-restore/gz_*.b64
 * Falls back to scripts/app-parts (cXX or gz_p) used by restore-app.mjs
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const target = path.resolve("server/app.ts");
const cur = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
const needs =
  !cur ||
  cur.trim() === "PLACEHOLDER" ||
  cur.length < 5000 ||
  !cur.includes("renderPublicSeo");

if (!needs) {
  console.log("[restore-seo-app] app.ts looks valid, skip");
  process.exit(0);
}

function tryDecode(b64, label) {
  if (!b64 || b64.length < 100) return null;
  try {
    const gz = zlib.gunzipSync(Buffer.from(b64, "base64"));
    const text = gz.toString("utf8");
    if (text.includes("renderPublicSeo") && text.includes("express")) return text;
  } catch {
    /* try plain */
  }
  try {
    const text = Buffer.from(b64, "base64").toString("utf8");
    if (text.includes("renderPublicSeo") && text.includes("express")) return text;
  } catch {
    /* ignore */
  }
  console.warn("[restore-seo-app] decode failed for", label);
  return null;
}

function joinB64(dir, filterFn) {
  if (!fs.existsSync(dir)) return null;
  const parts = fs
    .readdirSync(dir)
    .filter(filterFn)
    .sort((a, b) => {
      const na = Number((a.match(/\d+/) || [0])[0]);
      const nb = Number((b.match(/\d+/) || [0])[0]);
      return na - nb;
    });
  if (!parts.length) return null;
  return parts.map((f) => fs.readFileSync(path.join(dir, f), "utf8").trim()).join("");
}

let text = null;

const seoDir = path.resolve("scripts/seo-app-restore");
text = tryDecode(joinB64(seoDir, (f) => /^gz_.*\.b64$/.test(f)), "seo-app-restore/gz_*");

if (!text) {
  text = tryDecode(
    joinB64(seoDir, (f) => f.endsWith(".b64") && f.startsWith("gz_")),
    "seo-app-restore/gz_ only",
  );
}

if (!text) {
  const appParts = path.resolve("scripts/app-parts");
  text = tryDecode(joinB64(appParts, (f) => /^c\d+\.b64$/.test(f)), "app-parts/cXX");
}

if (!text) {
  const appParts = path.resolve("scripts/app-parts");
  text = tryDecode(joinB64(appParts, (f) => /^gz_p\d+\.b64$/.test(f)), "app-parts/gz_p");
}

if (!text) {
  console.error(
    "[restore-seo-app] could not restore app.ts — PLACEHOLDER remains. Push a valid server/app.ts or fix shards.",
  );
  process.exit(1);
}

fs.writeFileSync(target, text);
console.log("[restore-seo-app] restored server/app.ts", text.length, "bytes");
