#!/usr/bin/env node
/** Restores server/app.ts from scripts/app-parts */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const partsDir = join(root, 'scripts', 'app-parts');
const out = join(root, 'server', 'app.ts');

function decodeB64(b64) {
  return gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
}

if (!existsSync(partsDir)) {
  console.warn('[restore-app] no parts dir, skip');
  process.exit(0);
}

const chunkFiles = readdirSync(partsDir)
  .filter((f) => /^c\d+\.b64$/.test(f))
  .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

const gzFiles = [];
for (let i = 0; ; i++) {
  const f = join(partsDir, `gz_p${i}.b64`);
  if (!existsSync(f)) break;
  gzFiles.push(f);
}

let content = null;
if (chunkFiles.length) {
  try {
    const b64 = chunkFiles.map((f) => readFileSync(join(partsDir, f), 'utf8').trim()).join('');
    content = decodeB64(b64);
    console.log('[restore-app] from cXX chunks', content.length);
  } catch (e) {
    console.warn('[restore-app] cXX decode failed, trying gz_p', e.message);
  }
}
if (!content && gzFiles.length) {
  const b64 = gzFiles.map((f) => readFileSync(f, 'utf8').trim()).join('');
  content = decodeB64(b64);
  console.log('[restore-app] from gz_p parts', content.length);
}
if (!content) {
  console.error('[restore-app] no valid parts');
  process.exit(1);
}
writeFileSync(out, content);
