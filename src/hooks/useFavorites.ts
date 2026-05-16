'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';
import { useSupabaseIsLoggedIn } from './useSupabaseIsLoggedIn';

const FAVORITES_KEY = ['favorites'] as const;

// packages.id is a UUID (DB-side), even though the TS Package type claims
// `number`. Treat as opaque string throughout this module.
type PackageId = string;
type FavoritesSet = Set<PackageId>;

const fetchFavoriteIds = async (): Promise<FavoritesSet> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Set();

  const { data, error } = await supabase
    .from('favorites')
    .select('package_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load favorites:', error.message);
    return new Set();
  }

  return new Set((data || []).map((row) => String(row.package_id)));
};

export const useFavoriteIds = () => {
  const { isLoggedIn, isAuthReady } = useSupabaseIsLoggedIn();
  const queryClient = useQueryClient();

  // When the user signs in/out, drop the cached set so the next read pulls
  // the right user's favorites (and a logged-out card immediately stops
  // showing hearts as filled).
  useEffect(() => {
    if (!isAuthReady) return;
    queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
  }, [isLoggedIn, isAuthReady, queryClient]);

  return useQuery<FavoritesSet>({
    queryKey: FAVORITES_KEY,
    queryFn: fetchFavoriteIds,
    enabled: isAuthReady && isLoggedIn,
    staleTime: 1000 * 60 * 5,
  });
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
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not logged in');

      if (currentlyFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('package_id', packageId);

        if (error) throw new Error(error.message);
        return { packageId, nowFavorited: false };
      }

      // Insert is idempotent because of the (user_id, package_id) unique
      // constraint — onConflict ignore so a double-tap doesn't 409.
      const { error } = await supabase
        .from('favorites')
        .upsert(
          { user_id: user.id, package_id: packageId },
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
