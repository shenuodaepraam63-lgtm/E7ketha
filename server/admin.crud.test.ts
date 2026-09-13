import { describe, expect, it } from 'vitest';
import { appRouter } from './routers';
import type { TrpcContext } from './_core/context';

const anonymousContext: TrpcContext = {
  user: null,
  req: { protocol: 'https', headers: {} } as TrpcContext['req'],
  res: {} as TrpcContext['res'],
};

const userContext: TrpcContext = {
  ...anonymousContext,
  user: { id: 99, openId: 'regular-user', name: 'Reader', email: 'reader@example.com', loginMethod: 'manus', role: 'user', createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
};

describe('admin content CRUD permissions', () => {
  it('rejects unauthenticated and regular users from listing admin content', async () => {
    const anonymous = appRouter.createCaller(anonymousContext);
    const regular = appRouter.createCaller(userContext);
    await expect(anonymous.admin.novels.list()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(regular.admin.authors.list()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(regular.admin.genres.create({ slug: 'blocked', name: 'Blocked' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
