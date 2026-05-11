import { supabase } from '@/utils/supabaseClient';

/**
 * Fire-and-forget revalidation of ISR-cached server pages.
 *
 * Call this from client-side mutation handlers (create/edit/delete/publish
 * toggle) so the cache reflects the change immediately instead of waiting
 * for the `revalidate` window to elapse.
 *
 * Failures are logged to console — they don't surface to the user because
 * the underlying mutation already succeeded; ISR will catch up naturally.
 */
export const revalidatePaths = async (paths: string[]) => {
  if (!paths.length) return;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;

    await fetch('/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paths }),
      keepalive: true,
    });
  } catch (err) {
    console.warn('revalidatePaths failed:', err);
  }
};
