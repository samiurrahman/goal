import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

interface SupabaseAuthState {
  isLoggedIn: boolean;
  isAuthReady: boolean;
}

/**
 * Custom hook to check if a user is logged in via Supabase session.
 * @returns {SupabaseAuthState} Auth state with login status and readiness flag.
 */
export function useSupabaseIsLoggedIn(): SupabaseAuthState {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsLoggedIn(!!data?.session);
      setIsAuthReady(true);
    });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsLoggedIn(!!session);
      setIsAuthReady(true);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return {
    isLoggedIn,
    isAuthReady,
  };
}
