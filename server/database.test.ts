import { describe, expect, it } from 'vitest';
import { getNovelBySlug, listNovels, searchNovels } from './db';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

const anonymousContext: TrpcContext = {
  user: null,
  req: { protocol: 'https', headers: {} } as TrpcContext['req'],
  res: {} as TrpcContext['res'],
};

describe('database persistence', () => {
  it('reads seeded novels from the persistent database', async () => {
    const novel = await getNovelBySlug('ard-zikola');
    expect(novel?.title).toBe('أرض زيكولا');
    expect(novel?.author).toBe('عمرو عبد الحميد');
  });

  it('returns a populated public novel list', async () => {
    const rows = await listNovels(3);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => typeof row.slug === 'string')).toBe(true);
  });

  it('filters novels by author and genre from the database', async () => {
    const rows = await searchNovels({ authorSlug: 'amr-abdel-hamid', genreSlug: 'fantasy', sort: 'rating' });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.authorSlug === 'amr-abdel-hamid')).toBe(true);
  });

  it('requires authentication for reading-list persistence', async () => {
    const caller = appRouter.createCaller(anonymousContext);
    await expect(caller.readingList.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
