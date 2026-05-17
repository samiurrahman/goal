'use client';

import { useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';
import { readHeaderCache } from '@/utils/headerCache';
import { showApiError } from '@/lib/apiErrors';

// Cache key is scoped by the signed-in user. Without this, an optimistic
// favorite added by user A (or by an anonymous-but-soon-to-sign-in tab)
// would leak into user B's view on the same browser, producing a
// "favorite flashes then disappears" bug after the per-user refetch lands.
// `anon` is used for logged-out viewers so we don't collide with user keys.
const favoritesKey = (userId: string | null | undefined) =>
  ['favorites', userId ?? 'anon'] as const;
const VIEWER_TYPE_KEY = ['viewerUserType'] as const;

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
 *
 * Module-level singleton: every FavoriteButton on a page calls multiple
 * favorites hooks, and each hook used to spin up its own getSession() and
 * onAuthStateChange listener. On the home page (12 cards × 4 hooks) that
 * meant 48 redundant auth subscriptions competing with image paint on the
 * main thread — a measurable LCP regression. The store below collapses all
 * of that down to one getSession() and one listener, shared across every
 * component on every page via useSyncExternalStore.
 */
type SessionState = { userId: string | null; isReady: boolean };

let sessionState: SessionState = { userId: null, isReady: false };
const sessionListeners = new Set<() => void>();
let sessionInitialized = false;

const notifySessionListeners = () => {
  for (const listener of sessionListeners) listener();
};

const initSessionStore = () => {
  if (sessionInitialized || typeof window === 'undefined') return;
  sessionInitialized = true;

  supabase.auth.getSession().then(({ data }) => {
    sessionState = { userId: data.session?.user?.id ?? null, isReady: true };
    notifySessionListeners();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    sessionState = { userId: session?.user?.id ?? null, isReady: true };
    notifySessionListeners();
  });
};

const subscribeSession = (listener: () => void) => {
  initSessionStore();
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
};

const getSessionSnapshot = () => sessionState;
// Server snapshot is stable; useSyncExternalStore requires referential equality
// across SSR calls to avoid an infinite loop.
const SERVER_SESSION_SNAPSHOT: SessionState = { userId: null, isReady: false };
const getServerSessionSnapshot = () => SERVER_SESSION_SNAPSHOT;

const useSessionUserId = () =>
  useSyncExternalStore(subscribeSession, getSessionSnapshot, getServerSessionSnapshot);

const fetchFavoriteIds = async (userId: string): Promise<FavoritesSet> => {
  const { data, error } = await supabase
    .from('favorites')
    .select('package_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Throw so the global QueryCache.onError surfaces a friendly toast. The
  // old code swallowed and returned an empty set, which made a real RLS or
  // network failure indistinguishable from "no favorites yet" — the page
  // would just look empty.
  if (error) throw error;

  return new Set((data || []).map((row) => String(row.package_id)));
};

export const useFavoriteIds = () => {
  const { userId, isReady } = useSessionUserId();

  // The query key includes userId, so a different signed-in user gets a
  // different cache slice automatically — no manual invalidate on user
  // change is needed.
  const query = useQuery<FavoritesSet>({
    queryKey: favoritesKey(userId),
    queryFn: () => (userId ? fetchFavoriteIds(userId) : Promise.resolve(new Set())),
    enabled: isReady && !!userId,
    staleTime: 1000 * 60 * 5,
  });

  // Expose `isAuthReady` so callers can distinguish "we haven't checked
  // who the user is yet" from "we checked and they have no favorites".
  // Without it the favorites page would flash the empty state during
  // the mount → getSession round-trip, before the query is even enabled.
  return { ...query, isAuthReady: isReady };
};

export const useIsLoggedIn = () => {
  const { userId, isReady } = useSessionUserId();
  return { isLoggedIn: !!userId, isAuthReady: isReady };
};

/**
 * Resolve the signed-in viewer's user_type ('user' | 'agent' | null).
 * Warm-started from headerCache (populated by AvatarDropdown) so agents
 * don't see a heart flash on warm page loads. Falls back to a direct
 * `user_details` read when the cache is cold. Logged-out viewers resolve
 * to null without hitting the DB.
 */
export const useViewerUserType = () => {
  const { userId, isReady } = useSessionUserId();

  const query = useQuery<string | null>({
    queryKey: [...VIEWER_TYPE_KEY, userId ?? 'anon'],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('user_details')
        .select('user_type')
        .eq('auth_user_id', userId)
        .maybeSingle();
      // Intentionally silent: this just gates the heart icon for agents.
      // A failure degrades to "treat as user" which is fine — we don't
      // want a toast here for a UI-only signal.
      if (error) {
        showApiError(error, { silent: true });
        return null;
      }
      return (data?.user_type as string | null) ?? null;
    },
    enabled: isReady,
    staleTime: 1000 * 60 * 5,
    initialData: () => {
      if (typeof window === 'undefined') return undefined;
      const cache = readHeaderCache();
      if (!cache?.loggedIn) return undefined;
      return cache.userType ?? null;
    },
  });

  return {
    userType: query.data ?? null,
    isReady: isReady && (query.isSuccess || query.data !== undefined),
  };
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  const { userId } = useSessionUserId();

  return useMutation<
    { packageId: PackageId; nowFavorited: boolean },
    Error,
    { packageId: PackageId; currentlyFavorited: boolean },
    { previous?: FavoritesSet; key: ReturnType<typeof favoritesKey> }
  >({
    mutationFn: async ({ packageId, currentlyFavorited }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const id = session?.user?.id;

      if (!id) throw new Error('Not logged in');

      if (currentlyFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', id)
          .eq('package_id', packageId);

        if (error) throw new Error(error.message);
        return { packageId, nowFavorited: false };
      }

      // Insert is idempotent because of the (user_id, package_id) unique
      // constraint — onConflict ignore so a double-tap doesn't 409.
      const { error } = await supabase
        .from('favorites')
        .upsert(
          { user_id: id, package_id: packageId },
          { onConflict: 'user_id,package_id', ignoreDuplicates: true }
        );

      if (error) throw new Error(error.message);
      return { packageId, nowFavorited: true };
    },
    onMutate: async ({ packageId, currentlyFavorited }) => {
      const key = favoritesKey(userId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FavoritesSet>(key);
      const next = new Set(previous ?? []);
      if (currentlyFavorited) next.delete(packageId);
      else next.add(packageId);
      queryClient.setQueryData(key, next);
      return { previous, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous && context?.key) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSettled: (_data, _err, _vars, context) => {
      queryClient.invalidateQueries({
        queryKey: context?.key ?? favoritesKey(userId),
      });
    },
  });
};
