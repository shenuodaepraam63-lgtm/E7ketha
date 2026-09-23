#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'server', 'db.ts');
const full = join(root, 'scripts', 'db-parts-full.b64');
const fullA = join(root, 'scripts', 'db-parts-full-a.b64');
const fullB = join(root, 'scripts', 'db-parts-full-b.b64');
const partsDir = join(root, 'scripts', 'db-parts');

function writeFromB64(b64) {
  const content = gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
  writeFileSync(out, content);
  console.log('[restore-db] wrote server/db.ts', content.length, 'bytes');
}

if (existsSync(fullA) && existsSync(fullB)) {
  writeFromB64(readFileSync(fullA, 'utf8').trim() + readFileSync(fullB, 'utf8').trim());
  process.exit(0);
}
if (existsSync(full)) {
  writeFromB64(readFileSync(full, 'utf8').trim());
  process.exit(0);
}
if (!existsSync(partsDir)) {
  console.warn('[restore-db] no parts, skip');
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
writeFromB64(files.map((f) => readFileSync(f, 'utf8').trim()).join(''));
