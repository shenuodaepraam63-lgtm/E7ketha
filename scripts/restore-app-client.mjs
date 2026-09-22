#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "scripts", "app-client-parts");
if (!existsSync(dir)) { console.warn("[restore-app-client] no parts"); process.exit(0); }
const files = readdirSync(dir).filter((f) => /^p\d+\.b64$/.test(f)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
const b64 = files.map((f) => readFileSync(join(dir, f), "utf8").trim()).join("");
const out = join(root, "client/src/App.tsx");
writeFileSync(out, Buffer.from(b64, "base64").toString("utf8"));
console.log("[restore-app-client] restored", out, files.length, "parts");
