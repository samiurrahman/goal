'use client';
import { useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { storeAccessToken } from '@/utils/authToken';

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

      await supabase.from('user_details').insert({
        auth_user_id: session.user.id,
        user_type: resolvedType,
        first_name: firstFromMeta || null,
        last_name: lastFromMeta || null,
        profile_image: pictureFromMeta || null,
      });

      // Mirror the agent signup path
      if (resolvedType === 'agent') {
        const email = session.user.email || '';
        await supabase.from('agents').insert({
          auth_user_id: session.user.id,
          email_id: email,
          name: metaFullName || email.split('@')[0],
        });
      }
    });
  }, []);
  return null;
}
