#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const target = path.resolve("server/app.ts");
const cur = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
const needs = !cur || cur.trim() === "PLACEHOLDER" || cur.length < 1000 || !cur.includes("renderPublicSeo");
if (!needs) {
  console.log("[restore-seo-app] app.ts looks valid, skip");
  process.exit(0);
}
const dir = path.resolve("scripts/seo-app-restore");
const parts = fs.readdirSync(dir).filter((f) => f.endsWith(".b64")).sort();
if (!parts.length) {
  console.error("[restore-seo-app] missing b64 parts");
  process.exit(1);
}
const b64 = parts.map((f) => fs.readFileSync(path.join(dir, f), "utf8").trim()).join("");
const text = Buffer.from(b64, "base64").toString("utf8");
if (!text.includes("renderPublicSeo")) {
  console.error("[restore-seo-app] decoded content invalid");
  process.exit(1);
}
fs.writeFileSync(target, text);
console.log("[restore-seo-app] restored server/app.ts from shards", text.length);
