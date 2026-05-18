/**
 * Bulk-create Supabase auth users for every agent that doesn't already
 * have an `auth_user_id`, using the email already on file. No invitation
 * email is sent — uses admin createUser with email_confirm=false so the
 * placeholder `@example.com` addresses don't trigger Supabase to mail
 * non-existent recipients.
 *
 * For each created user:
 *   - generates a strong random password
 *   - links agents.auth_user_id → new auth.users.id
 *   - appends { email, password, agent_id, slug, known_as } to a CSV in tmp/
 *
 * Dry-run is the default. Re-run with --apply to actually create users.
 *
 * Usage:
 *   pnpm tsx scripts/create-agent-auth.ts            # dry-run, prints plan
 *   pnpm tsx scripts/create-agent-auth.ts --apply    # writes for real
 *   pnpm tsx scripts/create-agent-auth.ts --apply --limit=5   # cap to N
 *
 * Idempotent: agents already linked are skipped. Re-running picks up the
 * remainder. Emails that collide with existing auth users are reported
 * and skipped (no crash).
 */

import { config as loadEnv } from 'dotenv';
import { existsSync, writeFileSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';
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

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

type AgentRow = {
  id: string;
  auth_user_id: string | null;
  email_id: string | null;
  slug: string | null;
  known_as: string | null;
  name: string | null;
};

// 24 random bytes → 32 base64url chars. Plenty of entropy and URL-safe
// so the CSV is easy to copy/paste without quoting drama.
function generatePassword(): string {
  return randomBytes(24).toString('base64url');
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

async function fetchAgentsNeedingAuth(): Promise<AgentRow[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('id, auth_user_id, email_id, slug, known_as, name')
    .is('auth_user_id', null);
  if (error) throw error;
  return ((data ?? []) as AgentRow[]).filter((a) => !!a.email_id?.trim());
}

async function main() {
  console.log(
    `Create-agent-auth ${APPLY ? '(LIVE — will write to auth.users)' : '(dry-run, no writes)'}`
  );
  if (LIMIT !== Infinity) console.log(`  capped to first ${LIMIT} agents.`);

  const agents = await fetchAgentsNeedingAuth();
  console.log(`  ${agents.length} agents need auth users created.`);

  const slice = agents.slice(0, LIMIT);
  console.log(`  processing ${slice.length}.`);

  if (!APPLY) {
    console.log('\nWould create auth users for:');
    slice
      .slice(0, 10)
      .forEach((a) =>
        console.log(`  • ${a.email_id}  →  ${a.slug || a.known_as || a.id}`)
      );
    if (slice.length > 10) console.log(`  ...and ${slice.length - 10} more.`);
    console.log('\nRe-run with --apply to create them.');
    return;
  }

  // Prepare CSV output up front so even a partial run leaves a usable file.
  const outDir = join(process.cwd(), 'tmp');
  if (!existsSync(outDir)) mkdirSync(outDir);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const csvPath = join(outDir, `agent-creds-${ts}.csv`);
  writeFileSync(
    csvPath,
    ['agent_id', 'slug', 'known_as', 'email', 'password', 'auth_user_id']
      .map(csvEscape)
      .join(',') + '\n',
    'utf8'
  );
  console.log(`  writing creds → ${csvPath}\n`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const agent of slice) {
    const email = agent.email_id!.trim().toLowerCase();
    const password = generatePassword();

    // email_confirm:true → mark as confirmed at the auth layer so the agent
    // can log in immediately. This is *only* about auth.users.email_confirmed_at
    // (otherwise the login page rejects them with "email not confirmed").
    // Distinct from agents.email_isVerified, which stays null until the agent
    // updates to a real address and clicks the Verify link in /profile.
    // No invitation email is sent — admin createUser never fires email.
    const { data: createRes, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { agent_id: agent.id, source: 'bulk-bootstrap' },
    });

    if (createErr || !createRes?.user) {
      // Most likely cause: email already exists in auth.users (e.g. the
      // duplicate gmail row, or a previous partial run). Log and move on.
      console.warn(
        `  ✗ ${email}  (${agent.slug || agent.id}):  ${createErr?.message ?? 'no user returned'}`
      );
      failed++;
      continue;
    }

    const newUserId = createRes.user.id;

    const { error: linkErr } = await supabase
      .from('agents')
      .update({ auth_user_id: newUserId })
      .eq('id', agent.id);

    if (linkErr) {
      // Auth user was created but agents row didn't get linked. Surface
      // loudly — manual fixup needed, or this user will get re-created on
      // the next run and hit the "already exists" branch above.
      console.warn(
        `  ! ${email}: created auth user ${newUserId} but failed to link agent ${agent.id}: ${linkErr.message}`
      );
      // Still write the cred so the auth user isn't orphaned silently.
    }

    // Also seed user_details with user_type='agent'. Without this row,
    // SupabaseSessionSync creates one on first login defaulted to
    // user_type='user' (because plain /login carries no ?userType param),
    // which routes the agent into the wrong account UI. Pre-seeding here
    // makes the bootstrap end-to-end: agent logs in → /profile, not /account.
    const { error: detailsErr } = await supabase.from('user_details').insert({
      auth_user_id: newUserId,
      user_type: 'agent',
      first_name: agent.known_as || agent.name || null,
    });
    if (detailsErr) {
      console.warn(
        `  ! ${email}: created auth user but failed to insert user_details: ${detailsErr.message}`
      );
    }

    appendFileSync(
      csvPath,
      [agent.id, agent.slug || '', agent.known_as || '', email, password, newUserId]
        .map((v) => csvEscape(String(v)))
        .join(',') + '\n',
      'utf8'
    );

    created++;
    if (created % 25 === 0) {
      console.log(`  ...created ${created}/${slice.length}`);
    }
    skipped; // (placeholder — currently we only skip via filter above)
  }

  console.log('');
  console.log(`Created:  ${created}`);
  console.log(`Skipped:  ${skipped}`);
  console.log(`Failed:   ${failed}`);
  console.log(`CSV:      ${csvPath}`);
  console.log('\nDONE. Keep the CSV safe — passwords are not recoverable.');
}

main().catch((err) => {
  console.error('\nScript failed:', err);
  process.exit(1);
});
