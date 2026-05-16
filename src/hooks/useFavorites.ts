'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';

const FAVORITES_KEY = ['favorites'] as const;

// packages.id is a UUID (DB-side), even though the TS Package type claims
// `number`. Treat as opaque string throughout this module.
type PackageId = string;
type FavoritesSet = Set<PackageId>;

/**
 * Direct supabase session check. We can't reuse `useSupabaseIsLoggedIn`
 * because it ANDs the session with a `app_forced_logged_out` sessionStorage
 * flag that only clears on a fresh SIGNED_IN event — auto-restored sessions
 * leave the flag set and the hook reports "logged out" even when the cookie
 * session is valid (the rest of the app, e.g. AvatarDropdown, ignores this
 * flag and reads the session directly).
 */
const useSessionUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user?.id ?? null);
      setIsReady(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUserId(session?.user?.id ?? null);
      setIsReady(true);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  return { userId, isReady };
};

const fetchFavoriteIds = async (userId: string): Promise<FavoritesSet> => {
  const { data, error } = await supabase
    .from('favorites')
    .select('package_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load favorites:', error.message);
    return new Set();
  }

  return new Set((data || []).map((row) => String(row.package_id)));
};

export const useFavoriteIds = () => {
  const { userId, isReady } = useSessionUserId();
  const queryClient = useQueryClient();

  // When the signed-in user changes, drop the cached set so a heart filled
  // for user A doesn't bleed into user B's view.
  useEffect(() => {
    if (!isReady) return;
    queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
  }, [userId, isReady, queryClient]);

  return useQuery<FavoritesSet>({
    queryKey: FAVORITES_KEY,
    queryFn: () => (userId ? fetchFavoriteIds(userId) : Promise.resolve(new Set())),
    enabled: isReady && !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useIsLoggedIn = () => {
  const { userId, isReady } = useSessionUserId();
  return { isLoggedIn: !!userId, isAuthReady: isReady };
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { packageId: PackageId; nowFavorited: boolean },
    Error,
    { packageId: PackageId; currentlyFavorited: boolean },
    { previous?: FavoritesSet }
  >({
    mutationFn: async ({ packageId, currentlyFavorited }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) throw new Error('Not logged in');

      if (currentlyFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('package_id', packageId);

        if (error) throw new Error(error.message);
        return { packageId, nowFavorited: false };
      }

      // Insert is idempotent because of the (user_id, package_id) unique
      // constraint — onConflict ignore so a double-tap doesn't 409.
      const { error } = await supabase
        .from('favorites')
        .upsert(
          { user_id: userId, package_id: packageId },
          { onConflict: 'user_id,package_id', ignoreDuplicates: true }
        );

      if (error) throw new Error(error.message);
      return { packageId, nowFavorited: true };
    },
    onMutate: async ({ packageId, currentlyFavorited }) => {
      await queryClient.cancelQueries({ queryKey: FAVORITES_KEY });
      const previous = queryClient.getQueryData<FavoritesSet>(FAVORITES_KEY);
      const next = new Set(previous ?? []);
      if (currentlyFavorited) next.delete(packageId);
      else next.add(packageId);
      queryClient.setQueryData(FAVORITES_KEY, next);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FAVORITES_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });
};
