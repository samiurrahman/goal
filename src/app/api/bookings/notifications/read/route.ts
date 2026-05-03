import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ReadTarget = 'agent' | 'user';

const getServerSupabase = (authHeader: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServerSupabase(authHeader);
  if (!supabase) {
    return NextResponse.json({ error: 'Server is not configured for Supabase' }, { status: 500 });
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const bookingId = Number(body?.bookingId);
  const target = body?.target as ReadTarget;

  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
  }

  if (target !== 'agent' && target !== 'user') {
    return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
  }

  const userId = authData.user.id;

  const accessColumn = target === 'agent' ? 'agent_id' : 'auth_user_id';
  const patch = target === 'agent' ? { readByAgent: true } : { readByUser: true };

  const { error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', bookingId)
    .eq(accessColumn, userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
