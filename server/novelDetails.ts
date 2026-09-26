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

async function request<T>(path: string) {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) throw new Error('Supabase admin REST is not configured');
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: ENV.supabaseSecretKey,
      Authorization: `Bearer ${ENV.supabaseSecretKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Supabase REST ${response.status}: ${await response.text()}`);
  const text = await response.text();
  return (text ? JSON.parse(text) : []) as T;
}

export async function getNovelDetails(novelId: number) {
  const rows = await request<NovelDetails[]>(`novelDetails?select=*&novelId=eq.${novelId}&limit=1`);
  return rows[0] ?? null;
}
