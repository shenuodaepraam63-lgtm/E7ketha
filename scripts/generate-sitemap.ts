import fs from 'node:fs/promises';
import path from 'node:path';

const base = 'https://e7ketha.vercel.app';
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const urls = new Map<string, string>([['/', '1.0'], ['/explore', '0.9'], ['/search', '0.8'], ['/quotes', '0.7'], ['/discover', '0.7']]);
const addRows = async (table: string, prefix: string) => {
  if (!supabaseUrl || !supabaseKey) return;
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=slug&limit=1000`, { headers: { apikey: supabaseKey } });
    if (!response.ok) return;
    const rows = await response.json() as Array<{ slug?: string }>;
    rows.forEach((row) => { if (row.slug) urls.set(`${prefix}/${encodeURIComponent(row.slug)}`, '0.6'); });
  } catch { /* keep the core sitemap when Supabase is unavailable during build */ }
};
await addRows('novels', '/books');
await addRows('authors', '/authors');
await addRows('genres', '/genres');
await addRows('series', '/series');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.from(urls.entries()).map(([url, priority]) => `  <url><loc>${base}${url}</loc><changefreq>${url === '/' || url === '/explore' ? 'daily' : 'weekly'}</changefreq><priority>${priority}</priority></url>`).join('\n')}\n</urlset>\n`;
await fs.mkdir(path.resolve('client/public'), { recursive: true });
await fs.writeFile(path.resolve('client/public/sitemap.xml'), xml, 'utf8');
