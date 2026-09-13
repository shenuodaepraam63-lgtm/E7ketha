import { describe, expect, it } from 'vitest';
import { analyzeNovelImport } from './aiNovelImporter';

describe('Gemini novel importer', () => {
  it('returns a reviewable metadata draft without requiring a source link', async () => {
    const draft = await analyzeNovelImport({ title: 'أرض زيكولا', links: [] });
    expect(draft.title).toBeTruthy();
    expect(draft.author.name).toBeTruthy();
    expect(draft.books.length).toBeGreaterThan(0);
    expect(Array.isArray(draft.links)).toBe(true);
  }, 60_000);
});
