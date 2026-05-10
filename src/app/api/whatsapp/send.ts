import type { NextRequest } from 'next/server';

// Replace with your WhatsApp Cloud API credentials
default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { to, message } = await req.json();
  if (!to || !message) {
    return new Response('Missing parameters', { status: 400 });
  }

  // WhatsApp Cloud API credentials (move to env vars in production)
  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
    return new Response('WhatsApp API credentials missing', { status: 500 });
  }

  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: message },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.text();
    return new Response(`WhatsApp API error: ${error}`, { status: 500 });
  }

  return new Response('Message sent', { status: 200 });
}

export { handler as POST };