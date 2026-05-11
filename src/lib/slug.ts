import { supabase } from '@/utils/supabaseClient';
import { RESERVED_AGENT_SLUGS } from './reservedSlugs';

export { RESERVED_AGENT_SLUGS };

/** Convert arbitrary text to a URL-safe slug. */
export const slugify = (value: string): string =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

export class ReservedSlugError extends Error {
  constructor(slug: string) {
    super(`The slug "${slug}" is reserved. Please pick a different name.`);
    this.name = 'ReservedSlugError';
  }
}

const MAX_SUFFIX = 99;

/**
 * Generate a unique slug for `agents.slug`.
 *
 * - Slugifies the input
 * - Rejects reserved words
 * - Probes the DB for an unused candidate, appending -2, -3 … on collision
 *
 * The DB still has a UNIQUE constraint as the safety net for races; this
 * helper is the friendly UX layer.
 */
export async function allocateAgentSlug(name: string): Promise<string> {
  const base = slugify(name);
  if (!base) throw new Error('Cannot generate a slug from an empty name.');
  if (RESERVED_AGENT_SLUGS.has(base)) {
    throw new ReservedSlugError(base);
  }

  for (let i = 0; i <= MAX_SUFFIX; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (RESERVED_AGENT_SLUGS.has(candidate)) continue;

    const { data, error } = await supabase
      .from('agents')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  throw new Error('Could not allocate a unique agent slug after many attempts.');
}

/**
 * Generate a unique slug for `packages.slug`, scoped to a single agent.
 * Two different agents are allowed to have the same package slug — this
 * only enforces uniqueness *within* one agent's catalog.
 */
export async function allocatePackageSlug(
  agentId: string,
  title: string,
  excludePackageId?: number | string
): Promise<string> {
  const base = slugify(title);
  if (!base) throw new Error('Cannot generate a slug from an empty title.');

  for (let i = 0; i <= MAX_SUFFIX; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    let query = supabase
      .from('packages')
      .select('id')
      .eq('agent_id', agentId)
      .eq('slug', candidate);
    if (excludePackageId !== undefined && excludePackageId !== null) {
      query = query.neq('id', excludePackageId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }
  throw new Error('Could not allocate a unique package slug after many attempts.');
}

const isUniqueViolation = (err: { code?: string; message?: string } | null) => {
  if (!err) return false;
  if (err.code === '23505') return true;
  return /duplicate key|unique constraint|already exists/i.test(err.message || '');
};

/**
 * Insert an agent row with a unique slug, retrying on race-condition
 * unique-constraint violations. The allocator is called fresh on each retry,
 * so a competing insert that grabs `iqra-travels-2` will result in this
 * caller receiving `iqra-travels-3` automatically.
 *
 * @param sourceName name to derive the slug from (e.g. "Iqra Travels")
 * @param payload    other agent columns to insert (without `slug`)
 * @param retries    number of retries on unique violation (default 2)
 */
export async function insertAgentWithUniqueSlug(
  sourceName: string,
  payload: Record<string, unknown>,
  retries = 2
): Promise<{ slug: string; error: { message: string; code?: string } | null }> {
  let lastError: { message: string; code?: string } | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const slug = await allocateAgentSlug(sourceName);
    const { error } = await supabase.from('agents').insert({ ...payload, slug });

    if (!error) {
      return { slug, error: null };
    }

    lastError = { message: error.message, code: error.code };

    if (!isUniqueViolation(error) || attempt === retries) {
      return { slug, error: lastError };
    }
    // else: race lost — loop allocates a fresh higher suffix and retries
  }

  return { slug: '', error: lastError };
}
