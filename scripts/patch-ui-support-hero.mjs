import fs from 'fs';
import path from 'path';

function writeFromB64(relOut, relB64) {
  const b64path = path.join(process.cwd(), relB64);
  const out = path.join(process.cwd(), relOut);
  if (!fs.existsSync(b64path)) {
    console.warn('[ui-support-hero] missing', relB64);
    return;
  }
  const buf = Buffer.from(fs.readFileSync(b64path, 'utf8').trim(), 'base64');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  console.log('[ui-support-hero] wrote', relOut, buf.length);
}

writeFromB64('client/src/components/SupportAssistant.tsx', 'scripts/ui-parts/SupportAssistant.tsx.b64');
writeFromB64('client/src/pages/Home.tsx', 'scripts/ui-parts/Home.tsx.b64');

const shell = 'client/src/components/SiteShell.tsx';
if (fs.existsSync(shell)) {
  let s = fs.readFileSync(shell, 'utf8');
  if (!s.includes('SupportAssistant')) {
    if (!s.includes("from './SupportAssistant'")) {
      s = s.replace(
        "import { Link, useLocation } from 'wouter';",
        "import { Link, useLocation } from 'wouter';\nimport { SupportAssistant } from './SupportAssistant';",
      );
    }
    if (!s.includes('<SupportAssistant')) {
      s = s.replace(
        '<MobileBottomNav />',
        '<MobileBottomNav />\n      <SupportAssistant />',
      );
    }
    fs.writeFileSync(shell, s);
    console.log('[ui-support-hero] SiteShell wired');
  } else {
    console.log('[ui-support-hero] SiteShell already has SupportAssistant');
  }
}
