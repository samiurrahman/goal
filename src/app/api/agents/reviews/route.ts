import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const getSupabaseEnv = () => {
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

const getServerSupabase = (authHeader: string) => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

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

const getAdminSupabase = () => {
  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseEnv();

  if (!supabaseUrl) {
    return null;
  }

  // Prefer service role in production to avoid RLS-related read/write failures.
  if (supabaseServiceRoleKey) {
    return createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  if (supabaseAnonKey) {
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  return null;
};

const normalizeReview = (row: Record<string, any>) => {
  return {
    id: row.id,
    agent_id: row.agent_id,
    user_id: row.user_id,
    user_email: row.user_email || '',
    user_name: row.user_name || 'Anonymous',
    user_profile_image: row.user_profile_image || null,
    rating: row.rating,
    review_text: row.review_text,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

export async function POST(request: NextRequest) {
  try {
    const { supabaseServiceRoleKey, supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
    const hasServiceRole = !!supabaseServiceRoleKey;

    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authSupabase = getServerSupabase(authHeader);
    const adminSupabase = getAdminSupabase();
    if (!authSupabase || !adminSupabase) {
      return NextResponse.json(
        {
          error:
            'Server is not configured for Supabase (missing URL or anon key). Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
          debug: {
            hasSupabaseUrl: !!supabaseUrl,
            hasSupabaseAnonKey: !!supabaseAnonKey,
            hasSupabaseServiceRoleKey: !!supabaseServiceRoleKey,
          },
        },
        { status: 500 }
      );
    }

    const { data: authData, error: authError } = await authSupabase.auth.getUser();
    if (authError || !authData?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If service role is unavailable (e.g., local/dev), use auth-bound client for RLS-safe writes.
    const readSupabase = hasServiceRole ? adminSupabase : authSupabase;
    const writeSupabase = hasServiceRole ? adminSupabase : authSupabase;

    // Only normal users can review agents. Agent accounts are blocked.
    const { data: userDetails } = await readSupabase
      .from('user_details')
      .select('user_type')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    const isAgentUserType = (userDetails?.user_type || '').toLowerCase().trim() === 'agent';
    if (isAgentUserType) {
      return NextResponse.json({ error: 'Only users can submit agent reviews' }, { status: 403 });
    }

    const { agentId, rating, reviewText } = await request.json();

    // Validate input
    if (!agentId || !rating || !reviewText) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, rating, reviewText' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json(
        { error: 'Rating must be an integer between 1 and 5' },
        { status: 400 }
      );
    }

    if (reviewText.trim().length < 5) {
      return NextResponse.json(
        { error: 'Review text must be at least 5 characters' },
        { status: 400 }
      );
    }

    // Check if agent exists
    const { data: agentExists, error: agentCheckError } = await readSupabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .single();

    if (agentCheckError || !agentExists) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Insert or update review (upsert)
    // Keep payload limited to guaranteed columns for cross-environment compatibility.
    const reviewPayload = {
      agent_id: agentId,
      user_id: authData.user.id,
      rating: rating,
      review_text: reviewText.trim(),
      updated_at: new Date().toISOString(),
    };

    let review: any[] | null = null;
    let reviewError: any = null;

    const upsertResult = await writeSupabase
      .from('agent_reviews')
      .upsert(reviewPayload, { onConflict: 'agent_id,user_id' })
      .select('id, agent_id, user_id, rating, review_text, created_at, updated_at');

    review = upsertResult.data;
    reviewError = upsertResult.error;

    const needsConflictFallback =
      !!reviewError &&
      (reviewError.code === '42P10' ||
        String(reviewError.message || '').includes('ON CONFLICT specification'));

    if (needsConflictFallback) {
      const { data: existingReview, error: existingReviewError } = await writeSupabase
        .from('agent_reviews')
        .select('id')
        .eq('agent_id', agentId)
        .eq('user_id', authData.user.id)
        .maybeSingle();

      if (existingReviewError) {
        console.error('Error checking existing review:', existingReviewError);
        return NextResponse.json(
          { error: 'Failed to submit review: ' + existingReviewError.message },
          { status: 500 }
        );
      }

      const fallbackMutation = existingReview?.id
        ? await writeSupabase
            .from('agent_reviews')
            .update(reviewPayload)
            .eq('id', existingReview.id)
            .select('id, agent_id, user_id, rating, review_text, created_at, updated_at')
        : await writeSupabase
            .from('agent_reviews')
            .insert(reviewPayload)
            .select('id, agent_id, user_id, rating, review_text, created_at, updated_at');

      review = fallbackMutation.data;
      reviewError = fallbackMutation.error;
    }

    if (reviewError) {
      console.error('Error submitting review:', reviewError);
      return NextResponse.json(
        { error: 'Failed to submit review: ' + reviewError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Review submitted successfully',
        review: review?.[0] ? normalizeReview(review[0]) : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in review submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json({ error: 'agentId query parameter is required' }, { status: 400 });
    }

    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseEnv();
    const supabase = getAdminSupabase();

    if (!supabase) {
      return NextResponse.json(
        {
          error:
            'Server is not configured for Supabase (missing URL or key). Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
          debug: {
            hasSupabaseUrl: !!supabaseUrl,
            hasSupabaseAnonKey: !!supabaseAnonKey,
            hasSupabaseServiceRoleKey: !!supabaseServiceRoleKey,
          },
        },
        { status: 500 }
      );
    }

    // Fetch reviews for the agent, sorted by newest first
    const { data: reviews, error: reviewsError } = await supabase
      .from('agent_reviews')
      .select(
        `
        id,
        agent_id,
        user_id,
        rating,
        review_text,
        created_at,
        updated_at
      `
      )
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    return NextResponse.json(
      { reviews: (reviews || []).map((row) => normalizeReview(row as Record<string, any>)) },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
