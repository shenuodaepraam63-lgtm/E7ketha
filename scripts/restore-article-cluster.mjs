#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const target = path.resolve("server/articleCluster.ts");
if (fs.existsSync(target) && fs.readFileSync(target, "utf8").includes("generateNovelCluster")) {
  console.log("[article-cluster] already present");
  process.exit(0);
}
const dir = path.resolve("scripts/article-cluster-parts");
const parts = fs.readdirSync(dir).filter((f) => f.endsWith(".b64")).sort();
const b64 = parts.map((f) => fs.readFileSync(path.join(dir, f), "utf8").trim()).join("");
const buf = zlib.gunzipSync(Buffer.from(b64, "base64"));
fs.writeFileSync(target, buf);
console.log("[article-cluster] wrote", target, buf.length);
