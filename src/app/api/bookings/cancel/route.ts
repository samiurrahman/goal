import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getServerSupabase = (authHeader: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
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
  const rawReason = typeof body?.reason === 'string' ? body.reason.trim() : '';

  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: 'Invalid bookingId' }, { status: 400 });
  }

  const userId = authData.user.id;

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, auth_user_id, agent_id, status')
    .eq('id', bookingId)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  let cancelledBy: 'agent' | 'user';
  if (booking.agent_id === userId) {
    cancelledBy = 'agent';
  } else if (booking.auth_user_id === userId) {
    cancelledBy = 'user';
  } else {
    return NextResponse.json({ error: 'Not authorised for this booking' }, { status: 403 });
  }

  const currentStatus = (booking.status || '').toLowerCase();
  if (currentStatus === 'cancelled') {
    return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 409 });
  }
  if (currentStatus !== 'pending' && currentStatus !== 'confirmed') {
    return NextResponse.json(
      { error: `Cannot cancel a booking in '${currentStatus}' state` },
      { status: 409 }
    );
  }

  if (cancelledBy === 'agent' && !rawReason) {
    return NextResponse.json(
      { error: 'Reason is required when an agent rejects a booking' },
      { status: 400 }
    );
  }

  const patch: Record<string, unknown> = {
    status: 'cancelled',
    cancelled_by: cancelledBy,
    cancellation_reason: rawReason || null,
    readByAgent: false,
    readByUser: false,
  };

  const { error: updateError } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', bookingId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, cancelledBy });
}
