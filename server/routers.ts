import { z } from 'zod';
import { COOKIE_NAME } from '@shared/const';
import { getSessionCookieOptions } from './_core/cookies';
import { systemRouter } from './_core/systemRouter';
import { adminProcedure, protectedProcedure, publicProcedure, router } from './_core/trpc';
import { addToReadingList, createAuthor, createGenre, createNovel, deleteAuthor, deleteGenre, deleteNovel, getAdminSummary, getAuthorBySlug, getGenreBySlug, getMyRating, getNovelBySlug, getReadingList, getSearchFacets, getSeriesBySlug, listAdminAuthors, listAdminGenres, listAdminNovels, listAuthors, listGenres, listNovels, listSeries, listUsers, removeFromReadingList, searchNovels, setRating, updateAuthor, updateGenre, updateNovel, updateReadingStatus, updateUserRole } from './db';
import { commerceRouter } from './routers/commerce';
import { confirmSupabaseUserEmail, listSupabaseUsers, toManagedUser, updateSupabaseUserRole } from './_core/supabaseAdmin';
import { uploadNovelCover } from './cloudinary';
import { audit, createAd, createNotification, deleteAd, getAdminReports, listActiveAds, listAds, listAuditLogs, listMessagesForUser, listNotifications, listTrash, markNotificationRead, purgeTrash, recordAdEvent, restoreTrash, sendAdminMessage, updateAd } from './management';
import { analyzeNovelImport, discoverSeriesLinks, saveNovelImport } from './aiNovelImporter';

const novelSlugInput = z.object({ slug: z.string().min(1).max(160) });
const ratingInput = z.object({ slug: z.string().min(1).max(160), rating: z.number().int().min(1).max(5) });
const authorFields = z.object({ slug: z.string().min(1).max(160), name: z.string().min(1).max(255), bio: z.string().max(5000).optional(), avatarUrl: z.string().url().max(500).optional(), bookCount: z.number().int().min(0).optional() });
const genreFields = z.object({ slug: z.string().min(1).max(120), name: z.string().min(1).max(120), description: z.string().max(2000).optional(), icon: z.string().max(20).optional() });
const importLinkInput = z.object({ label: z.string().max(120), url: z.string().url().max(1000), type: z.enum(['read', 'download']) });
const novelFields = z.object({ slug: z.string().min(1).max(160), title: z.string().min(1).max(255), authorId: z.number().int().positive(), coverUrl: z.string().url().max(500).optional(), description: z.string().max(10000).optional(), parts: z.number().int().min(1).max(100).optional(), status: z.enum(['standalone', 'completed', 'ongoing']).optional(), publicationYear: z.number().int().min(0).max(3000).optional(), language: z.string().max(32).optional(), genreIds: z.array(z.number().int().positive()).max(30).optional(), links: z.array(importLinkInput.extend({ displayOrder: z.number().int().min(0).optional() })).max(30).optional() });
const coverUploadInput = z.object({ filename: z.string().min(1).max(160), dataUrl: z.string().regex(/^data:image\/(png|jpe?g|webp|gif);base64,/i).max(15_000_000) });
const importInput = z.object({ title: z.string().min(1).max(255), notes: z.string().max(5000).optional(), links: z.array(importLinkInput).max(20) });
const importBookInput = z.object({ title: z.string().min(1).max(255), slug: z.string().min(1).max(160), order: z.number().int().positive(), description: z.string().max(10000).optional(), publicationYear: z.number().int().min(0).max(3000).nullable().optional(), coverUrl: z.string().url().nullable().optional(), links: z.array(importLinkInput).max(20) });
const importDraftInput = z.object({ title: z.string().min(1).max(255), slug: z.string().min(1).max(160), description: z.string().max(10000), publicationYear: z.number().int().min(0).max(3000).nullable().optional(), language: z.string().max(32), status: z.enum(['standalone', 'completed', 'ongoing']), genres: z.array(z.string().max(120)).max(8), author: z.object({ name: z.string().min(1).max(255), slug: z.string().min(1).max(160), bio: z.string().max(5000), bookCount: z.number().int().min(0) }), series: z.object({ title: z.string(), slug: z.string(), description: z.string(), status: z.enum(['completed', 'ongoing']) }).nullable().optional(), books: z.array(importBookInput).min(1).max(30), links: z.array(importLinkInput).max(20) });

