'use client';
import { useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { storeAccessToken } from '@/utils/authToken';

/**
 * This component checks for a Supabase session on mount and stores the access token in a cookie if available.
 * Place this in your layout or a top-level provider to ensure the token is stored after OAuth redirects.
 */
export default function SupabaseSessionSync() {
  useEffect(() => {
    // For supabase-js v2, use getSession().then()
    supabase.auth.getSession().then(({ data }) => {
      const access_token = data?.session?.access_token;
      if (access_token) {
        storeAccessToken(access_token);
      }
    });
  }, []);
  return null;
}
