import fs from 'fs';
const path = 'server/routers.ts';
if (!fs.existsSync(path)) process.exit(0);
let s = fs.readFileSync(path, 'utf8');
const before = s;
s = s.replace(/keywords:\s*z\.string\(\)\.max\(2000\)/g, 'keywords: z.string().max(12000)');
if (s !== before) {
  fs.writeFileSync(path, s);
  console.log('[keywords-limit] raised keywords max to 12000');
} else {
  console.log('[keywords-limit] ok (already 12000 or not present)');
}
