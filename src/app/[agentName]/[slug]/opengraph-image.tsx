import { ImageResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const alt = 'Umrah package on Searchumrah';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type PkgRow = {
  title: string | null;
  total_duration_days: number | null;
  makkah_days: number | null;
  madinah_days: number | null;
  price_per_person: number | null;
  currency: string | null;
  agent_name: string | null;
  thumbnail_url: string | null;
};

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
};

export default async function Image({
  params,
}: {
  params: { agentName: string; slug: string };
}) {
  const supabase = getSupabase();
  let pkg: PkgRow | null = null;
  if (supabase) {
    const { data } = await supabase
      .from('packages_with_agent')
      .select(
        'title, total_duration_days, makkah_days, madinah_days, price_per_person, currency, agent_name, thumbnail_url'
      )
      .ilike('slug', params.slug)
      .limit(1);
    pkg = Array.isArray(data) && data.length > 0 ? (data[0] as PkgRow) : null;
  }

  const title = pkg?.title || 'Umrah Package';
  const durationDays = pkg?.total_duration_days || null;
  const makkahDays = pkg?.makkah_days || null;
  const madinahDays = pkg?.madinah_days || null;
  const price = pkg?.price_per_person || null;
  const currency = pkg?.currency || 'INR';
  const agentName = pkg?.agent_name || params.agentName;

  const formattedPrice = price
    ? `${currency} ${Number(price).toLocaleString('en-IN')}`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #3730a3 50%, #4338ca 100%)',
          color: 'white',
          padding: '70px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* brand row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'white',
              color: '#4338CA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: '-2px',
            }}
          >
            S
          </div>
          <div style={{ fontSize: 28, fontWeight: 600 }}>Searchumrah</div>
        </div>

        {/* title */}
        <div
          style={{
            fontSize: title.length > 50 ? 58 : 72,
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: '-2px',
            maxWidth: 1060,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {title}
        </div>

        {/* meta chips */}
        <div
          style={{
            display: 'flex',
            gap: '14px',
            marginTop: '32px',
            flexWrap: 'wrap',
          }}
        >
          {durationDays ? (
            <div
              style={{
                background: 'rgba(255,255,255,0.18)',
                padding: '12px 22px',
                borderRadius: 999,
                fontSize: 26,
                fontWeight: 500,
              }}
            >
              {durationDays} days
            </div>
          ) : null}
          {makkahDays ? (
            <div
              style={{
                background: 'rgba(255,255,255,0.18)',
                padding: '12px 22px',
                borderRadius: 999,
                fontSize: 26,
                fontWeight: 500,
              }}
            >
              {makkahDays}D Makkah
            </div>
          ) : null}
          {madinahDays ? (
            <div
              style={{
                background: 'rgba(255,255,255,0.18)',
                padding: '12px 22px',
                borderRadius: 999,
                fontSize: 26,
                fontWeight: 500,
              }}
            >
              {madinahDays}D Madinah
            </div>
          ) : null}
        </div>

        {/* footer: agent + price */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: 22, opacity: 0.75 }}>Offered by</div>
            <div style={{ fontSize: 36, fontWeight: 600 }}>{agentName}</div>
          </div>
          {formattedPrice ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: 22, opacity: 0.75 }}>From</div>
              <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-1px' }}>
                {formattedPrice}
              </div>
              <div style={{ fontSize: 20, opacity: 0.75 }}>per person</div>
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size }
  );
}
