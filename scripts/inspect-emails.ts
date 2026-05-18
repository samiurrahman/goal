/**
 * Quick check: are the placeholder emails unique per agent, or shared?
 * Supabase auth.users.email is unique — duplicates will fail createUser.
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

const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data } = await supabase.from('agents').select('id, email_id, slug, known_as');
  const rows = data ?? [];
  const emailCounts = new Map<string, number>();
  for (const r of rows) {
    const e = (r.email_id || '').toLowerCase().trim();
    if (!e) continue;
    emailCounts.set(e, (emailCounts.get(e) ?? 0) + 1);
  }
  const duplicates = [...emailCounts.entries()].filter(([, n]) => n > 1);
  console.log(`unique emails: ${emailCounts.size}`);
  console.log(`emails with duplicates: ${duplicates.length}`);
  if (duplicates.length) {
    console.log('top duplicates:');
    duplicates
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([e, n]) => console.log(`  ${n}×  ${e}`));
  }
  console.log('\nsample of 5 placeholder emails (to see the pattern):');
  rows
    .filter((r) => (r.email_id || '').includes('@example.com'))
    .slice(0, 5)
    .forEach((r) => console.log(`  ${r.email_id}  →  ${r.slug || r.known_as}`));
}
main();
