import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase-env';

// Mirrors the pattern used by /api/agents/reviews: auth-bound client for the
// caller's identity, optional service-role client for writes that need to
// bypass RLS in environments without the policies applied yet.
const getServerSupabase = (authHeader: string) => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
};

const getAdminSupabase = () => {
  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseConfig();
  if (!supabaseUrl) return null;
  if (supabaseServiceRoleKey) {
    return createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  if (supabaseAnonKey) return createClient(supabaseUrl, supabaseAnonKey);
  return null;
};

// Distinguishes "the migration hasn't been applied here yet" from real DB
// errors so we can degrade gracefully — the agent_reviews route follows the
// same pattern for its is_anonymous column.
const isMissingTableError = (err: { code?: string; message?: string } | null | undefined) => {
  if (!err) return false;
  if (err.code === '42P01') return true;
  const msg = String(err.message || '').toLowerCase();
  return msg.includes('relation') && msg.includes('does not exist');
};

const buildName = (profile?: { first_name?: string | null; last_name?: string | null } | null) =>
  [profile?.first_name || '', profile?.last_name || ''].join(' ').trim();

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authSupabase = getServerSupabase(authHeader);
    const adminSupabase = getAdminSupabase();
    if (!authSupabase || !adminSupabase) {
      return NextResponse.json(
        { error: 'Server is not configured for Supabase.' },
        { status: 500 }
      );
    }

    const { data: authData, error: authError } = await authSupabase.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = authData.user;

    const { supabaseServiceRoleKey } = getSupabaseConfig();
    const hasServiceRole = !!supabaseServiceRoleKey;
    const readSupabase = hasServiceRole ? adminSupabase : authSupabase;
    const writeSupabase = hasServiceRole ? adminSupabase : authSupabase;

    const { data: userDetails } = await readSupabase
      .from('user_details')
      .select('user_type, first_name, last_name, phone')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    // Agent accounts browsing other agents shouldn't generate leads — but we
    // still let them reveal the number (return 200 with recorded=false so the
    // front-end unlocks the UI). Matches the convention used by reviews.
    const isAgentAccount =
      (userDetails?.user_type || '').toLowerCase().trim() === 'agent';
    if (isAgentAccount) {
      return NextResponse.json(
        { ok: true, recorded: false, reason: 'agent_account' },
        { status: 200 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const agentId = String(body?.agentId || '').trim();
    if (!agentId) {
      return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
    }

    const { data: agentRow, error: agentErr } = await readSupabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .maybeSingle();
    if (agentErr || !agentRow) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const fallbackName = user.email ? user.email.split('@')[0] : '';
    const payload = {
      agent_id: agentId,
      user_id: user.id,
      user_name: buildName(userDetails || undefined) || fallbackName,
      user_email: user.email || '',
      user_phone: ((userDetails?.phone as string | null) || '').trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await writeSupabase
      .from('agent_interests')
      .upsert(payload, { onConflict: 'agent_id,user_id' });

    if (upsertErr) {
      // Graceful degradation when the migration hasn't been applied yet —
      // let the front-end reveal so existing contact flows keep working.
      if (isMissingTableError(upsertErr)) {
        return NextResponse.json(
          { ok: true, recorded: false, reason: 'not_migrated' },
          { status: 200 }
        );
      }
      console.error('agent_interests upsert failed:', upsertErr);
      return NextResponse.json({ error: 'Failed to record interest' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, recorded: true }, { status: 200 });
  } catch (err) {
    console.error('agent interest POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authSupabase = getServerSupabase(authHeader);
    const adminSupabase = getAdminSupabase();
    if (!authSupabase || !adminSupabase) {
      return NextResponse.json(
        { error: 'Server is not configured for Supabase.' },
        { status: 500 }
      );
    }

    const { data: authData, error: authError } = await authSupabase.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = authData.user;

    const { supabaseServiceRoleKey } = getSupabaseConfig();
    const hasServiceRole = !!supabaseServiceRoleKey;
    const readSupabase = hasServiceRole ? adminSupabase : authSupabase;

    // Resolve the agent row owned by this auth user. Defense-in-depth: even
    // though the RLS policy would also filter, scoping the query server-side
    // means a misconfigured policy can't leak other agents' leads.
    const { data: agentRow, error: agentErr } = await readSupabase
      .from('agents')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (agentErr) {
      console.error('Failed to resolve agent for interests:', agentErr);
      return NextResponse.json({ error: 'Failed to resolve agent' }, { status: 500 });
    }
    if (!agentRow) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: rows, error: rowsErr } = await readSupabase
      .from('agent_interests')
      .select(
        'id, agent_id, user_id, user_name, user_email, user_phone, created_at, updated_at'
      )
      .eq('agent_id', agentRow.id)
      .order('created_at', { ascending: false });

    if (rowsErr) {
      if (isMissingTableError(rowsErr)) {
        // Migration not applied here — return an empty list so the page
        // renders the empty-state instead of an error.
        return NextResponse.json({ interests: [] }, { status: 200 });
      }
      console.error('Failed to fetch agent_interests:', rowsErr);
      return NextResponse.json({ error: 'Failed to fetch interests' }, { status: 500 });
    }

    return NextResponse.json({ interests: rows ?? [] }, { status: 200 });
  } catch (err) {
    console.error('agent interest GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
