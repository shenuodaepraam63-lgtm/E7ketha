import { ENV } from './_core/env';

export const NOVEL_DETAIL_FIELDS = [
  ['detailedSummary', 'ملخص تفصيلي'],
  ['spoilerFreeSummary', 'ملخص بدون حرق'],
  ['characters', 'الشخصيات'],
  ['themes', 'الأفكار والثيمات'],
  ['setting', 'المكان والزمان'],
  ['writingStyle', 'أسلوب الكاتب'],
  ['literaryAnalysis', 'مراجعة وتحليل أدبي'],
  ['whatMakesItDistinct', 'ما يميز الرواية'],
  ['recommendedFor', 'هل تناسبك؟'],
  ['notableDetails', 'تفاصيل جديرة بالملاحظة'],
  ['aboutAuthor', 'عن الكاتب وعلاقته بالعمل'],
  ['similarWorks', 'أعمال مشابهة'],
  ['seriesGuide', 'دليل القراءة / ترتيب الأجزاء'],
  ['faq', 'أسئلة شائعة'],
  ['whereToRead', 'أين تقرأها قانونيًا؟'],
  ['keywords', 'كلمات مفتاحية'],
] as const;

export type NovelDetailFieldKey = (typeof NOVEL_DETAIL_FIELDS)[number][0];

export type NovelDetails = {
  novelId: number;
  detailedSummary: string | null;
  spoilerFreeSummary: string | null;
  themes: string | null;
  characters: string | null;
  setting: string | null;
  writingStyle: string | null;
  literaryAnalysis: string | null;
  whatMakesItDistinct: string | null;
  recommendedFor: string | null;
  notableDetails: string | null;
  keywords: string | null;
  faq: string | null;
  whereToRead: string | null;
  similarWorks: string | null;
  seriesGuide: string | null;
  aboutAuthor: string | null;
  wordCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type NovelDetailsInput = Partial<Record<NovelDetailFieldKey, string | null | undefined>>;

function restKey() {
  if (!ENV.supabaseUrl || !(ENV.supabaseSecretKey || ENV.supabasePublishableKey)) {
    throw new Error('Supabase is not configured');
  }
  return ENV.supabaseSecretKey || ENV.supabasePublishableKey!;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const key = restKey();
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`novelDetails API ${response.status}: ${await response.text()}`);
  const text = await response.text();
  return (text ? JSON.parse(text) : []) as T;
}

function clean(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export function countWords(details: NovelDetailsInput | NovelDetails | null | undefined): number {
  if (!details) return 0;
  let n = 0;
  for (const [key] of NOVEL_DETAIL_FIELDS) {
    const v = (details as any)[key];
    if (typeof v === 'string' && v.trim()) n += v.trim().split(/\s+/).length;
  }
  return n;
}

export async function getNovelDetails(novelId: number): Promise<NovelDetails | null> {
  try {
    const rows = await request<NovelDetails[]>(`novelDetails?select=*&novelId=eq.${novelId}&limit=1`);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function upsertNovelDetails(novelId: number, input: NovelDetailsInput): Promise<NovelDetails | null> {
  const payload: Record<string, unknown> = {
    novelId,
    updatedAt: new Date().toISOString(),
  };
  for (const [key] of NOVEL_DETAIL_FIELDS) {
    if (key in input) payload[key] = clean(input[key]);
  }
  const existing = await getNovelDetails(novelId);
  const merged: NovelDetailsInput = { ...(existing ?? {}), ...input };
  payload.wordCount = countWords(merged);

  if (existing) {
    const rows = await request<NovelDetails[]>(`novelDetails?novelId=eq.${novelId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return rows[0] ?? existing;
  }

  payload.createdAt = new Date().toISOString();
  if (typeof payload.wordCount !== 'number') payload.wordCount = 0;

  try {
    const rows = await request<NovelDetails[]>('novelDetails', {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(payload),
    });
    return rows[0] ?? null;
  } catch {
    const rows = await request<NovelDetails[]>('novelDetails?on_conflict=novelId', {
      method: 'POST',
      headers: { Prefer: 'return=representation,resolution=merge-duplicates' },
      body: JSON.stringify(payload),
    });
    return rows[0] ?? null;
  }
}

export function detailsToPublicSections(details: NovelDetails | null | undefined) {
  if (!details) return [];
  return NOVEL_DETAIL_FIELDS.map(([key, label]) => {
    const value = (details as any)[key];
    if (typeof value !== 'string' || !value.trim()) return null;
    return { key, label, value: value.trim() };
  }).filter(Boolean) as Array<{ key: string; label: string; value: string }>;
}