export const appRouter = router({
  system: systemRouter,
  commerce: commerceRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    loginEvent: protectedProcedure.mutation(({ ctx }) => audit(ctx.user, 'auth.login', 'user', ctx.user.openId, undefined, ctx.req).then(() => ({ success: true }))),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  novels: router({
    list: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional()).query(({ input }) => listNovels(input?.limit ?? 50)),
    search: publicProcedure.input(z.object({
      q: z.string().max(160).optional(),
      genreSlug: z.string().max(120).optional(),
      authorSlug: z.string().max(160).optional(),
      status: z.enum(['standalone', 'completed', 'ongoing']).optional(),
      minRating: z.number().min(0).max(5).optional(),
      sort: z.enum(['popular', 'rating', 'newest', 'title']).default('popular'),
      limit: z.number().int().min(1).max(100).default(50),
    })).query(({ input }) => searchNovels(input)),
    facets: publicProcedure.query(() => getSearchFacets()),
    bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getNovelBySlug(input.slug)),
  }),
  authors: router({ list: publicProcedure.query(() => listAuthors()), bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getAuthorBySlug(input.slug)) }),
  genres: router({ list: publicProcedure.query(() => listGenres()), bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getGenreBySlug(input.slug)) }),
  series: router({ list: publicProcedure.query(() => listSeries()), bySlug: publicProcedure.input(novelSlugInput).query(({ input }) => getSeriesBySlug(input.slug)) }),
  readingList: router({
    list: protectedProcedure.query(({ ctx }) => getReadingList(ctx.user.id)),
    add: protectedProcedure.input(novelSlugInput.extend({ status: z.enum(['want_to_read', 'reading', 'finished']).default('want_to_read') })).mutation(async ({ ctx, input }) => {
      const novel = await getNovelBySlug(input.slug);
      if (!novel) throw new Error('Novel not found');
      return addToReadingList(ctx.user.id, novel.id, input.status);
    }),
    remove: protectedProcedure.input(novelSlugInput).mutation(async ({ ctx, input }) => {
      const novel = await getNovelBySlug(input.slug);
      if (!novel) throw new Error('Novel not found');
      return removeFromReadingList(ctx.user.id, novel.id);
    }),
    updateStatus: protectedProcedure.input(novelSlugInput.extend({ status: z.enum(['want_to_read', 'reading', 'finished']) })).mutation(async ({ ctx, input }) => {
      const novel = await getNovelBySlug(input.slug);
      if (!novel) throw new Error('Novel not found');
      return updateReadingStatus(ctx.user.id, novel.id, input.status);
    }),
  }),
  ratings: router({
    mine: protectedProcedure.input(novelSlugInput).query(async ({ ctx, input }) => {
      const novel = await getNovelBySlug(input.slug);
      if (!novel) return null;
      return getMyRating(ctx.user.id, novel.id);
    }),
    set: protectedProcedure.input(ratingInput).mutation(async ({ ctx, input }) => {
      const novel = await getNovelBySlug(input.slug);
      if (!novel) throw new Error('Novel not found');
      return setRating(ctx.user.id, novel.id, input.rating);
    }),
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => listNotifications(ctx.user.openId, ctx.user.role)),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => markNotificationRead(input.id, ctx.user.openId)),
  }),
  messages: router({
    list: protectedProcedure.query(({ ctx }) => listMessagesForUser(ctx.user.openId, ctx.user.role === 'admin')),
  }),
  ads: router({
    active: publicProcedure.input(z.object({ placement: z.string().max(80).default('home') })).query(({ input }) => listActiveAds(input.placement)),
    event: publicProcedure.input(z.object({ id: z.number().int().positive(), event: z.enum(['impression', 'click']) })).mutation(({ input }) => recordAdEvent(input.id, input.event)),
  }),
  admin: router({
    summary: adminProcedure.query(() => getAdminSummary()),
    reports: adminProcedure.query(() => getAdminReports()),
    novels: router({
      list: adminProcedure.query(() => listAdminNovels()),
      create: adminProcedure.input(novelFields).mutation(async ({ ctx, input }) => { const row = await createNovel(input); await audit(ctx.user, 'novel.create', 'novel', String(row.id), { title: row.title, links: input.links?.length ?? 0 }, ctx.req); return row; }),
      update: adminProcedure.input(z.object({ id: z.number().int().positive(), data: novelFields.partial() })).mutation(async ({ ctx, input }) => { const row = await updateNovel(input.id, input.data); if (row) await audit(ctx.user, 'novel.update', 'novel', String(row.id), { title: row.title, links: input.data.links?.length, fields: Object.keys(input.data) }, ctx.req); return row; }),
      delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const result = await deleteNovel(input.id); await audit(ctx.user, 'novel.delete', 'novel', String(input.id), undefined, ctx.req); return result; }),
      uploadCover: adminProcedure.input(coverUploadInput).mutation(async ({ ctx, input }) => { const result = await uploadNovelCover(input.dataUrl, input.filename); await audit(ctx.user, 'novel.cover.upload', 'novel-cover', undefined, { filename: input.filename }, ctx.req); return result; }),
    }),
    aiImport: router({
      analyze: adminProcedure.input(importInput).mutation(({ input }) => analyzeNovelImport(input)),
      save: adminProcedure.input(importDraftInput).mutation(async ({ ctx, input }) => { const result = await saveNovelImport(input); await audit(ctx.user, 'novel.import.save', 'novel-import', undefined, { title: input.title, books: result.books.length, links: result.books.reduce((sum, book) => sum + book.links, 0) }, ctx.req); return result; }),
      discoverLinks: adminProcedure.input(z.object({ title: z.string().min(1).max(255), seriesTitle: z.string().max(255).optional(), books: z.array(z.object({ title: z.string().min(1).max(255), slug: z.string().min(1).max(160), order: z.number().int().positive() })).min(1).max(30), existingLinks: z.array(importLinkInput).max(30).default([]) })).mutation(({ input }) => discoverSeriesLinks(input)),
    }),
    authors: router({
      list: adminProcedure.query(() => listAdminAuthors()),
      create: adminProcedure.input(authorFields).mutation(({ input }) => createAuthor(input)),
      update: adminProcedure.input(z.object({ id: z.number().int().positive(), data: authorFields.partial() })).mutation(({ input }) => updateAuthor(input.id, input.data)),
      delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteAuthor(input.id)),
    }),
    genres: router({
      list: adminProcedure.query(() => listAdminGenres()),
      create: adminProcedure.input(genreFields).mutation(({ input }) => createGenre(input)),
      update: adminProcedure.input(z.object({ id: z.number().int().positive(), data: genreFields.partial() })).mutation(({ input }) => updateGenre(input.id, input.data)),
      delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteGenre(input.id)),
    }),
    users: router({
      list: adminProcedure.query(async () => {
        const [remoteUsers, localUsers] = await Promise.all([listSupabaseUsers(), listUsers()]);
        const roles = new Map(localUsers.map((item) => [item.openId, item.role]));
        return remoteUsers.map((user) => toManagedUser(user, roles.get(`supabase:${user.id}`)));
      }),
      updateRole: adminProcedure.input(z.object({ id: z.string().uuid(), role: z.enum(['user', 'admin']) })).mutation(async ({ ctx, input }) => {
        if (ctx.user.openId === `supabase:${input.id}` && input.role !== 'admin') throw new Error('لا يمكنك إلغاء صلاحية حسابك الحالي.');
        const remote = await updateSupabaseUserRole(input.id, input.role);
        await updateUserRole(`supabase:${input.id}`, input.role);
        await audit(ctx.user, 'user.role.update', 'user', input.id, { role: input.role }, ctx.req);
        return toManagedUser(remote, input.role);
      }),
      confirmEmail: adminProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ input }) => {
        const remote = await confirmSupabaseUserEmail(input.id);
        return toManagedUser(remote);
      }),
    }),
    audit: router({
      list: adminProcedure.query(() => listAuditLogs()),
    }),
    trash: router({
      list: adminProcedure.query(() => listTrash()),
      restore: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => restoreTrash(input.id, ctx.user)),
      purge: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => purgeTrash(input.id, ctx.user)),
    }),
    notifications: router({
      send: adminProcedure.input(z.object({ recipientType: z.enum(['user', 'role', 'all']), recipientOpenId: z.string().optional(), recipientRole: z.string().optional(), title: z.string().min(1).max(255), body: z.string().min(1).max(5000), linkUrl: z.string().url().optional(), category: z.enum(['new_novel', 'update', 'offer', 'general']).default('general'), color: z.string().regex(/^#[0-9a-f]{6}$/i).default('#675de8'), priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'), scheduledAt: z.string().datetime().optional() })).mutation(({ ctx, input }) => createNotification(input, ctx.user)),
    }),
    messages: router({
      send: adminProcedure.input(z.object({ recipientType: z.enum(['users', 'employees', 'user']), recipientOpenId: z.string().optional(), subject: z.string().min(1).max(255), body: z.string().min(1).max(10000) })).mutation(({ ctx, input }) => sendAdminMessage(input, ctx.user)),
    }),
    ads: router({
      list: adminProcedure.query(() => listAds()),
      create: adminProcedure.input(z.object({ title: z.string().min(1).max(255), body: z.string().max(5000).optional(), imageUrl: z.string().url().optional(), linkUrl: z.string().url().optional(), placement: z.string().min(1).max(80), status: z.enum(['draft', 'published', 'paused']), startAt: z.string().optional(), endAt: z.string().optional() })).mutation(({ ctx, input }) => createAd(input, ctx.user)),
      update: adminProcedure.input(z.object({ id: z.number().int().positive(), data: z.object({ title: z.string().min(1).max(255).optional(), body: z.string().max(5000).optional(), imageUrl: z.string().url().optional(), linkUrl: z.string().url().optional(), placement: z.string().max(80).optional(), status: z.enum(['draft', 'published', 'paused']).optional(), startAt: z.string().optional(), endAt: z.string().optional() }) })).mutation(({ ctx, input }) => updateAd(input.id, input.data, ctx.user)),
      delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteAd(input.id, ctx.user)),
    }),
  }),
});

export type AppRouter = typeof appRouter;
