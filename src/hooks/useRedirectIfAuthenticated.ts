'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/utils/supabaseClient';
import { storeAccessToken } from '@/utils/authToken';

/**
 * Shared guard for /login and /signup. If the visitor already has a valid
 * Supabase session, redirect them to `?redirect=` (or `/`) and refresh the
 * access-token cookie so the middleware sees them as logged in too.
 *
 * Listens to `onAuthStateChange` as well so a session that arrives later
 * (e.g. an OAuth callback finishing on this very page) triggers the redirect.
 */
export const useRedirectIfAuthenticated = (fallbackPath: string = '/') => {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    const redirectIfSession = (accessToken: string | null | undefined) => {
      if (!accessToken || cancelled) return;
      storeAccessToken(accessToken);
      const target = searchParams.get('redirect') || fallbackPath;
      router.replace(target);
    };

    supabase.auth.getSession().then(({ data }) => {
      redirectIfSession(data?.session?.access_token ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      redirectIfSession(session?.access_token ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router, searchParams, fallbackPath]);
};
