import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabaseClient";

/**
 * Custom hook to check if a user is logged in via Supabase session.
 * @returns {boolean} isLoggedIn - True if user is logged in, false otherwise.
 */
export function useSupabaseIsLoggedIn(): boolean {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsLoggedIn(!!data?.session);
    });
    return () => {
      mounted = false;
    };
  }, []);
  return isLoggedIn;
}
