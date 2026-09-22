#!/usr/bin/env node
/** Restores server/db.ts from gzipped base64 parts in scripts/db-parts/ */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const partsDir = join(root, 'scripts', 'db-parts');
const out = join(root, 'server', 'db.ts');

if (!existsSync(partsDir)) {
  console.warn('[restore-db] no parts dir, skip');
  process.exit(0);
}

const files = [];
for (let i = 0; ; i++) {
  const f = join(partsDir, `gz_p${i}.b64`);
  if (!existsSync(f)) break;
  files.push(f);
}
if (!files.length) {
  console.warn('[restore-db] no gz parts, skip');
  process.exit(0);
}

const b64 = files.map((f) => readFileSync(f, 'utf8').trim()).join('');
const gz = Buffer.from(b64, 'base64');
const content = gunzipSync(gz).toString('utf8');
writeFileSync(out, content);
console.log('[restore-db] wrote server/db.ts', content.length, 'bytes from', files.length, 'gz parts');
