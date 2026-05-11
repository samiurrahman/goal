import { NextRequest, NextResponse } from 'next/server';

// Identify ourselves to Nominatim per their usage policy:
// https://operations.osmfoundation.org/policies/nominatim/
const USER_AGENT =
  process.env.NEXT_PUBLIC_SITE_NAME ||
  'searchumrah.com (contact: support@searchumrah.com)';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  country?: string;
  country_code?: string;
};

const pickCity = (addr: NominatimAddress): string | null => {
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    null
  );
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = Number(searchParams.get('lat'));
  const lng = Number(searchParams.get('lng'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: 'lat and lng query parameters are required' },
      { status: 400 }
    );
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'lat/lng out of range' }, { status: 400 });
  }

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('zoom', '10'); // city-level

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept-Language': 'en',
      },
      // Cache identical lat/lng pairs at the edge for an hour.
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      console.error('Nominatim error:', res.status, await res.text().catch(() => ''));
      return NextResponse.json(
        { error: 'Reverse geocoding failed' },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { address?: NominatimAddress };
    const address = data?.address || {};

    const city = pickCity(address);
    const state = address.state || address.state_district || null;
    const country = address.country || null;
    const countryCode = (address.country_code || '').toUpperCase() || null;

    if (!city && !state) {
      return NextResponse.json(
        { error: 'Could not resolve city or state for these coordinates' },
        { status: 404 }
      );
    }

    return NextResponse.json({ city, state, country, countryCode });
  } catch (err) {
    console.error('Nominatim fetch failed:', err);
    return NextResponse.json(
      { error: 'Network error contacting reverse geocoder' },
      { status: 502 }
    );
  }
}
