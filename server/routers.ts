import { getVisitorAnalytics, trackPageView, trackAnalyticsEvent } from './analytics';
import { getRelatedForNovel } from './related';
import { z } from 'zod';
import { COOKIE_NAME } from '@shared/const';
import { getSessionCookieOptions } from './_core/cookies';
import { systemRouter } from './_core/systemRouter';
import { adminProcedure, protectedProcedure, publicProcedure, router } from './_core/trpc';
import { addToReadingList, createAuthor, createGenre, createNovel, deleteAuthor, deleteGenre, deleteNovel, getAdminSummary, getContentStats, getAuthorBySlug, getGenreBySlug, getMyRating, getNovelBySlug, getReadingList, getSearchFacets, getSeriesBySlug, listAdminAuthors, listAdminGenres, listAdminNovels, listAuthors, listGenres, listNovels, listSeries, listUsers, removeFromReadingList, searchNovels, setRating, updateAuthor, updateGenre, updateNovel, updateReadingStatus, updateUserRole, resolveCoverUrl } from './db';
import { getEnhancedAdminSummary } from './adminSummary';
import { commerceRouter } from './routers/commerce';
import { confirmSupabaseUserEmail, listSupabaseUsers, toManagedUser, updateSupabaseUserRole } from './_core/supabaseAdmin';
import { uploadNovelCover } from './cloudinary';
import { audit, createAd, createNotification, deleteAd, getAdminReports, listActiveAds, listAds, listAuditLogs, listMessagesForUser, listNotifications, listTrash, markNotificationRead, purgeTrash, recordAdEvent, restoreTrash, sendAdminMessage, updateAd } from './management';
import { createQuote, createQuoteImport, deleteDuplicateQuotes, deleteQuote, existingQuoteTexts, findDuplicateQuotes, getQuote, getQuoteNeighbors, improveQuote, isQuoteSaved, listSavedQuotes, listQuoteAuthors, listQuoteBooks, listQuoteCategories, listQuoteImports, listQuotes, listQuotesByAuthor, listQuotesByBook, listQuotesByCategory, matchEntity, previewQuotesFromUrl, removeExistingSimilarQuotes, saveQuote, scanTelegramChannel, unsaveQuote, updateQuote } from './quotes';
import { countQuotes } from './quoteCount';
import { getMyReview, listNovelReviews, listPendingReviews, moderateReview, upsertReview } from './reviews';
import { createArticle, deleteArticle, getAdminArticle, getPublishedArticleBySlug, listAdminArticles, listPublishedArticles, publishArticle, unpublishArticle, updateArticle } from './articles';

