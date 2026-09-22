#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "client/src/App.tsx");
const dir = join(root, "scripts", "app-client-parts");

function isValid(text) {
  return (
    text &&
    text.length >= 12000 &&
    text.includes("isEntityPage") &&
    text.includes("Do not overwrite SSR") &&
    !text.includes("PLACEHOLDER")
  );
}

// Prefer already-committed valid App.tsx
if (existsSync(out)) {
  try {
    const existing = readFileSync(out, "utf8");
    if (isValid(existing)) {
      console.log("[restore-app-client] App.tsx already valid, skip", existing.length);
      process.exit(0);
    }
  } catch {}
}

if (!existsSync(dir)) {
  console.error("[restore-app-client] missing scripts/app-client-parts and no valid App.tsx");
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
const text = Buffer.from(b64, "base64").toString("utf8");
if (!isValid(text)) {
  console.error("[restore-app-client] decoded App.tsx invalid", text?.length);
  process.exit(1);
}
writeFileSync(out, text);
console.log("[restore-app-client] restored App.tsx from", files.length, "parts");
