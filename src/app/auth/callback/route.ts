import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase-env';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as
    | 'email_change'
    | 'signup'
    | 'recovery'
    | 'email'
    | undefined;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://searchumrah.com';

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${baseUrl}/account-settings`);
  }

  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseConfig();

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${baseUrl}/account-settings`);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    return NextResponse.redirect(`${baseUrl}/account-settings`);
  }

  if (type === 'email_change' && data.user) {
    const newEmail = data.user.email;
    const userId = data.user.id;

    if (newEmail && supabaseServiceRoleKey) {
      const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      await admin
        .from('agents')
        .update({ email_id: newEmail })
        .eq('auth_user_id', userId);

      await admin
        .from('user_details')
        .update({ email: newEmail })
        .eq('auth_user_id', userId);
    }
  }

  return NextResponse.redirect(`${baseUrl}/account-settings?email_changed=true`);
}
