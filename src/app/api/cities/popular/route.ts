import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase-env';

// GET /api/cities/popular?country=IN&limit=300
//
// Returns the top-N cities by population for a given country. Used to
// preload an in-memory list on the client so autocomplete can answer
// common queries (Mumbai, Hyderabad, Akola, …) without a network round
// trip. The cities table is RLS-readable; no auth required.
//
// Cached hard at the edge — population rankings barely move week-to-week
// and the table re-seeds monthly at most.

export const runtime = 'nodejs';
export const revalidate = 86400; // 24h

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 300;
const DEFAULT_COUNTRY = 'IN';

const sanitizeCountry = (raw: string | null): string => {
  if (!raw) return DEFAULT_COUNTRY;
  const v = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : DEFAULT_COUNTRY;
};

export async function GET(req: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const url = new URL(req.url);
  const country = sanitizeCountry(url.searchParams.get('country'));
  const limitRaw = parseInt(url.searchParams.get('limit') || '', 10);
  const limit = Math.min(
    MAX_LIMIT,
    Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT
  );

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data, error } = await supabase
    .from('cities')
    .select('id, slug, name, admin1_name, country_code, population')
    .eq('country_code', country)
    .not('slug', 'is', null)
    .order('population', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { cities: data ?? [] },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}
