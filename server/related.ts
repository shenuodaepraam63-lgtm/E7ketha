/**
 * Internal linking engine — related novels, authors, articles for a novel page.
 * Uses Supabase REST only (Vercel-safe). No AI.
 */
import { ENV } from './_core/env';
import { getNovelBySlug } from './db';
import { listPublishedArticles } from './articles';

type NovelLite = {
  id: number;
  slug: string;
  title: string;
  coverUrl: string | null;
  description: string | null;
  rating: number;
  ratingCount: number;
  parts: number;
  status: string;
  authorId: number;
  author: string;
  authorSlug: string;
  score: number;
  reasons: string[];
};

type AuthorLite = {
  id: number;
  slug: string;
  name: string;
  avatarUrl: string | null;
  bookCount: number;
  reason: string;
};

type ArticleLite = {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  reason: string;
};

async function rest<T>(path: string): Promise<T> {
  if (!ENV.supabaseUrl || !(ENV.supabaseSecretKey || ENV.supabasePublishableKey)) return [] as unknown as T;
  const key = ENV.supabaseSecretKey || ENV.supabasePublishableKey!;
  try {
    const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return [] as unknown as T;
    return (await response.json()) as T;
  } catch {
    return [] as unknown as T;
  }
}

function safeIlike(s: string) {
  return s.replace(/[%*,()]/g, ' ').trim().slice(0, 60);
}

