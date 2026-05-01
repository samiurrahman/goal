'use client';
import { useEffect } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { storeAccessToken } from '@/utils/authToken';

/**
 * Syncs Supabase session on mount — stores access token and creates user_details/agents rows
 * after OAuth redirect if they don't exist yet (uses ?userType= query param).
 */
export default function SupabaseSessionSync() {
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const session = data?.session;
      if (!session?.user) return;

      if (session.access_token) {
        storeAccessToken(session.access_token);
      }

      // Read userType from URL query param (set by signup page before OAuth redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const userType = urlParams.get('userType');
      if (!userType) return;

      // Clean up URL query param
      urlParams.delete('userType');
      const newUrl = urlParams.toString()
        ? `${window.location.pathname}?${urlParams.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Check if user_details row already exists
      const { data: existing } = await supabase
        .from('user_details')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single();

      if (existing) return; // Already set up, nothing to do

      const resolvedType = userType === 'agent' ? 'agent' : 'user';

      // Create user_details row
      await supabase.from('user_details').insert({
        auth_user_id: session.user.id,
        user_type: resolvedType,
      });

      // If agent, create agents row
      if (resolvedType === 'agent') {
        const email = session.user.email || '';
        await supabase.from('agents').insert({
          auth_user_id: session.user.id,
          email_id: email,
          name: session.user.user_metadata?.full_name || email.split('@')[0],
        });
      }
    });
  }, []);
  return null;
}
