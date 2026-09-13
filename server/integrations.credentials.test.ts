import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('external integration credentials', () => {
  it('authenticates with Supabase admin API', async () => {
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
    expect(error).toBeNull();
  }, 20_000);

  it('authenticates with Cloudinary API without uploading an asset', async () => {
    const value = process.env.CLOUDINARY_URL ?? '';
    const match = value.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    expect(match).not.toBeNull();
    const [, apiKey, apiSecret, cloudName] = match!;
    const auth = Buffer.from(`${decodeURIComponent(apiKey)}:${decodeURIComponent(apiSecret)}`).toString('base64');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?max_results=1`, { headers: { Authorization: `Basic ${auth}` } });
    expect(response.ok).toBe(true);
  }, 20_000);
});
