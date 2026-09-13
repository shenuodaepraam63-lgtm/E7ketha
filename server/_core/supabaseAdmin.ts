import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { ENV } from './env';

let adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!ENV.supabaseUrl || !ENV.supabaseSecretKey) return null;
  adminClient ??= createClient(ENV.supabaseUrl, ENV.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export type ManagedUser = {
  id: string;
  email: string | null;
  name: string | null;
  role: 'user' | 'admin';
  emailConfirmed: boolean;
  disabled: boolean;
  createdAt: string;
  lastSignInAt: string | null;
};

export function toManagedUser(user: SupabaseUser, localRole?: 'user' | 'admin'): ManagedUser {
  return {
    id: user.id,
    email: user.email ?? null,
    name: (user.user_metadata?.full_name ?? user.user_metadata?.name ?? null) as string | null,
    role: localRole ?? ((user.user_metadata?.role === 'admin' ? 'admin' : 'user') as 'user' | 'admin'),
    emailConfirmed: Boolean(user.email_confirmed_at),
    disabled: user.banned_until === 'none' ? false : Boolean(user.banned_until),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

export async function listSupabaseUsers() {
  const client = getSupabaseAdmin();
  if (!client) throw new Error('Supabase admin key is not configured');
  const users: SupabaseUser[] = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }
  return users;
}

export async function updateSupabaseUserRole(id: string, role: 'user' | 'admin') {
  const client = getSupabaseAdmin();
  if (!client) throw new Error('Supabase admin key is not configured');
  const { data, error } = await client.auth.admin.getUserById(id);
  if (error || !data.user) throw error ?? new Error('User not found');
  const metadata = { ...data.user.user_metadata, role };
  const result = await client.auth.admin.updateUserById(id, { user_metadata: metadata });
  if (result.error || !result.data.user) throw result.error ?? new Error('Unable to update user role');
  return result.data.user;
}

export async function confirmSupabaseUserEmail(id: string) {
  const client = getSupabaseAdmin();
  if (!client) throw new Error('Supabase admin key is not configured');
  const result = await client.auth.admin.updateUserById(id, { email_confirm: true });
  if (result.error || !result.data.user) throw result.error ?? new Error('Unable to confirm email');
  return result.data.user;
}
