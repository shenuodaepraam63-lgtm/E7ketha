#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "scripts", "app-client-parts");
if (!existsSync(dir)) {
  console.error("[restore-app-client] missing scripts/app-client-parts");
  process.exit(1);
}
const files = readdirSync(dir)
  .filter((f) => /^p\d+\.b64$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
if (files.length < 20) {
  console.error("[restore-app-client] incomplete parts", files.length);
  process.exit(1);
}
const b64 = files.map((f) => readFileSync(join(dir, f), "utf8").trim()).join("");
const out = join(root, "client/src/App.tsx");
const text = Buffer.from(b64, "base64").toString("utf8");
if (
  text.length < 12000 ||
  !text.includes("isEntityPage") ||
  !text.includes("Do not overwrite SSR") ||
  text.includes("PLACEHOLDER")
) {
  console.error("[restore-app-client] decoded App.tsx invalid", text.length);
  process.exit(1);
}
writeFileSync(out, text);
console.log("[restore-app-client] restored App.tsx from", files.length, "parts");