const novelSlugInput = z.object({ slug: z.string().min(1).max(160) });
const ratingInput = z.object({ slug: z.string().min(1).max(160), rating: z.number().int().min(1).max(5) });
const authorFields = z.object({ slug: z.string().min(1).max(160), name: z.string().min(1).max(255), bio: z.string().max(5000).optional(), avatarUrl: z.string().url().max(500).optional(), bookCount: z.number().int().min(0).optional() });
const genreFields = z.object({ slug: z.string().min(1).max(120), name: z.string().min(1).max(120), description: z.string().max(2000).optional(), icon: z.string().max(20).optional() });
const novelLinkFields = z.object({ label: z.string().min(1).max(80), url: z.string().url().max(2000), type: z.enum(['read', 'download']) });
const novelFields = z.object({ slug: z.string().min(1).max(160), title: z.string().min(1).max(255), authorId: z.number().int().positive(), coverUrl: z.string().url().max(500).optional(), description: z.string().max(10000).optional(), rightsNote: z.string().max(2000).optional(), parts: z.number().int().min(1).max(100).optional(), status: z.enum(['standalone', 'completed', 'ongoing']).optional(), publicationYear: z.number().int().min(0).max(3000).optional(), language: z.string().max(32).optional(), genreIds: z.array(z.number().int().positive()).max(30).optional(), links: z.array(novelLinkFields).max(20).optional() });
const coverUploadInput = z.object({ filename: z.string().min(1).max(160), dataUrl: z.string().regex(/^data:image\/(png|jpe?g|webp|gif);base64,/i).max(15_000_000) });

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
  analytics: router({
    trackPageView: publicProcedure
      .input(z.object({
        visitorId: z.string().min(8).max(64),
        pagePath: z.string().min(1).max(300),
        pageType: z.string().max(40).optional(),
        entitySlug: z.string().max(200).optional().nullable(),
        userId: z.number().int().positive().optional().nullable(),
        referrer: z.string().max(400).optional().nullable(),
        siteHost: z.string().max(120).optional().nullable(),
        deviceType: z.string().max(20).optional().nullable(),
      }))
      .mutation(({ input }) => trackPageView(input)),
    trackEvent: publicProcedure
      .input(z.object({
        visitorId: z.string().min(8).max(64),
        eventType: z.string().min(2).max(40),
        pagePath: z.string().max(300).optional().nullable(),
        meta: z.string().max(300).optional().nullable(),
        userId: z.number().int().positive().optional().nullable(),
      }))
      .mutation(({ input }) => trackAnalyticsEvent(input)),
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
    related: publicProcedure.input(novelSlugInput).query(({ input }) => getRelatedForNovel(input.slug)),
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
  articles: router({
    list: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(24).optional(), offset: z.number().int().min(0).default(0).optional() }).optional()).query(({ input }) => listPublishedArticles(input?.limit ?? 24, input?.offset ?? 0)),
    bySlug: publicProcedure.input(z.object({ slug: z.string().min(1).max(200) })).query(({ input }) => getPublishedArticleBySlug(input.slug)),
  }),
  reviews: router({
    list: publicProcedure.input(z.object({ slug: z.string().min(1).max(160), limit: z.number().int().min(1).max(100).default(30).optional() })).query(({ input }) => listNovelReviews(input.slug, input.limit ?? 30)),
    mine: protectedProcedure.input(z.object({ slug: z.string().min(1).max(160) })).query(({ ctx, input }) => getMyReview(ctx.user.id, input.slug)),
    upsert: protectedProcedure.input(z.object({ slug: z.string().min(1).max(160), body: z.string().min(20).max(4000), rating: z.number().int().min(1).max(5).optional() })).mutation(({ ctx, input }) => upsertReview(ctx.user.id, input.slug, { body: input.body, rating: input.rating })),
    pending: adminProcedure.query(() => listPendingReviews()),
    moderate: adminProcedure.input(z.object({ id: z.number().int().positive(), status: z.enum(['published', 'pending', 'hidden']) })).mutation(({ input }) => moderateReview(input.id, input.status)),
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
    articles: router({
      list: adminProcedure.query(() => listAdminArticles()),
      get: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getAdminArticle(input.id)),
      create: adminProcedure.input(z.object({
        slug: z.string().min(1).max(200),
        title: z.string().min(3).max(300),
        excerpt: z.string().max(2000).optional().nullable(),
        content: z.string().min(20).max(200000),
        coverUrl: z.string().max(800).optional().nullable(),
        status: z.enum(['draft', 'published', 'archived']).optional(),
        authorName: z.string().max(160).optional().nullable(),
        seoTitle: z.string().max(300).optional().nullable(),
        seoDescription: z.string().max(500).optional().nullable(),
        tags: z.string().max(500).optional().nullable(),
      })).mutation(({ ctx, input }) => createArticle(input, ctx.user.id)),
      update: adminProcedure.input(z.object({
        id: z.number().int().positive(),
        data: z.object({
          slug: z.string().min(1).max(200).optional(),
          title: z.string().min(3).max(300).optional(),
          excerpt: z.string().max(2000).optional().nullable(),
          content: z.string().min(20).max(200000).optional(),
          coverUrl: z.string().max(800).optional().nullable(),
          status: z.enum(['draft', 'published', 'archived']).optional(),
          authorName: z.string().max(160).optional().nullable(),
          seoTitle: z.string().max(300).optional().nullable(),
          seoDescription: z.string().max(500).optional().nullable(),
          tags: z.string().max(500).optional().nullable(),
        }),
      })).mutation(({ input }) => updateArticle(input.id, input.data)),
      publish: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => publishArticle(input.id)),
      unpublish: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => unpublishArticle(input.id)),
      delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteArticle(input.id)),
    }),
    summary: adminProcedure.query(() => getEnhancedAdminSummary()),
    visitors: adminProcedure
      .input(z.object({ range: z.enum(['today', 'week', 'month', 'quarter']).default('today') }).optional())
      .query(({ input }) => getVisitorAnalytics(input?.range ?? 'today')),
    reports: adminProcedure.query(async () => {
      const [reports, content] = await Promise.all([
        getAdminReports().catch(() => ({ summary: { impressions: 0, clicks: 0, campaigns: 0, published: 0 }, activity: [], daily: [], topActors: [] })),
        getContentStats().catch(() => null),
      ]);
      return { ...reports, content };
    }),
    novels: router({
      list: adminProcedure.query(() => listAdminNovels()),
      create: adminProcedure.input(novelFields).mutation(({ input }) => createNovel(input)),
      update: adminProcedure.input(z.object({ id: z.number().int().positive(), data: novelFields.partial() })).mutation(({ input }) => updateNovel(input.id, input.data)),
      delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteNovel(input.id)),
      uploadCover: adminProcedure.input(coverUploadInput).mutation(({ input }) => uploadNovelCover(input.dataUrl, input.filename)),
      resolveCover: adminProcedure.input(z.object({ url: z.string().url() })).mutation(({ input }) => resolveCoverUrl(input.url)),
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
    audit: router({ list: adminProcedure.query(() => listAuditLogs()) }),
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
  quotes: router({
    list: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(12), offset: z.number().int().min(0).default(0) }).optional()).query(async ({ input }) => {
      const limit = input?.limit ?? 12;
      const offset = input?.offset ?? 0;
      const [items, total] = await Promise.all([listQuotes(true, limit, offset), countQuotes(true)]);
      return { items, total, limit, offset, page: Math.floor(offset / limit) + 1, totalPages: Math.max(1, Math.ceil(total / limit)) };
    }),
    count: publicProcedure.query(() => countQuotes(true)),
    byId: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getQuote(input.id)),
    neighbors: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) => getQuoteNeighbors(input.id)),
    byAuthor: publicProcedure.input(z.object({ slug: z.string().min(1).max(160) })).query(({ input }) => listQuotesByAuthor(input.slug)),
    byBook: publicProcedure.input(z.object({ slug: z.string().min(1).max(160) })).query(({ input }) => listQuotesByBook(input.slug)),
    byCategory: publicProcedure.input(z.object({ category: z.string().min(1).max(80) })).query(({ input }) => listQuotesByCategory(input.category)),
    categories: publicProcedure.query(() => listQuoteCategories()),
    saved: protectedProcedure.query(({ ctx }) => listSavedQuotes(ctx.user.id)),
    savedState: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) => isQuoteSaved(ctx.user.id, input.id)),
    save: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (!await getQuote(input.id)) throw new Error('Quote not found'); return saveQuote(ctx.user.id, input.id); }),
    unsave: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => unsaveQuote(ctx.user.id, input.id)),
  }),
  adminQuotes: router({
    list: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(30), offset: z.number().int().min(0).default(0), q: z.string().max(200).optional() }).optional()).query(async ({ input }) => {
      const limit = input?.limit ?? 30;
      const offset = input?.offset ?? 0;
      const q = input?.q?.trim() || undefined;
      const [items, total] = await Promise.all([listQuotes(false, limit, offset, q), countQuotes(false, q)]);
      return { items, total, limit, offset };
    }),
    create: adminProcedure.input(z.object({ quote_text: z.string().min(3).max(2000), speaker: z.string().max(255).nullable().optional(), book_title: z.string().max(255).nullable().optional(), novel_id: z.number().int().positive().nullable().optional(), category: z.string().max(80).nullable().optional() })).mutation(({ input }) => createQuote({ ...input, speaker: input.speaker ?? null, book_title: input.book_title ?? null, novel_id: input.novel_id ?? null, category: input.category ?? null, status: 'published' })),
    update: adminProcedure.input(z.object({ id: z.number().int().positive(), data: z.object({ quote_text: z.string().min(3).max(2000).optional(), speaker: z.string().max(255).nullable().optional(), book_title: z.string().max(255).nullable().optional(), novel_id: z.number().int().positive().nullable().optional(), category: z.string().max(80).nullable().optional() }) })).mutation(({ input }) => updateQuote(input.id, { ...input.data, status: 'published' })),
    delete: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteQuote(input.id)),
    improve: adminProcedure.input(z.object({ quote: z.string().min(3).max(2000), speaker: z.string().max(255).optional(), book: z.string().max(255).optional() })).mutation(({ input }) => improveQuote(input)),
    scanTelegram: adminProcedure.input(z.object({ url: z.string().url().max(2000), maxPages: z.number().int().min(1).max(10).default(1) })).mutation(({ input }) => scanTelegramChannel(input)),
    duplicatePreview: adminProcedure.input(z.object({ threshold: z.number().min(0.9).max(1).default(0.95) })).query(({ input }) => findDuplicateQuotes(input.threshold)),
    deleteDuplicates: adminProcedure.input(z.object({ ids: z.array(z.number().int().positive()).min(1).max(500) })).mutation(({ input }) => deleteDuplicateQuotes(input.ids)),
    previewImport: adminProcedure.input(z.object({ url: z.string().url().max(2000), author: z.string().max(255).optional(), book: z.string().max(255).optional(), instructions: z.string().max(2000).optional(), useAi: z.boolean().default(true), language: z.enum(['ar', 'en', 'both']).default('both') })).mutation(async ({ input }) => {
      const [result, authors, books] = await Promise.all([previewQuotesFromUrl(input), listQuoteAuthors(), listQuoteBooks()]);
      const authorMatch = matchEntity(result.author, authors);
      const bookMatch = matchEntity(result.book, books);
      return { ...result, authorMatch: authorMatch ? { name: authorMatch.name, slug: authorMatch.slug } : null, bookMatch: bookMatch ? { title: bookMatch.title, slug: bookMatch.slug } : null };
    }),
    imports: adminProcedure.query(() => listQuoteImports()),
    bulkCreate: adminProcedure.input(z.object({ sourceUrl: z.string().url().max(2000), author: z.string().max(255).optional(), book: z.string().max(255).optional(), instructions: z.string().max(2000).optional(), quotes: z.array(z.object({ quote_text: z.string().min(3).max(2000), speaker: z.string().max(255).nullable().optional(), book_title: z.string().max(255).nullable().optional(), category: z.string().max(80).nullable().optional(), source_url: z.string().url().max(2000).optional() })).min(1).max(200) })).mutation(async ({ input }) => {
      const [authors, books] = await Promise.all([listQuoteAuthors(), listQuoteBooks()]);
      const matchedAuthor = matchEntity(input.author, authors);
      const matchedBook = matchEntity(input.book, books);
      const existing = await existingQuoteTexts();
      const filtered = removeExistingSimilarQuotes(input.quotes.map((q) => q.quote_text), existing);
      const fresh = input.quotes.filter((q) => filtered.unique.includes(q.quote_text));
      const importRow = await createQuoteImport({ sourceUrl: input.sourceUrl, author: input.author, book: input.book, instructions: input.instructions, count: fresh.length });
      for (const [index, quote] of fresh.entries()) {
        await createQuote({ quote_text: quote.quote_text, speaker: quote.speaker ?? input.author ?? null, book_title: quote.book_title ?? input.book ?? null, category: quote.category ?? null, status: 'published', source_url: quote.source_url ?? input.sourceUrl, import_id: importRow.id, position: index + 1 });
      }
      return { count: fresh.length, skippedDuplicates: input.quotes.length - fresh.length + filtered.duplicateCount, importId: importRow.id, authorMatched: Boolean(matchedAuthor), bookMatched: Boolean(matchedBook), authorSlug: matchedAuthor?.slug ?? null, bookSlug: matchedBook?.slug ?? null };
    }),
  }),
});

export type AppRouter = typeof appRouter;
