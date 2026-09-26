/**
 * Vercel serves dist/public/index.html for "/" before rewrites, which skips SSR.
 * Rename shell so all HTML routes hit the serverless API (full content without JS).
 */
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(process.cwd(), 'dist/public');
const indexPath = path.join(dir, 'index.html');
const shellPath = path.join(dir, 'spa-shell.html');

if (!fs.existsSync(indexPath)) {
  console.warn('[postbuild-ssr-shell] no dist/public/index.html — skip');
  process.exit(0);
}

fs.copyFileSync(indexPath, shellPath);
fs.unlinkSync(indexPath);
console.log('[postbuild-ssr-shell] index.html → spa-shell.html (force SSR for / and HTML routes)');
