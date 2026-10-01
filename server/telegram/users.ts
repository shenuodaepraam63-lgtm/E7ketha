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
    throw new Error(`telegram_users REST ${res.status}: ${body}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : []) as T;
}

/** Upsert Telegram identity; does not require linked E7ketha account. */
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
