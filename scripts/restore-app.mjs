#!/usr/bin/env node
/** Restores server/app.ts — prefers scripts/app-source/app.ts, else gzipped parts */
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const out = join(root, 'server', 'app.ts');
const source = join(root, 'scripts', 'app-source', 'app.ts');
const partsDir = join(root, 'scripts', 'app-parts');

if (existsSync(source)) {
  copyFileSync(source, out);
  console.log('[restore-app] wrote server/app.ts from app-source', readFileSync(out).length, 'bytes');
  process.exit(0);
}

if (!existsSync(partsDir)) {
  console.warn('[restore-app] no parts dir and no app-source, skip');
  process.exit(0);
}

const files = [];
for (let i = 0; ; i++) {
  const f = join(partsDir, `gz_p${i}.b64`);
  if (!existsSync(f)) break;
  files.push(f);
}
if (!files.length) {
  console.warn('[restore-app] no gz parts, skip');
  process.exit(0);
}

const b64 = files.map((f) => readFileSync(f, 'utf8').trim()).join('');
const gz = Buffer.from(b64, 'base64');
const content = gunzipSync(gz).toString('utf8');
writeFileSync(out, content);
console.log('[restore-app] wrote server/app.ts', content.length, 'bytes from', files.length, 'gz parts');
