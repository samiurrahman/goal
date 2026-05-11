import { NextRequest, NextResponse } from 'next/server';

const GRAPH_API_VERSION = 'v18.0';

type SendRequest = {
  to: string;
  template?: {
    name?: string;
    language?: string;
    params?: string[];
  };
};

const normalizePhone = (raw: string): string => raw.replace(/\D/g, '');

export async function POST(req: NextRequest) {
  let body: SendRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const phone = normalizePhone(body.to || '');
  if (!phone) {
    return NextResponse.json(
      { error: 'Missing or invalid `to` phone number' },
      { status: 400 }
    );
  }

  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return NextResponse.json(
      {
        error:
          'WhatsApp API credentials not configured (set WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID)',
      },
      { status: 500 }
    );
  }

  const templateName =
    body.template?.name || process.env.WHATSAPP_TEMPLATE_NAME || 'hello_world';
  const language =
    body.template?.language || process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US';
  const params = body.template?.params ?? [];

  const components = params.length
    ? [
        {
          type: 'body',
          parameters: params.map((value) => ({ type: 'text', text: value })),
        },
      ]
    : undefined;

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: language },
      ...(components ? { components } : {}),
    },
  };

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error('WhatsApp API error:', { status: res.status, data });
      return NextResponse.json(
        { error: 'WhatsApp API request failed', details: data },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error('WhatsApp fetch failed:', err);
    return NextResponse.json(
      { error: 'Network error contacting WhatsApp API' },
      { status: 502 }
    );
  }
}
