import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase-env';

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase configuration is missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