export async function getRelatedForNovel(slug: string) {
  const novel = await getNovelBySlug(slug);
  if (!novel) {
    return { similarNovels: [] as NovelLite[], relatedAuthors: [] as AuthorLite[], relatedArticles: [] as ArticleLite[] };
  }

  const novelId = Number(novel.id);
  const authorId = Number((novel as { authorId?: number }).authorId ?? 0);
  const authorName = String(novel.author ?? '');
  const authorSlug = String(novel.authorSlug ?? '');

  const genreLinks = await rest<Array<{ genreId: number }>>(`novelGenres?select=genreId&novelId=eq.${novelId}`);
  const genreIds = [...new Set(genreLinks.map((g) => Number(g.genreId)).filter(Boolean))];

  let relatedNovelIds: number[] = [];
  if (genreIds.length) {
    const rows = await rest<Array<{ novelId: number }>>(`novelGenres?select=novelId&genreId=in.(${genreIds.join(',')})&limit=80`);
    relatedNovelIds = [...new Set(rows.map((r) => Number(r.novelId)).filter((id) => id && id !== novelId))];
  }

  let sameAuthorRows: Array<Record<string, unknown>> = [];
  if (authorId > 0) {
    sameAuthorRows = await rest(`novels?select=id,slug,title,coverUrl,description,rating,ratingCount,parts,status,authorId&authorId=eq.${authorId}&id=neq.${novelId}&order=rating.desc&limit=8`);
  }

  let genreMatched: Array<Record<string, unknown>> = [];
  if (relatedNovelIds.length) {
    const ids = relatedNovelIds.slice(0, 24).join(',');
    genreMatched = await rest(`novels?select=id,slug,title,coverUrl,description,rating,ratingCount,parts,status,authorId&id=in.(${ids})&limit=24`);
  }

  const allAuthorIds = [
    ...new Set(
      [...sameAuthorRows, ...genreMatched]
        .map((r) => Number(r.authorId))
        .filter((id) => id > 0 && id !== authorId),
    ),
  ];
  const authorsMap = new Map<number, { name: string; slug: string; avatarUrl: string | null; bookCount: number }>();
  if (authorId > 0) {
    authorsMap.set(authorId, { name: authorName, slug: authorSlug, avatarUrl: null, bookCount: 0 });
  }
  if (allAuthorIds.length) {
    const authors = await rest<Array<{ id: number; name: string; slug: string; avatarUrl: string | null; bookCount?: number }>>(
      `authors?select=id,name,slug,avatarUrl,bookCount&id=in.(${allAuthorIds.slice(0, 40).join(',')})`,
    );
    for (const a of authors) {
      authorsMap.set(a.id, { name: a.name, slug: a.slug, avatarUrl: a.avatarUrl, bookCount: a.bookCount ?? 0 });
    }
  }

  const scoreMap = new Map<number, NovelLite>();

  const ingest = (row: Record<string, unknown>, baseScore: number, reason: string) => {
    const id = Number(row.id);
    if (!id || id === novelId) return;
    const a = authorsMap.get(Number(row.authorId)) ?? { name: 'مؤلف', slug: '', avatarUrl: null, bookCount: 0 };
    const rating = Number(row.rating ?? 0) / 100;
    const ratingCount = Number(row.ratingCount ?? 0);
    const popularityBoost = Math.min(15, ratingCount);
    const ratingBoost = Math.min(20, rating * 4);
    const prev = scoreMap.get(id);
    const score = baseScore + popularityBoost + ratingBoost;
    if (!prev || score > prev.score) {
      scoreMap.set(id, {
        id,
        slug: String(row.slug),
        title: String(row.title),
        coverUrl: (row.coverUrl as string) ?? null,
        description: (row.description as string) ?? null,
        rating: Number(row.rating ?? 0),
        ratingCount,
        parts: Number(row.parts ?? 1),
        status: String(row.status ?? 'standalone'),
        authorId: Number(row.authorId),
        author: a.name,
        authorSlug: a.slug,
        score,
        reasons: prev ? [...new Set([...prev.reasons, reason])] : [reason],
      });
    } else {
      prev.score += Math.floor(baseScore / 2);
      if (!prev.reasons.includes(reason)) prev.reasons.push(reason);
    }
  };

  for (const row of sameAuthorRows) ingest(row, 50, 'نفس المؤلف');
  for (const row of genreMatched) ingest(row, 35, 'تصنيف مشابه');

  if (scoreMap.size < 4) {
    const popular = await rest<Array<Record<string, unknown>>>(
      `novels?select=id,slug,title,coverUrl,description,rating,ratingCount,parts,status,authorId&id=neq.${novelId}&order=ratingCount.desc.nullslast&limit=8`,
    );
    for (const row of popular) {
      const aid = Number(row.authorId);
      if (aid && !authorsMap.has(aid)) {
        const arows = await rest<Array<{ id: number; name: string; slug: string; avatarUrl: string | null; bookCount?: number }>>(
          `authors?select=id,name,slug,avatarUrl,bookCount&id=eq.${aid}&limit=1`,
        );
        if (arows[0]) {
          authorsMap.set(aid, {
            name: arows[0].name,
            slug: arows[0].slug,
            avatarUrl: arows[0].avatarUrl,
            bookCount: arows[0].bookCount ?? 0,
          });
        }
      }
      ingest(row, 10, 'شائع على المنصة');
    }
  }

  const similarNovels = [...scoreMap.values()].sort((a, b) => b.score - a.score).slice(0, 8);

  const authorScores = new Map<number, AuthorLite>();
  for (const n of similarNovels) {
    if (n.authorId === authorId || !n.authorId) continue;
    const a = authorsMap.get(n.authorId);
    if (!a?.slug) continue;
    if (!authorScores.has(n.authorId)) {
      authorScores.set(n.authorId, {
        id: n.authorId,
        slug: a.slug,
        name: a.name,
        avatarUrl: a.avatarUrl,
        bookCount: a.bookCount,
        reason: 'يظهر في روايات مشابهة',
      });
    }
  }
  if (authorScores.size < 3) {
    const topAuthors = await rest<Array<{ id: number; name: string; slug: string; avatarUrl: string | null; bookCount?: number }>>(
      `authors?select=id,name,slug,avatarUrl,bookCount&id=neq.${authorId || 0}&order=bookCount.desc.nullslast&limit=6`,
    );
    for (const a of topAuthors) {
      if (authorScores.has(a.id)) continue;
      authorScores.set(a.id, {
        id: a.id,
        slug: a.slug,
        name: a.name,
        avatarUrl: a.avatarUrl,
        bookCount: a.bookCount ?? 0,
        reason: 'مؤلف بارز على المنصة',
      });
    }
  }
  const relatedAuthors = [...authorScores.values()].slice(0, 6);

  const needles = [safeIlike(String(novel.title)), safeIlike(authorName)].filter((x) => x.length >= 2);
  let relatedArticles: ArticleLite[] = [];
  try {
    const published = await listPublishedArticles(40, 0);
    const scored = published
      .map((art) => {
        const blob = `${art.title} ${art.excerpt ?? ''} ${art.tags ?? ''} ${art.authorName ?? ''}`.toLowerCase();
        let score = 0;
        const reasons: string[] = [];
        for (const n of needles) {
          if (n && blob.includes(n.toLowerCase())) {
            score += 20;
            reasons.push('يذكر الرواية أو المؤلف');
          }
        }
        if (score === 0) return null;
        return {
          id: art.id,
          slug: art.slug,
          title: art.title,
          excerpt: art.excerpt,
          coverUrl: art.coverUrl,
          reason: reasons[0] ?? 'مقال ذو صلة',
          score,
        };
      })
      .filter(Boolean) as Array<ArticleLite & { score: number }>;
    relatedArticles = scored.sort((a, b) => b.score - a.score).slice(0, 4).map(({ score: _s, ...rest }) => rest);
  } catch {
    relatedArticles = [];
  }

  if (relatedArticles.length === 0) {
    try {
      const latest = await listPublishedArticles(4, 0);
      relatedArticles = latest.map((art) => ({
        id: art.id,
        slug: art.slug,
        title: art.title,
        excerpt: art.excerpt,
        coverUrl: art.coverUrl,
        reason: 'من مقالات المنصة',
      }));
    } catch {
      /* empty */
    }
  }

  return { similarNovels, relatedAuthors, relatedArticles };
}
