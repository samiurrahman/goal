/**
 * Backfill agents.city_id from the legacy agents.city / agents.state text.
 *
 * Strategy: for each agent that has a city text but no city_id, look up the
 * cities table with cities_autocomplete (trigram fuzzy match + population
 * rank). When the top hit's similarity ≥ 0.80, auto-apply. Otherwise, log
 * the row to a CSV for manual review.
 *
 * Idempotent: agents already linked to a city_id are skipped. Re-running
 * just retries the ones still on the no-match list.
 *
 * Usage:
 *   pnpm backfill:agent-cities
 *   pnpm backfill:agent-cities -- --dry-run    # don't write, just print
 *   pnpm backfill:agent-cities -- --threshold=0.7  # lower auto-apply bar
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (service role) — agents writes are
 * gated by RLS for end users; this is a one-shot ops script.
 */

import { config as loadEnv } from 'dotenv';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
for (const file of ['.env.local', '.env']) {
  const p = join(process.cwd(), file);
  if (existsSync(p)) loadEnv({ path: p });
}

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  process.env.SUPABASE_PROJECT_URL;
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY (needed to write agents).'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const thresholdArg = args.find((a) => a.startsWith('--threshold='));
const THRESHOLD = thresholdArg ? Number(thresholdArg.split('=')[1]) : 0.8;
const COUNTRY = 'IN';

type AgentRow = {
  id: number | string;
  auth_user_id: string;
  known_as: string | null;
  city: string | null;
  state: string | null;
  city_id: number | null;
};

type CityHit = {
  id: number;
  slug: string;
  name: string;
  admin1_name: string | null;
  similarity: number;
};

async function fetchUnlinked(): Promise<AgentRow[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('id, auth_user_id, known_as, city, state, city_id')
    .is('city_id', null)
    .not('city', 'is', null);
  if (error) throw error;
  return ((data ?? []) as AgentRow[]).filter((r) => (r.city || '').trim().length > 0);
}

async function findCity(name: string, state: string | null): Promise<CityHit | null> {
  const { data, error } = await supabase.rpc('cities_autocomplete', {
    p_query: name,
    p_country: COUNTRY,
    p_limit: 5,
  });
  if (error || !data) return null;
  const hits = data as CityHit[];
  if (!hits.length) return null;

  // When the agent recorded a state, prefer hits in the same state — even
  // a slightly lower similarity score is more trustworthy than a top hit
  // in a different state (Hyderabad-TS vs Hyderabad-Pakistan kind of thing).
  if (state) {
    const stateLower = state.toLowerCase();
    const sameState = hits.find(
      (h) => (h.admin1_name || '').toLowerCase() === stateLower
    );
    if (sameState) return sameState;
  }
  return hits[0];
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

async function main() {
  console.log(
    `Backfilling agents.city_id (threshold ${THRESHOLD}${DRY_RUN ? ', dry-run' : ''})…`
  );

  const agents = await fetchUnlinked();
  console.log(`  ${agents.length} agents need linking.`);

  const autoApplied: Array<{ agent: AgentRow; hit: CityHit }> = [];
  const needsReview: Array<{ agent: AgentRow; hit: CityHit | null }> = [];

  for (const agent of agents) {
    const hit = await findCity(agent.city!, agent.state);
    if (hit && hit.similarity >= THRESHOLD) {
      autoApplied.push({ agent, hit });
    } else {
      needsReview.push({ agent, hit });
    }
  }

  console.log(
    `  auto-match ≥ ${THRESHOLD}: ${autoApplied.length}.  needs review: ${needsReview.length}.`
  );

  if (!DRY_RUN && autoApplied.length > 0) {
    // Updates are issued one at a time so a single bad row doesn't roll
    // back the whole batch. 50 agents finishes in well under a second.
    for (const { agent, hit } of autoApplied) {
      const { error } = await supabase
        .from('agents')
        .update({ city_id: hit.id })
        .eq('id', agent.id);
      if (error) {
        console.warn(`    skipped agent ${agent.id} (${agent.known_as}):`, error.message);
      }
    }
    console.log(`  applied city_id to ${autoApplied.length} agents.`);
  }

  if (needsReview.length > 0) {
    const outDir = join(process.cwd(), 'tmp');
    if (!existsSync(outDir)) mkdirSync(outDir);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const csvPath = join(outDir, `agent-city-review-${ts}.csv`);
    const header = [
      'agent_id',
      'known_as',
      'agent_city_text',
      'agent_state_text',
      'best_match_slug',
      'best_match_name',
      'best_match_state',
      'similarity',
      'reason',
    ];
    const rows = needsReview.map(({ agent, hit }) => [
      String(agent.id),
      agent.known_as || '',
      agent.city || '',
      agent.state || '',
      hit?.slug ?? '',
      hit?.name ?? '',
      hit?.admin1_name ?? '',
      hit ? hit.similarity.toFixed(3) : '',
      hit ? `similarity ${hit.similarity.toFixed(3)} < ${THRESHOLD}` : 'no candidate found',
    ]);
    const csv = [header, ...rows]
      .map((cols) => cols.map((c) => escapeCsv(String(c))).join(','))
      .join('\n');
    writeFileSync(csvPath, csv, 'utf8');
    console.log(`  wrote review CSV → ${csvPath}`);
    console.log(
      `  open it, fill in the right slug per row, then run a small SQL UPDATE to apply.`
    );
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('\nBackfill failed:', err);
  process.exit(1);
});
