/**
 * Read-only diagnostic for the homepage "Umrah packages from your city" grid.
 *
 * The grid renders counts from count_packages_by_city() — when counts are
 * missing despite known packages existing, one of four things is wrong:
 *
 *   1. The RPC function isn't visible to PostgREST (schema cache stale).
 *   2. Upcoming published packages exist but their agents have no city_id,
 *      so package_city_slug comes through NULL.
 *   3. Slugs in cities.slug don't match SEO_CITIES.dbCitySlug formatting.
 *   4. The packages aren't actually published / are date-expired.
 *
 * This script answers all four. Run:
 *   pnpm tsx scripts/inspect-city-counts.ts
 */

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
for (const file of ['.env.local', '.env']) {
  const p = join(process.cwd(), file);
  if (existsSync(p)) loadEnv({ path: p });
}

import { createClient } from '@supabase/supabase-js';
import { SEO_CITIES } from '../src/lib/seo/cities';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.SUPABASE_PROJECT_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const todayStr = new Date().toISOString().slice(0, 10);
  console.log(`\n=== city-counts diagnostic (today = ${todayStr}) ===\n`);

  // 1. Direct RPC call.
  console.log('[1] Calling RPC count_packages_by_city()...');
  const { data: rpcData, error: rpcError } = await supabase.rpc('count_packages_by_city');
  if (rpcError) {
    console.log(`    RPC FAILED: ${rpcError.code} ${rpcError.message}`);
    console.log('    → Migration not applied, or PostgREST schema cache stale.');
    console.log('    → Try: NOTIFY pgrst, \'reload schema\'; in SQL editor.');
  } else {
    console.log(`    RPC returned ${rpcData?.length ?? 0} rows:`);
    for (const r of (rpcData ?? []) as Array<{ city_slug: string; package_count: number }>) {
      console.log(`      ${r.city_slug.padEnd(30)} → ${r.package_count}`);
    }
  }

  // 2. Raw upcoming published packages with their package_city_slug.
  console.log('\n[2] Sampling upcoming published packages (max 50):');
  const { data: pkgs, error: pkgErr } = await supabase
    .from('packages_with_agent')
    .select('id, published, departure_date, package_location, package_city_slug, package_city_id')
    .eq('published', true)
    .gte('departure_date', todayStr)
    .limit(50);
  if (pkgErr) {
    console.log(`    Query failed: ${pkgErr.message}`);
  } else {
    console.log(`    Found ${pkgs?.length ?? 0} upcoming published packages.`);
    const nullSlug = (pkgs ?? []).filter((p: any) => !p.package_city_slug);
    console.log(`    With NULL package_city_slug: ${nullSlug.length}`);
    if (nullSlug.length > 0) {
      console.log('    → These packages\' agents have city_id = NULL.');
      console.log('    Sample (first 5):');
      for (const p of nullSlug.slice(0, 5) as any[]) {
        console.log(`      id=${p.id} dep=${p.departure_date} location="${p.package_location}" city_id=${p.package_city_id}`);
      }
    }
    const withSlug = (pkgs ?? []).filter((p: any) => p.package_city_slug);
    if (withSlug.length > 0) {
      const uniqueSlugs = Array.from(new Set(withSlug.map((p: any) => p.package_city_slug)));
      console.log(`    Distinct package_city_slug values present (${uniqueSlugs.length}):`);
      for (const s of uniqueSlugs) console.log(`      "${s}"`);
    }
  }

  // 3. SEO_CITIES slugs we're trying to match.
  console.log('\n[3] SEO_CITIES dbCitySlug values (first 8):');
  for (const c of SEO_CITIES.slice(0, 8)) {
    console.log(`      ${c.name.padEnd(20)} → "${c.dbCitySlug}"`);
  }

  // 4. Cross-reference: which RPC slugs map to an SEO city.
  if (rpcData && Array.isArray(rpcData)) {
    console.log('\n[4] RPC slug → SEO city mapping check:');
    const seoSet = new Set(SEO_CITIES.map((c) => c.dbCitySlug));
    let matched = 0;
    let unmatched: string[] = [];
    for (const r of rpcData as Array<{ city_slug: string; package_count: number }>) {
      if (seoSet.has(r.city_slug)) {
        matched++;
      } else {
        unmatched.push(r.city_slug);
      }
    }
    console.log(`    Matched ${matched} / ${rpcData.length} RPC rows to an SEO city.`);
    if (unmatched.length > 0) {
      console.log('    Unmatched RPC slugs (these packages exist but won\'t show on homepage):');
      for (const s of unmatched) console.log(`      "${s}"`);
    }
  }

  console.log('\n=== done ===\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
