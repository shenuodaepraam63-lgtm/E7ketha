#!/usr/bin/env node
/** Restores server/app.ts from gzipped base64 parts in scripts/app-parts/ */
import { readFileSync, writeFileSync, existsSync } from 'fs';
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
try {
  const content = gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
  writeFileSync(out, content);
  console.log('[restore-app] wrote server/app.ts', content.length, 'bytes from', files.length, 'gz parts');
} catch (err) {
  console.error('[restore-app] failed to decode parts', err);
  process.exit(1);
}
