import { describe, expect, it } from 'vitest';

describe('Supabase WebDev credentials', () => {
  it('reaches the Supabase REST endpoint with the configured secret', async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
    expect(url).toBeTruthy();
    expect(key).toBeTruthy();

    const response = await fetch(`${url}/rest/v1/novels?select=id&limit=1`, {
      headers: { apikey: key!, Authorization: `Bearer ${key}` },
    });
    expect(response.ok).toBe(true);
  }, 15_000);
});
