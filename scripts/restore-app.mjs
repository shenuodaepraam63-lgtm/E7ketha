#!/usr/bin/env node
/** Restores server/app.ts from scripts/app-parts (cXX.b64 or gz_pX.b64) */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const partsDir = join(root, 'scripts', 'app-parts');
const out = join(root, 'server', 'app.ts');

if (!existsSync(partsDir)) {
  console.warn('[restore-app] no parts dir, skip');
  process.exit(0);
}

let b64 = '';
const chunkFiles = readdirSync(partsDir)
  .filter((f) => /^c\d+\.b64$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

if (chunkFiles.length) {
  b64 = chunkFiles.map((f) => readFileSync(join(partsDir, f), 'utf8').trim()).join('');
} else {
  const files = [];
  for (let i = 0; ; i++) {
    const f = join(partsDir, `gz_p${i}.b64`);
    if (!existsSync(f)) break;
    files.push(f);
  }
  if (!files.length) {
    console.warn('[restore-app] no parts, skip');
    process.exit(0);
  }
  b64 = files.map((f) => readFileSync(f, 'utf8').trim()).join('');
}

try {
  const content = gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
  writeFileSync(out, content);
  console.log('[restore-app] wrote server/app.ts', content.length, 'bytes');
} catch (err) {
  console.error('[restore-app] decode failed', err);
  process.exit(1);
}
