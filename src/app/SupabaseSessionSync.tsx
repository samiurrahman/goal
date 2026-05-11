'use client';
import { useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { storeAccessToken, removeAccessToken } from '@/utils/authToken';
import { insertAgentWithUniqueSlug } from '@/lib/slug';

// Synchronously write the access-token cookie from whichever source already
// has the JWT. Supabase's own session loader is async, which on mobile leaves
// a window where the user is "logged in" client-side but the middleware can't
// see them. These two helpers close that gap.

const tryWriteCookieFromUrlHash = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) return false;
  try {
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const token = params.get('access_token');
    if (token) {
      storeAccessToken(token);
      return true;
    }
  } catch {
    // ignore parse errors — fall back to localStorage
  }
  return false;
};

const tryWriteCookieFromLocalStorage = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const keys = Object.keys(window.localStorage).filter(
      (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    for (const key of keys) {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const accessToken: string | undefined =
        parsed?.access_token || parsed?.currentSession?.access_token;
      if (accessToken) {
        storeAccessToken(accessToken);
        return true;
      }
    }
  } catch {
    // localStorage may be sandboxed (private mode) — fall through
  }
  return false;
};

// Auth user referenced by the current JWT no longer exists in auth.users.
// The cookie/session is stale — sign out so the next page load starts clean
// instead of replaying the same failing insert over and over.
const handleStaleAuthUser = async (error: { code?: string; message?: string }) => {
  if (error.code !== '23503') return false;
  console.warn(
    'Stale auth session detected (auth.users FK violation). Signing out.',
    error.message
  );
  try {
    await supabase.auth.signOut();
  } catch (signOutErr) {
    console.warn('signOut failed during stale-session cleanup:', signOutErr);
  }
  try {
    removeAccessToken();
  } catch {
    /* token already gone */
  }
  return true;
};

type AuthMeta = {
  full_name?: string | null;
  name?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  picture?: string | null;
  avatar_url?: string | null;
};

const splitName = (full?: string | null) => {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts[0], last: parts.slice(1).join(' ') };
};

/**
 * Syncs Supabase session on mount:
 *  - stores access token cookie
 *  - on first OAuth signup (?userType=...), creates user_details (and agents) rows
 *  - on every login, backfills empty first_name / last_name / profile_image
 *    from the auth provider's metadata (Google etc.) so the user doesn't appear
 *    as "User" in reviews.
 */
export default function SupabaseSessionSync() {
  // Keep the `access_token` cookie in sync with Supabase's session for the
  // entire app lifetime. Without this, the cookie holds the JWT from the
  // initial login forever — when Supabase auto-refreshes the token, or when
  // the user signs out in another tab, the cookie diverges from the actual
  // session and the middleware bounces logged-in users to /login.
  //
  // Only SIGNED_OUT clears the cookie. INITIAL_SESSION can fire briefly with
  // a null session during OAuth callback hash processing — treating that as a
  // logout would race with the user clicking a protected link.
  useEffect(() => {
    // Synchronous best-effort: write the cookie immediately on mount so even
    // a user who taps a protected link before Supabase finishes loading the
    // session gets past the middleware on the very next request.
    tryWriteCookieFromUrlHash() || tryWriteCookieFromLocalStorage();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        storeAccessToken(session.access_token);
        return;
      }
      if (event === 'SIGNED_OUT') {
        removeAccessToken();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data?.session;
      if (!session?.user) return;

      if (session.access_token) {
        storeAccessToken(session.access_token);
      }

      const meta = (session.user.user_metadata || {}) as AuthMeta;
      const metaFullName = meta.full_name || meta.name || '';
      const metaSplit = splitName(metaFullName);
      const firstFromMeta = meta.given_name || metaSplit.first || '';
      const lastFromMeta = meta.family_name || metaSplit.last || '';
      const pictureFromMeta = meta.picture || meta.avatar_url || '';

      // Read userType from URL (set by signup page before OAuth redirect).
      const urlParams = new URLSearchParams(window.location.search);
      const userTypeParam = urlParams.get('userType');
      if (userTypeParam) {
        urlParams.delete('userType');
        const newUrl = urlParams.toString()
          ? `${window.location.pathname}?${urlParams.toString()}`
          : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }

      // Look up existing user_details row
      const { data: existing } = await supabase
        .from('user_details')
        .select('id, first_name, last_name, profile_image, user_type')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (existing) {
        // Backfill empty identity fields only — don't overwrite anything the
        // user has explicitly set.
        const updates: Record<string, string | null> = {};
        if (!existing.first_name && firstFromMeta) updates.first_name = firstFromMeta;
        if (!existing.last_name && lastFromMeta) updates.last_name = lastFromMeta;
        if (!existing.profile_image && pictureFromMeta) updates.profile_image = pictureFromMeta;

        if (Object.keys(updates).length > 0) {
          await supabase.from('user_details').update(updates).eq('id', existing.id);
        }
        return;
      }

      // No row yet — create one. Default user_type to 'user' if no signup param.
      const resolvedType = userTypeParam === 'agent' ? 'agent' : 'user';

      const { error: insertUserDetailsError } = await supabase.from('user_details').insert({
        auth_user_id: session.user.id,
        user_type: resolvedType,
        first_name: firstFromMeta || null,
        last_name: lastFromMeta || null,
        profile_image: pictureFromMeta || null,
      });

      if (insertUserDetailsError) {
        const handled = await handleStaleAuthUser(insertUserDetailsError);
        if (handled) return;
        console.warn('Failed to create user_details row:', insertUserDetailsError.message);
      }

      // Mirror the agent signup path (retry-safe on slug race)
      if (resolvedType === 'agent') {
        const email = session.user.email || '';
        const displayName = metaFullName || email.split('@')[0] || 'agent';
        try {
          await insertAgentWithUniqueSlug(displayName, {
            auth_user_id: session.user.id,
            email_id: email,
            name: displayName,
            known_as: displayName,
          });
        } catch (err) {
          console.error('Failed to allocate agent slug on OAuth signup:', err);
        }
      }
    });
  }, []);
  return null;
}
