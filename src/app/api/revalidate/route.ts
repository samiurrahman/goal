import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// Paths that can be revalidated on demand. Whitelisting prevents an authenticated
// caller from forcing a refresh of arbitrary pages (cheap DoS vector otherwise).
const ALLOWED_PATHS = new Set<string>(['/packages', '/']);

const getServerSupabase = (authHeader: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase(authHeader);
  if (!supabase) {
    return NextResponse.json(
      { error: 'Server is not configured for Supabase' },
      { status: 500 }
    );
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawPaths: unknown = body?.paths;
  const paths = Array.isArray(rawPaths)
    ? rawPaths.filter((p): p is string => typeof p === 'string')
    : typeof body?.path === 'string'
      ? [body.path as string]
      : [];

  const accepted: string[] = [];
  const rejected: string[] = [];

  for (const path of paths) {
    if (ALLOWED_PATHS.has(path)) {
      revalidatePath(path);
      accepted.push(path);
    } else if (path.startsWith('/') && path.split('/').length === 2) {
      // Allow agent-slug pages like /sami-travels — needed when known_as or
      // packages change so the agent profile page reflects the new content.
      revalidatePath(path);
      accepted.push(path);
    } else if (path.startsWith('/') && path.split('/').length === 3) {
      // Package detail pages: /{agentSlug}/{packageSlug}
      revalidatePath(path);
      accepted.push(path);
    } else {
      rejected.push(path);
    }
  }

  return NextResponse.json({ ok: true, revalidated: accepted, rejected });
}
