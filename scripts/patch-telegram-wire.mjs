/**
 * Ensure Telegram webhook is registered on the production Express app (server/app.ts).
 */
import fs from 'fs';

const appPath = 'server/app.ts';
if (!fs.existsSync(appPath)) {
  console.log('[telegram-wire] no app.ts');
  process.exit(0);
}
let s = fs.readFileSync(appPath, 'utf8');
if (s.includes('PLACEHOLDER') && s.length < 50) {
  console.log('[telegram-wire] app.ts still placeholder — vercel-api-entry still registers webhook');
  process.exit(0);
}
if (s.includes('registerTelegramWebhook')) {
  console.log('[telegram-wire] already present');
  process.exit(0);
}

if (!s.includes('from "./telegram/webhook"') && !s.includes("from './telegram/webhook'")) {
  const imp = 'import { registerTelegramWebhook } from "./telegram/webhook";\n';
  const m = s.match(/^import .+$/m);
  if (m) {
    const idx = s.indexOf(m[0]) + m[0].length;
    s = s.slice(0, idx) + '\n' + imp + s.slice(idx);
  } else {
    s = imp + s;
  }
}

if (s.includes('return app;') && !s.includes('registerTelegramWebhook(app)')) {
  s = s.replace(/return app;/g, 'registerTelegramWebhook(app);\n  return app;');
}

fs.writeFileSync(appPath, s);
console.log('[telegram-wire] registered on app.ts');
