/**
 * Seed the `cities` table from GeoNames.
 *
 * Source: https://download.geonames.org/export/dump/IN.zip
 *   - All populated places in India (~30K rows).
 *   - Licensed CC-BY-4.0 — attribution required on the live site.
 *   - Refresh cadence: monthly. Re-running this script is idempotent
 *     (ON CONFLICT (geonames_id) DO UPDATE).
 *
 * Usage:
 *   pnpm seed:cities                 # downloads IN.zip + admin1Codes + alt names, seeds India
 *   COUNTRY=US pnpm seed:cities      # any ISO-2 country code
 *   COUNTRY=ALL pnpm seed:cities     # cities500.zip → worldwide (Phase 2)
 *
 * Required env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service role
 * bypasses RLS — the cities table is read-public, write-service-role).
 */

// Load .env.local / .env BEFORE we import anything that reads process.env.
// tsx (and plain Node) don't apply Next.js's convention automatically — this
// keeps the CLI workflow identical to `next dev` so contributors don't have
// to remember to export variables in their shell.
import { config as loadEnv } from 'dotenv';
import { existsSync as envExists } from 'fs';
import { join as envJoin } from 'path';
for (const file of ['.env.local', '.env']) {
  const p = envJoin(process.cwd(), file);
  if (envExists(p)) loadEnv({ path: p });
}

import { createClient } from '@supabase/supabase-js';
import { createWriteStream, createReadStream, existsSync, mkdirSync } from 'fs';
import { readFile } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createInterface } from 'readline';
import { createUnzip } from 'zlib';
import * as https from 'https';
import AdmZip from 'adm-zip';

const COUNTRY = (process.env.COUNTRY || 'IN').toUpperCase();
const WORLDWIDE = COUNTRY === 'ALL';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.SUPABASE_PROJECT_URL;

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY. The seed needs ' +
      'the service role key because the cities table is RLS-locked for writes.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const CACHE_DIR = join(tmpdir(), 'geonames-seed');
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

const GEONAMES_BASE = 'https://download.geonames.org/export/dump';

// GeoNames "feature class P" = populated place. We keep:
//   PPL/PPLA/PPLA2/.../PPLC — cities, towns, capitals, district seats.
//   PPLX (subdivision of city) and PPLF (farm village) excluded — too noisy
//   for an Umrah package booking flow.
const ACCEPTED_FEATURE_CODES = new Set([
  'PPL', 'PPLA', 'PPLA2', 'PPLA3', 'PPLA4', 'PPLA5', 'PPLC', 'PPLG', 'PPLS',
]);

// GeoNames table columns in fixed order — see
//   https://download.geonames.org/export/dump/readme.txt
const COLUMNS = [
  'geonameid', 'name', 'asciiname', 'alternatenames', 'latitude', 'longitude',
  'feature_class', 'feature_code', 'country_code', 'cc2', 'admin1_code',
  'admin2_code', 'admin3_code', 'admin4_code', 'population', 'elevation',
  'dem', 'timezone', 'modification_date',
] as const;

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (existsSync(dest)) {
      console.log(`  cached: ${dest}`);
      return resolve();
    }
    console.log(`  fetching ${url}`);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        pipeline(res, createWriteStream(dest)).then(resolve, reject);
      })
      .on('error', reject);
  });
}

// GeoNames distributes country dumps as zip files. Node's built-in zlib
// only handles gzip/deflate, not zip — adm-zip gives us a sync, cross-
// platform API that works on Windows without requiring `unzip` on PATH.
function unzipFile(zipPath: string, outDir: string): string {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(outDir, /* overwrite */ true);
  // GeoNames country zips contain a single <CC>.txt file inside.
  // cities500.zip contains cities500.txt.
  return WORLDWIDE ? join(outDir, 'cities500.txt') : join(outDir, `${COUNTRY}.txt`);
}

function slugify(name: string, country: string, admin1: string | null): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return [base, country.toLowerCase(), (admin1 || '').toLowerCase()].filter(Boolean).join('-');
}

