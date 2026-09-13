import { describe, expect, it } from 'vitest';

describe('Gemini credentials', () => {
  it('reaches a Gemini model endpoint with the configured server key', async () => {
    const key = process.env.GEMINI_API_KEY;
    expect(key).toBeTruthy();
    expect(key).not.toContain('Interactions API');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite?key=${encodeURIComponent(key!)}`);
    expect(response.status).toBe(200);
  }, 15_000);
});
