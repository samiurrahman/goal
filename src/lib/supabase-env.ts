/**
 * Centralized Supabase environment configuration
 * Reads from process.env with fallback logic for multiple naming conventions
 * Safe for both client (public vars) and server (private vars) code
 */

export const getSupabaseConfig = () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    process.env.SUPABASE_KEY;

  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
  };
};

export const validateSupabaseConfig = (
  config: ReturnType<typeof getSupabaseConfig>
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.supabaseUrl) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is not set');
  }

  if (!config.supabaseAnonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
