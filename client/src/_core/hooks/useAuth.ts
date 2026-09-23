import { useCallback, useEffect, useState } from 'react';
import { getSupabase, hasAuthHint, supabaseConfigured } from '@/lib/supabase';

export type AuthUser = {
  id: string;
  email?: string | null;
  /** Display name from signup metadata or email local-part */
  name?: string | null;
};

type AuthSession = { user: AuthUser; access_token?: string } | null;

function mapAuthUser(raw: any): AuthUser | null {
  if (!raw?.id) return null;
  const meta = (raw.user_metadata ?? {}) as Record<string, unknown>;
  const fromMeta =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (typeof meta.display_name === 'string' && meta.display_name.trim()) ||
    '';
  const fromEmail = typeof raw.email === 'string' && raw.email.includes('@')
    ? raw.email.split('@')[0]
    : '';
  return {
    id: String(raw.id),
    email: raw.email ?? null,
    name: fromMeta || fromEmail || null,
  };
}

export function useAuth() {
  const [session, setSession] = useState<AuthSession>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionReady, setSessionReady] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) {
      setSessionReady(true);
      setLoading(false);
      return;
    }
    if (!hasAuthHint()) {
      setSessionReady(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    let unsub: (() => void) | undefined;
    void (async () => {
      const sb = await getSupabase();
      if (!sb) {
        setSessionReady(true);
        setLoading(false);
        return;
      }
      const { data } = await sb.auth.getSession();
      const mapped = mapAuthUser(data.session?.user);
      setSession(data.session ? { user: mapped!, access_token: data.session.access_token } : null);
      setUser(mapped);
      setSessionReady(true);
      setLoading(false);
      const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
        const u = mapAuthUser(next?.user);
        setSession(next ? { user: u!, access_token: next.access_token } : null);
        setUser(u);
      });
      unsub = () => sub.subscription.unsubscribe();
    })();
    return () => {
      unsub?.();
    };
  }, []);

  const logout = useCallback(async () => {
    const sb = await getSupabase();
    if (sb) await sb.auth.signOut();
    setSession(null);
    setUser(null);
  }, []);

  return {
    user,
    session,
    loading,
    sessionReady,
    isAuthenticated: Boolean(session),
    logout,
  };
}
