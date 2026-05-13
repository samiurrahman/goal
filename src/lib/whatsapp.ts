export const WA_TEMPLATES = {
  BOOKING_CONFIRMATION: 'booking_confirmation',
  BOOKING_CONFIRMED: 'booking_success',
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
  fetch('/api/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: phone,
      template: { name: templateName, language: 'en_US', params },
    }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`[WhatsApp] "${templateName}" to ${phone} failed:`, body);
      }
    })
    .catch((err) => console.error('[WhatsApp] request error:', err));
};
