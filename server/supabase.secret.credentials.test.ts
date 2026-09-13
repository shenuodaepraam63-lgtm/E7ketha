import { describe, expect, it } from 'vitest';

describe('Supabase secret credentials', () => {
  it('reaches the Supabase REST API with the configured server secret', async () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    expect(url).toBeTruthy();
    expect(key).toBeTruthy();
    expect(key).not.toMatch(/^sb_publishable_/);
    const response = await fetch(`${url}/rest/v1/novels?select=id&limit=1`, {
      headers: { apikey: key!, Authorization: `Bearer ${key}` },
    });
    expect(response.status).toBe(200);
  }, 15_000);
});