async function loadAdmin1Names(): Promise<Map<string, string>> {
  // admin1CodesASCII.txt maps "<country>.<admin1code>" → human name.
  // Lets us store "Maharashtra" alongside "MH" for display in autocomplete.
  const path = join(CACHE_DIR, 'admin1CodesASCII.txt');
  await download(`${GEONAMES_BASE}/admin1CodesASCII.txt`, path);
  const text = await readFile(path, 'utf8');
  const map = new Map<string, string>();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const [key, name] = line.split('\t');
    if (key && name) map.set(key, name);
  }
  return map;
}

type CityRow = {
  geonames_id: number;
  name: string;
  ascii_name: string;
  alt_names: string[];
  country_code: string;
  admin1_code: string | null;
  admin1_name: string | null;
  population: number;
  // PostGIS accepts WKT — `POINT(lng lat)` — via the geography cast. Keeps
  // the upsert payload pure JSON instead of having to pre-compute hex.
  geog: string;
  slug: string;
};

async function* streamRows(tsvPath: string, admin1: Map<string, string>): AsyncGenerator<CityRow> {
  const stream = tsvPath.endsWith('.gz')
    ? createReadStream(tsvPath).pipe(createUnzip())
    : createReadStream(tsvPath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream as NodeJS.ReadableStream, crlfDelay: Infinity });
  const seenSlugs = new Set<string>();

  for await (const raw of rl) {
    if (!raw) continue;
    const cols = raw.split('\t');
    if (cols.length < COLUMNS.length) continue;

    const featureClass = cols[6];
    const featureCode = cols[7];
    if (featureClass !== 'P') continue;
    if (!ACCEPTED_FEATURE_CODES.has(featureCode)) continue;

    // Skip zero-population entries unless they're an administrative seat —
    // GeoNames lists thousands of tiny hamlets that just clutter autocomplete.
    const population = parseInt(cols[14] || '0', 10) || 0;
    const isSeat = featureCode.startsWith('PPLA') || featureCode === 'PPLC';
    if (population < 500 && !isSeat) continue;

    const countryCode = cols[8];
    const admin1Code = cols[10] || null;
    const admin1Name = admin1Code ? admin1.get(`${countryCode}.${admin1Code}`) ?? null : null;

    let slug = slugify(cols[2] || cols[1], countryCode, admin1Code);
    // Same-name collisions (every country has a "Springfield"). Disambiguate
    // by appending the GeoNames ID — guaranteed unique, stable across re-seeds.
    if (seenSlugs.has(slug)) slug = `${slug}-${cols[0]}`;
    seenSlugs.add(slug);

    yield {
      geonames_id: parseInt(cols[0], 10),
      name: cols[1],
      ascii_name: cols[2] || cols[1],
      alt_names: cols[3] ? cols[3].split(',').slice(0, 20) : [], // cap to avoid 5KB rows
      country_code: countryCode,
      admin1_code: admin1Code,
      admin1_name: admin1Name,
      population,
      geog: `SRID=4326;POINT(${cols[5]} ${cols[4]})`,
      slug,
    };
  }
}

async function upsertBatch(batch: CityRow[]): Promise<void> {
  const { error } = await supabase
    .from('cities')
    .upsert(batch, { onConflict: 'geonames_id', ignoreDuplicates: false });
  if (error) throw error;
}

async function main() {
  console.log(`Seeding cities for ${WORLDWIDE ? 'WORLDWIDE (cities500)' : COUNTRY}…`);

  const admin1 = await loadAdmin1Names();

  const zipName = WORLDWIDE ? 'cities500.zip' : `${COUNTRY}.zip`;
  const zipPath = join(CACHE_DIR, zipName);
  await download(`${GEONAMES_BASE}/${zipName}`, zipPath);
  const tsvPath = unzipFile(zipPath, CACHE_DIR);

  const BATCH_SIZE = 500;
  let batch: CityRow[] = [];
  let total = 0;

  for await (const row of streamRows(tsvPath, admin1)) {
    batch.push(row);
    if (batch.length >= BATCH_SIZE) {
      await upsertBatch(batch);
      total += batch.length;
      process.stdout.write(`\r  upserted ${total} rows`);
      batch = [];
    }
  }
  if (batch.length) {
    await upsertBatch(batch);
    total += batch.length;
  }
  process.stdout.write(`\r  upserted ${total} rows\n`);
  console.log('Done.');
}

main().catch((err) => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});
