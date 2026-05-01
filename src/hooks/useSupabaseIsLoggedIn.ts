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

  const hasForcedLogout = () => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('app_forced_logged_out') === '1';
  };

  const applyAuthState = (hasSession: boolean) => {
    setIsLoggedIn(hasSession && !hasForcedLogout());
    setIsAuthReady(true);
  };

  useEffect(() => {
    let mounted = true;

    const handleForcedLogout = () => {
      if (!mounted) return;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('app_forced_logged_out', '1');
      }
      setIsLoggedIn(false);
      setIsAuthReady(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('app:force-logout', handleForcedLogout);
    }

    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      applyAuthState(!!data?.session);
    });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (typeof window !== 'undefined') {
        if (event === 'SIGNED_IN') {
          sessionStorage.removeItem('app_forced_logged_out');
        }
        if (event === 'SIGNED_OUT') {
          sessionStorage.setItem('app_forced_logged_out', '1');
        }
      }

      applyAuthState(!!session);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('app:force-logout', handleForcedLogout);
      }
    };
  }, []);

  return {
    isLoggedIn,
    isAuthReady,
  };
}
