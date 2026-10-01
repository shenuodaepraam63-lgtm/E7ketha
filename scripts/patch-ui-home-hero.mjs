import fs from 'fs';
function load() {
  if (fs.existsSync('scripts/ui-parts/Home.tsx.b64')) {
    return fs.readFileSync('scripts/ui-parts/Home.tsx.b64', 'utf8').trim();
  }
  const a = 'scripts/ui-parts/Home.tsx.b64.p0';
  const b = 'scripts/ui-parts/Home.tsx.b64.p1';
  if (fs.existsSync(a) && fs.existsSync(b)) {
    return fs.readFileSync(a, 'utf8').trim() + fs.readFileSync(b, 'utf8').trim();
  }
  return null;
}
const b64 = load();
if (!b64) { console.log('[home-hero] skip'); process.exit(0); }
const buf = Buffer.from(b64, 'base64');
fs.writeFileSync('client/src/pages/Home.tsx', buf);
console.log('[home-hero] wrote Home.tsx', buf.length);
