import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

// nodejs runtime — edge is unreliable for Supabase queries in dev mode and
// the env-var loading semantics differ from prod. We pay nothing meaningful
// in cold-start cost since OG images are cached aggressively by social engines.
export const runtime = 'nodejs';
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
  departure_city: string | null;
  arrival_city: string | null;
  departure_date: string | null;
  arrival_date: string | null;
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
    // Multiple packages can share a slug across agents. Fetch up to 5 and pick
    // the one whose agent_name matches the URL agent slug — mirrors what
    // [slug]/page.tsx does so the OG image describes the same package the
    // page renders.
    const { data } = await supabase
      .from('packages_with_agent')
      .select(
        'title, total_duration_days, makkah_days, madinah_days, price_per_person, currency, agent_name, thumbnail_url, departure_city, arrival_city, departure_date, arrival_date'
      )
      .ilike('slug', params.slug)
      .limit(5);
    const candidates = (data ?? []) as PkgRow[];
    const lowerAgent = params.agentName.toLowerCase();
    pkg =
      candidates.find((p) => (p.agent_name || '').toLowerCase() === lowerAgent) ??
      candidates[0] ??
      null;
  }

  const title = pkg?.title || 'Umrah Package';
  const durationDays = pkg?.total_duration_days || null;
  const makkahDays = pkg?.makkah_days || null;
  const madinahDays = pkg?.madinah_days || null;
  const price = pkg?.price_per_person || null;
  const currency = pkg?.currency || 'INR';
  const agentName = pkg?.agent_name || params.agentName;
  const departureCity = (pkg?.departure_city || '').trim();
  const arrivalCity = (pkg?.arrival_city || '').trim();
  const flightRoute =
    departureCity && arrivalCity
      ? `${departureCity} → ${arrivalCity}`
      : departureCity || arrivalCity || '';

  // Compact "12 Nov" style — keeps the chip readable at thumbnail size.
  const fmtDate = (raw: string | null) => {
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  const depDate = fmtDate(pkg?.departure_date ?? null);
  const retDate = fmtDate(pkg?.arrival_date ?? null);
  const flightDates = depDate && retDate ? `${depDate} – ${retDate}` : depDate || retDate;

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
              {`${durationDays} days`}
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
              {`${makkahDays}D Makkah`}
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
              {`${madinahDays}D Madinah`}
            </div>
          ) : null}
          {flightRoute ? (
            <div
              style={{
                background: 'rgba(99,102,241,0.30)',
                padding: '12px 22px',
                borderRadius: 999,
                fontSize: 26,
                fontWeight: 500,
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              {`✈ ${flightRoute}`}
            </div>
          ) : null}
          {flightDates ? (
            <div
              style={{
                background: 'rgba(255,255,255,0.18)',
                padding: '12px 22px',
                borderRadius: 999,
                fontSize: 26,
                fontWeight: 500,
              }}
            >
              {flightDates}
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
