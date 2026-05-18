import { supabase } from '@/utils/supabaseClient';

export const WA_TEMPLATES = {
  BOOKING_CONFIRMATION: 'booking_confirmation',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED_BY_USER: 'booking_cancelled_by_user',
  BOOKING_CANCELLED_BY_AGENT: 'booking_cancelled_by_agent',
} as const;

export type WaTemplate = (typeof WA_TEMPLATES)[keyof typeof WA_TEMPLATES];

export const sendWhatsApp = (
  to: string | undefined | null,
  templateName: WaTemplate | string,
  params: string[]
): void => {
  const phone = (to || '').trim();
  if (!phone) return;

  // /api/whatsapp/send now requires a Supabase session — the endpoint was
  // previously unauthenticated, which let anyone drain the WABA quota.
  // We resolve the token inline so callers don't have to thread it through.
  void (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      console.error(`[WhatsApp] "${templateName}" to ${phone} skipped: not signed in`);
      return;
    }

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: phone,
          template: { name: templateName, language: 'en_US', params },
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`[WhatsApp] "${templateName}" to ${phone} failed:`, body);
      }
    } catch (err) {
      console.error('[WhatsApp] request error:', err);
    }
  })();
};
