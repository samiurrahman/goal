import { useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';

/**
 * Custom hook to check if a user is logged in via Supabase session.
 * @returns {boolean} isLoggedIn - True if user is logged in, false otherwise.
 */
export function useSupabaseIsLoggedIn(): boolean {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsLoggedIn(!!data?.session);
    });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setIsLoggedIn(!!session);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return isLoggedIn;
}
