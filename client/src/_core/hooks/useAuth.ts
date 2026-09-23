import { useCallback, useEffect, useState } from 'react';
import { getSupabase, hasAuthHint, supabaseConfigured } from '@/lib/supabase';

type AuthUser = { id: string; email?: string | null };
type AuthSession = { user: AuthUser; access_token?: string } | null;

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
      setSession(data.session as AuthSession);
      setUser((data.session?.user as AuthUser) ?? null);
      setSessionReady(true);
      setLoading(false);
      const { data: sub } = sb.auth.onAuthStateChange((_event, next) => {
        setSession(next as AuthSession);
        setUser((next?.user as AuthUser) ?? null);
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
