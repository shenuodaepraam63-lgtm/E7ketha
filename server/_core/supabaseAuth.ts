import { createClient } from '@supabase/supabase-js';
import type { User } from '../../drizzle/schema';
import { upsertUser, getUserByOpenId } from '../db';
import { ENV } from './env';

export async function authenticateSupabaseToken(token: string): Promise<User | null> {
  if (!ENV.supabaseUrl || !ENV.supabasePublishableKey) return null;
  const client = createClient(ENV.supabaseUrl, ENV.supabasePublishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  const authUser = data.user;
  const openId = `supabase:${authUser.id}`;
  const email = authUser.email ?? null;
  const adminEmails = new Set((ENV.supabaseAdminEmails ?? '').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean));
  const role = email && adminEmails.has(email.toLowerCase()) ? 'admin' as const : undefined;
  await upsertUser({ openId, name: authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? email?.split('@')[0] ?? null, email, loginMethod: 'supabase', role, lastSignedIn: new Date() });
  return (await getUserByOpenId(openId)) ?? null;
}
