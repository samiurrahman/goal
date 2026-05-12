import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase-env';

// GET /api/cities/search?q=akol&country=IN&limit=8
//
// Powers the location autocomplete used by the packages filter and the
// agent package-create form. Trigram fuzzy match on `ascii_name`, ranked by
// (similarity DESC, population DESC) so "akol" → Akola (~250K pop) wins
// over "Akolar" (a hamlet of 800).
//
// Read-only, cacheable. We use the anon key explicitly — no auth needed,
// cities is RLS-readable to everyone.

export const runtime = 'nodejs';
// 1 hour edge cache: city data only changes when the monthly re-seed runs,
// and even then existing entries' name/lat/lng don't move. Long cache is
// safe and saves DB load on the autocomplete-on-every-keystroke pattern.
export const revalidate = 3600;

const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 8;

const sanitizeCountry = (raw: string | null): string | null => {
  if (!raw) return null;
  const v = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : null;
};

export async function GET(req: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const country = sanitizeCountry(url.searchParams.get('country'));
  const limitRaw = parseInt(url.searchParams.get('limit') || '', 10);
  const limit = Math.min(
    MAX_LIMIT,
    Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT
  );

  // Short queries return an empty list rather than scanning the full table.
  // Two characters is the threshold where trigram match starts being useful.
  if (q.length < 2) {
    return NextResponse.json({ cities: [] }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // The trigram operator `%` returns rows where similarity > threshold (default 0.3).
  // We then order by `similarity()` so the closest match floats to the top, with
  // population as the tiebreaker for ambiguous queries like "san".
  //
  // PostgREST's `rpc` is cleaner than chaining text filters for this — we expose
  // a small SECURITY DEFINER function so the autocomplete is one round trip.
  const { data, error } = await supabase.rpc('cities_autocomplete', {
    p_query: q,
    p_country: country,
    p_limit: limit,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { cities: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } }
  );
}
