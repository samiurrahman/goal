/**
 * One-shot: resolve every SEO_CITIES entry to its actual cities.slug.
 *
 * Background: SEO_CITIES was authored with alpha state codes (e.g.
 * "mumbai-in-mh") but the cities table is seeded from GeoNames, which
 * uses numeric admin1 codes for India (e.g. "mumbai-in-16"). Every
 * dbCitySlug in SEO_CITIES is therefore wrong, and the homepage city
 * counts join silently misses.
 *
 * This script does NOT write to the DB. It prints the corrected
 * dbCitySlug for each SEO city by matching on (name, admin1_name).
 *
 *   pnpm tsx scripts/discover-seo-city-slugs.ts
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

// SEO city.name → list of (name, admin1_name) candidates the cities table
// might store. GeoNames sometimes uses a different canonical name (e.g.
// "Bengaluru" vs "Bangalore", "Kozhikode" vs "Calicut").
const NAME_ALIASES: Record<string, string[]> = {
  Bangalore: ['Bangalore', 'Bengaluru'],
  Calicut: ['Calicut', 'Kozhikode'],
  Mangalore: ['Mangalore', 'Mangaluru'],
  Delhi: ['Delhi', 'New Delhi'],
  Aurangabad: ['Aurangabad', 'Chhatrapati Sambhajinagar'],
};

async function findCity(name: string, state: string) {
  const candidates = NAME_ALIASES[name] ?? [name];
  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from('cities')
      .select('id, name, slug, admin1_name, country_code, population')
      .ilike('name', candidate)
      .eq('admin1_name', state)
      .eq('country_code', 'IN')
      .order('population', { ascending: false, nullsFirst: false })
      .limit(3);
    if (error) {
      return { error: error.message };
    }
    if (data && data.length > 0) {
      return { rows: data, usedCandidate: candidate };
    }
  }
  return { rows: [] };
}

async function main() {
  console.log('\n=== SEO_CITIES → cities.slug discovery ===\n');

  const updates: Array<{ name: string; oldSlug: string; newSlug: string }> = [];
  const problems: string[] = [];

  for (const c of SEO_CITIES) {
    const res = await findCity(c.name, c.state);
    if ('error' in res) {
      console.log(`  ${c.name.padEnd(22)} ERROR ${res.error}`);
      problems.push(`${c.name}: ${res.error}`);
      continue;
    }
    if (!res.rows || res.rows.length === 0) {
      console.log(`  ${c.name.padEnd(22)} NO MATCH (state="${c.state}")`);
      problems.push(`${c.name}: no row in cities for state="${c.state}"`);
      continue;
    }
    const top = res.rows[0] as any;
    const ambiguous = res.rows.length > 1;
    const flag = ambiguous ? ' [ambiguous: ' + res.rows.length + ' rows]' : '';
    const aliasNote = res.usedCandidate && res.usedCandidate !== c.name
      ? ` (matched as "${res.usedCandidate}")` : '';
    console.log(
      `  ${c.name.padEnd(22)} "${c.dbCitySlug}" → "${top.slug}"${aliasNote}${flag}`
    );
    if (top.slug !== c.dbCitySlug) {
      updates.push({ name: c.name, oldSlug: c.dbCitySlug, newSlug: top.slug });
    }
  }

  console.log(`\n=== summary ===`);
  console.log(`  needs update: ${updates.length}`);
  console.log(`  problems    : ${problems.length}`);

  if (problems.length > 0) {
    console.log('\nProblems:');
    for (const p of problems) console.log(`  - ${p}`);
  }

  if (updates.length > 0) {
    console.log('\nCopy-paste replacements for src/lib/seo/cities.ts:');
    for (const u of updates) {
      console.log(`  ${u.name}: '${u.oldSlug}' → '${u.newSlug}'`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
