/**
 * One-shot: mark every auth user created by the bulk-bootstrap script
 * (source='bulk-bootstrap') as email-confirmed, so they can log in.
 *
 * Why this script exists: the first batch of 5 was created with
 * email_confirm:false, which made Supabase reject their logins. The main
 * script has been updated to email_confirm:true going forward; this fixes
 * up the rows that were already created.
 *
 * Safe to re-run: setting email_confirmed_at on an already-confirmed user
 * is a no-op.
 *
 *   pnpm tsx scripts/confirm-bootstrap-auth-users.ts
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

async function main() {
  // listUsers is paginated (default 50 per page, max 1000). Walk pages.
  let page = 1;
  const perPage = 200;
  const targets: { id: string; email: string | undefined }[] = [];

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      const meta = (u.user_metadata || {}) as { source?: string };
      const isBootstrap = meta.source === 'bulk-bootstrap';
      const unconfirmed = !u.email_confirmed_at;
      if (isBootstrap && unconfirmed) {
        targets.push({ id: u.id, email: u.email });
      }
    }
    if (users.length < perPage) break;
    page++;
  }

  console.log(`Found ${targets.length} bootstrap users needing confirmation.`);
  if (targets.length === 0) return;

  let fixed = 0;
  for (const t of targets) {
    const { error } = await supabase.auth.admin.updateUserById(t.id, {
      email_confirm: true,
    });
    if (error) {
      console.warn(`  ✗ ${t.email}: ${error.message}`);
      continue;
    }
    fixed++;
    console.log(`  ✓ ${t.email}`);
  }

  console.log(`\nConfirmed ${fixed}/${targets.length}.`);
}

main().catch((err) => {
  console.error('\nScript failed:', err);
  process.exit(1);
});
