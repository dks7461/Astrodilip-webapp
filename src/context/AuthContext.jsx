import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

/**
 * AuthProvider wraps the app and exposes the current Supabase session, the
 * logged-in user, their role ('client' | 'admin'), and the matching profile row.
 * It also keeps the realtime auth token in sync so RLS-aware channels work.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    let active = true;

    // Initial session load.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      await loadProfile(session?.user?.id);
      setLoading(false);
    });

    // React to login / logout / token refresh.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      setSession(session);
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      await loadProfile(session?.user?.id);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? (session?.user ? 'client' : null),
    isAdmin: profile?.role === 'admin',
    loading,
    refreshProfile: () => loadProfile(session?.user?.id),
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
