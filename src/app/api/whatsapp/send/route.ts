import { NextRequest, NextResponse } from 'next/server';

const GRAPH_API_VERSION = 'v21.0';

type SendRequest = {
  to: string;
  template?: {
    name?: string;
    language?: string;
    params?: string[];
  };
};

/**
 * Strip non-digits and ensure a country code is present.
 * 10-digit numbers starting with 6-9 are assumed to be Indian mobile numbers → prepend 91.
 */
const normalizePhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }
  return digits;
};

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

  // WHATSAPP_TEMPLATE_OVERRIDE lets you point all messages at a single approved template
  // (e.g. "hello_world" while custom templates are pending approval). Remove it once
  // the real templates are approved.
  const templateOverride = process.env.WHATSAPP_TEMPLATE_OVERRIDE;
  const languageOverride = process.env.WHATSAPP_TEMPLATE_LANGUAGE;
  const templateName =
    templateOverride || body.template?.name || process.env.WHATSAPP_TEMPLATE_NAME || 'hello_world';
  // When override is active, use its language env var; otherwise use what the caller sent
  const language = templateOverride
    ? (languageOverride || 'en_US')
    : (body.template?.language || languageOverride || 'en_US');
  // Drop params when overriding — the override template may have a different variable count
  const params = templateOverride ? [] : (body.template?.params ?? []);

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
      const metaCode = data?.error?.code;
      const metaMessage = data?.error?.message ?? 'unknown error';
      console.error('[WhatsApp] API error:', { status: res.status, metaCode, metaMessage, data });
      return NextResponse.json(
        {
          error: 'WhatsApp API request failed',
          meta_code: metaCode,
          meta_message: metaMessage,
          details: data,
        },
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
