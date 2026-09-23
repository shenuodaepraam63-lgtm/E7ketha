#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const appPath = join(root, 'client/src/App.tsx');
if (!existsSync(appPath)) process.exit(0);
let t = readFileSync(appPath, 'utf8');
const bad = '<Route path="/quotes" nt={QuoteCategoryPage} />';
const good = '<Route path="/quotes" component={QuotesPage} />';
if (t.includes(good) && !t.includes(bad)) {
  console.log('[patch-quotes-route] already ok');
  process.exit(0);
}
if (t.includes(bad)) {
  t = t.replace(bad, good);
  writeFileSync(appPath, t);
  console.log('[patch-quotes-route] fixed nt={QuoteCategoryPage}');
  process.exit(0);
}
// also fix if wrong component
if (t.includes('<Route path="/quotes" component={QuoteCategoryPage} />')) {
  t = t.replace(
    '<Route path="/quotes" component={QuoteCategoryPage} />',
    good,
  );
  writeFileSync(appPath, t);
  console.log('[patch-quotes-route] fixed component={QuoteCategoryPage}');
  process.exit(0);
}
console.warn('[patch-quotes-route] no matching /quotes route pattern');
