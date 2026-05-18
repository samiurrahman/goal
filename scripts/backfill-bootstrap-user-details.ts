/**
 * One-shot: for every auth user created by the bulk-bootstrap script
 * (source='bulk-bootstrap') that has NO matching user_details row, insert
 * one with user_type='agent'. Without it, SupabaseSessionSync creates the
 * row on first login defaulted to user_type='user', which routes the
 * agent into the wrong UI (/account instead of /profile).
 *
 * Safe to re-run: rows that already exist are skipped.
 *
 *   pnpm tsx scripts/backfill-bootstrap-user-details.ts
 */

import { config as loadEnv } from 'dotenv';
import { existsSync } from 'fs';
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
  console.error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listBootstrapAuthUsers() {
  let page = 1;
  const perPage = 200;
  const out: { id: string; email: string | undefined }[] = [];
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      const meta = (u.user_metadata || {}) as { source?: string };
      if (meta.source === 'bulk-bootstrap') out.push({ id: u.id, email: u.email });
    }
    if (users.length < perPage) break;
    page++;
  }
  return out;
}

async function main() {
  const bootstrapUsers = await listBootstrapAuthUsers();
  console.log(`Found ${bootstrapUsers.length} bootstrap auth users.`);

  const authIds = bootstrapUsers.map((u) => u.id);
  if (authIds.length === 0) return;

  // Find which ones already have user_details so we don't double-insert.
  const { data: existingDetails, error: detailsErr } = await supabase
    .from('user_details')
    .select('auth_user_id, user_type')
    .in('auth_user_id', authIds);
  if (detailsErr) throw detailsErr;

  const existingByAuth = new Map(
    (existingDetails ?? []).map((r: { auth_user_id: string; user_type: string }) => [
      r.auth_user_id,
      r.user_type,
    ])
  );

  // Pull agent names so the inserted user_details have a sensible first_name.
  const { data: agents, error: agentsErr } = await supabase
    .from('agents')
    .select('auth_user_id, name, known_as')
    .in('auth_user_id', authIds);
  if (agentsErr) throw agentsErr;
  const nameByAuth = new Map(
    (agents ?? []).map((a: { auth_user_id: string; name: string; known_as: string }) => [
      a.auth_user_id,
      a.known_as || a.name || null,
    ])
  );

  const toInsert = bootstrapUsers.filter((u) => !existingByAuth.has(u.id));
  const wrongType = bootstrapUsers.filter(
    (u) => existingByAuth.get(u.id) && existingByAuth.get(u.id) !== 'agent'
  );

  console.log(`  missing user_details:        ${toInsert.length}`);
  console.log(`  wrong user_type (will fix):  ${wrongType.length}`);

  for (const u of toInsert) {
    const { error } = await supabase.from('user_details').insert({
      auth_user_id: u.id,
      user_type: 'agent',
      first_name: nameByAuth.get(u.id) ?? null,
    });
    if (error) {
      console.warn(`  ✗ insert ${u.email}: ${error.message}`);
    } else {
      console.log(`  ✓ inserted ${u.email}`);
    }
  }

  for (const u of wrongType) {
    const { error } = await supabase
      .from('user_details')
      .update({ user_type: 'agent' })
      .eq('auth_user_id', u.id);
    if (error) {
      console.warn(`  ✗ update ${u.email}: ${error.message}`);
    } else {
      console.log(`  ✓ updated user_type→agent for ${u.email}`);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('\nScript failed:', err);
  process.exit(1);
});
