import fs from 'node:fs/promises';
import path from 'node:path';

// sitemap.xml is served dynamically by the Express/Vercel endpoint so newly
// published content appears immediately without a rebuild.
await fs.rm(path.resolve('client/public/sitemap.xml'), { force: true });
