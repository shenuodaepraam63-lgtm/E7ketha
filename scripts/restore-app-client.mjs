#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "client/src/App.tsx");
const dir = join(root, "scripts", "app-client-parts");
const fullPath = join(root, "scripts", "app-client-full.b64");

function isValid(text) {
  return (
    text &&
    text.length >= 12000 &&
    text.includes("isEntityPage") &&
    text.includes("Do not overwrite SSR") &&
    !text.includes("PLACEHOLDER")
  );
}

if (existsSync(out)) {
  try {
    const existing = readFileSync(out, "utf8");
    if (isValid(existing)) {
      console.log("[restore-app-client] App.tsx already valid, skip", existing.length);
      process.exit(0);
    }
  } catch {}
}

let text = null;
if (existsSync(fullPath)) {
  try {
    text = Buffer.from(readFileSync(fullPath, "utf8").trim(), "base64").toString("utf8");
    console.log("[restore-app-client] from app-client-full.b64", text.length);
  } catch (e) {
    console.warn("[restore-app-client] full.b64 failed", e.message);
  }
}
if (!isValid(text)) {
  const shards = [0, 1, 2].map((i) => join(root, "scripts", `app-client-full-${i}.b64`));
  if (shards.every((p) => existsSync(p))) {
    try {
      const b64 = shards.map((p) => readFileSync(p, "utf8").trim()).join("");
      text = Buffer.from(b64, "base64").toString("utf8");
      console.log("[restore-app-client] from app-client-full shards", text.length);
    } catch (e) {
      console.warn("[restore-app-client] shards failed", e.message);
    }
  }
}

if (!isValid(text) && existsSync(dir)) {
  const files = readdirSync(dir)
    .filter((f) => /^p\d+\.b64$/.test(f))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const b64 = files.map((f) => readFileSync(join(dir, f), "utf8").trim()).join("");
  text = Buffer.from(b64, "base64").toString("utf8");
  console.log("[restore-app-client] from parts", files.length, text.length);
}

if (!isValid(text)) {
  console.error("[restore-app-client] decoded App.tsx invalid", text && text.length);
  process.exit(1);
}
writeFileSync(out, text);
console.log("[restore-app-client] wrote App.tsx", text.length);
