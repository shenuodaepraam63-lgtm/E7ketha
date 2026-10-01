import { ENV } from '../_core/env';
import type { TelegramUser } from './api';

async function rest<T>(pathAndQuery: string, init?: RequestInit): Promise<T> {
  if (!ENV.supabaseUrl || !(ENV.supabaseSecretKey || ENV.supabasePublishableKey)) {
    throw new Error('Supabase is not configured');
  }
  const key = ENV.supabaseSecretKey || ENV.supabasePublishableKey!;
  const res = await fetch(`${ENV.supabaseUrl}/rest/v1/${pathAndQuery}`, {
    ...init,
    signal: AbortSignal.timeout(10000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`telegram REST ${res.status}: ${body}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : []) as T;
}

async function restCount(table: string, filter = ''): Promise<number> {
  if (!ENV.supabaseUrl || !(ENV.supabaseSecretKey || ENV.supabasePublishableKey)) return 0;
  const key = ENV.supabaseSecretKey || ENV.supabasePublishableKey!;
  const q = filter ? `?${filter}` : '';
  const res = await fetch(`${ENV.supabaseUrl}/rest/v1/${table}${q}`, {
    method: 'HEAD',
    signal: AbortSignal.timeout(8000),
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  const cr = res.headers.get('content-range') || res.headers.get('Content-Range') || '';
  const m = cr.match(/\/(\d+)\s*$/);
  return m ? Number(m[1]) : 0;
}

export async function upsertTelegramUser(from: TelegramUser): Promise<void> {
  try {
    const payload = {
      telegram_id: from.id,
      username: from.username ?? null,
      first_name: from.first_name ?? null,
      last_name: from.last_name ?? null,
      is_active: true,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await rest('telegram_users?on_conflict=telegram_id', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[telegram] upsert user failed', err);
  }
}

export async function countTelegramUsers(): Promise<number> {
  try {
    return await restCount('telegram_users');
  } catch {
    return 0;
  }
}

export async function getPlatformStats(): Promise<{
  botUsers: number;
  novels: number;
  authors: number;
  genres: number;
  articles: number;
}> {
  const [botUsers, novels, authors, genres, articles] = await Promise.all([
    countTelegramUsers(),
    restCount('novels').catch(() => 0),
    restCount('authors').catch(() => 0),
    restCount('genres').catch(() => 0),
    restCount('articles').catch(() => 0),
  ]);
  return { botUsers, novels, authors, genres, articles };
}
