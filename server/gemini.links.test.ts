import { describe, expect, it } from 'vitest';
import { discoverSeriesLinks } from './aiNovelImporter';

describe('Gemini series link discovery', () => {
  it('returns a safe per-book link result shape', async () => {
    const result = await discoverSeriesLinks({
      title: 'أرض زيكولا',
      seriesTitle: 'أرض زيكولا',
      books: [
        { title: 'أرض زيكولا', slug: 'ard-ziqola', order: 1 },
        { title: 'أماريتا', slug: 'amarita', order: 2 },
      ],
      existingLinks: [],
    });
    expect(result.books).toHaveLength(2);
    expect(result.books.every((book) => Array.isArray(book.links))).toBe(true);
    expect(result.books.flatMap((book) => book.links).every((link) => /^https?:\/\//.test(link.url))).toBe(true);
  }, 45_000);
});
