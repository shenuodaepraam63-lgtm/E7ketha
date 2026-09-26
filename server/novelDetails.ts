import { ENV } from './_core/env';

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
  wordCount: number;
  createdAt?: string;
  updatedAt?: string;
};

export type NovelDetailsInput = Omit<NovelDetails, 'novelId' | 'wordCount' | 'createdAt' | 'updatedAt'>;

function countArabicWords(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .split(/\\s+/)
    .filter(Boolean)
    .length;
}

function countDetailsWords(input: NovelDetailsInput) {
  return Object.values(input)
    .filter((value): value is string => typeof value === 'string')
    .reduce((total, value) => total + countArabicWords(value), 0);
}

async function request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown) {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) {
    throw new Error('Supabase admin REST is not configured');
  }

  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: ENV.supabaseSecretKey,
      Authorization: `Bearer ${ENV.supabaseSecretKey}`,
      'Content-Type': 'application/json',
      Prefer: method === 'GET' ? 'return=representation' : 'return=representation,resolution=merge-duplicates',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Supabase REST ${response.status}: ${await response.text()}`);
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : []) as T;
}

export async function getNovelDetails(novelId: number) {
  const rows = await request<NovelDetails[]>(
    'GET',
    `novelDetails?select=*&novelId=eq.${novelId}&limit=1`,
  );
  return rows[0] ?? null;
}

export async function upsertNovelDetails(novelId: number, input: NovelDetailsInput) {
  const wordCount = countDetailsWords(input);
  const rows = await request<NovelDetails[]>(
    'POST',
    'novelDetails',
    {
      novelId,
      ...input,
      wordCount,
      updatedAt: new Date().toISOString(),
    },
  );
  return rows[0] ?? null;
}
