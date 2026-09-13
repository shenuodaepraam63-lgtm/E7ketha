import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { trpc } from '@/lib/trpc';

export function useAuth() {
  const [sessionReady, setSessionReady] = useState(!supabaseConfigured);
  const me = trpc.auth.me.useQuery(undefined, { enabled: sessionReady, retry: false });
  const utils = trpc.useUtils();
  const logoutMutation = trpc.auth.logout.useMutation();
  const loginEvent = trpc.auth.loginEvent.useMutation();

  useEffect(() => {
    if (!supabase) {
      setSessionReady(true);
      return;
    }
    void supabase.auth.getSession().finally(() => setSessionReady(true));
    const { data } = supabase.auth.onAuthStateChange(() => {
      setSessionReady(true);
      void utils.auth.me.invalidate();
    });
    return () => data.subscription.unsubscribe();
  }, [utils.auth.me]);

  useEffect(() => {
    if (me.data?.openId && !loginEvent.isPending) void loginEvent.mutateAsync().catch(() => undefined);
  }, [me.data?.openId]);

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    await logoutMutation.mutateAsync();
    await utils.auth.me.invalidate();
  };

  return { user: me.data ?? null, loading: !sessionReady || me.isLoading, logout };
}
