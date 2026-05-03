import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/supabase-env';

const getServerSupabase = (authHeader: string) => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

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
  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseConfig();

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
  const email = (row.user_email as string | undefined) || '';
  const emailName = email.includes('@') ? email.split('@')[0] : '';
  return {
    id: row.id,
    agent_id: row.agent_id,
    user_id: row.user_id,
    user_email: email,
    user_name: row.user_name || emailName || 'User',
    user_profile_image: row.user_profile_image || null,
    rating: row.rating,
    review_text: row.review_text,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
};

const buildReviewerName = (profile?: { first_name?: string | null; last_name?: string | null }) => {
  const fullName = [profile?.first_name || '', profile?.last_name || ''].join(' ').trim();
  return fullName || 'User';
};

export async function POST(request: NextRequest) {
  try {
    const { supabaseServiceRoleKey, supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
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

    const { data: reviewerProfile } = await readSupabase
      .from('user_details')
      .select('first_name, last_name, profile_image')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    const reviewPayloadWithIdentity = {
      ...reviewPayload,
      user_email: authData.user.email || '',
      user_name: buildReviewerName(reviewerProfile || undefined),
      user_profile_image: (reviewerProfile?.profile_image as string | null) || null,
    };

    let activePayload: Record<string, any> = reviewPayloadWithIdentity;

    let review: any[] | null = null;
    let reviewError: any = null;

    let upsertResult = await writeSupabase
      .from('agent_reviews')
      .upsert(reviewPayloadWithIdentity, { onConflict: 'agent_id,user_id' })
      .select(
        'id, agent_id, user_id, user_email, user_name, user_profile_image, rating, review_text, created_at, updated_at'
      );

    const missingIdentityColumnsError =
      !!upsertResult.error &&
      (upsertResult.error.code === '42703' ||
        String(upsertResult.error.message || '')
          .toLowerCase()
          .includes('column') ||
        String(upsertResult.error.message || '')
          .toLowerCase()
          .includes('user_name'));

    if (missingIdentityColumnsError) {
      activePayload = reviewPayload;
      upsertResult = await writeSupabase
        .from('agent_reviews')
        .upsert(reviewPayload, { onConflict: 'agent_id,user_id' })
        .select('id, agent_id, user_id, rating, review_text, created_at, updated_at');
    }

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
            .update(activePayload)
            .eq('id', existingReview.id)
            .select(
              'id, agent_id, user_id, user_email, user_name, user_profile_image, rating, review_text, created_at, updated_at'
            )
        : await writeSupabase
            .from('agent_reviews')
            .insert(activePayload)
            .select(
              'id, agent_id, user_id, user_email, user_name, user_profile_image, rating, review_text, created_at, updated_at'
            );

      const fallbackMissingIdentityColumnsError =
        !!fallbackMutation.error &&
        (fallbackMutation.error.code === '42703' ||
          String(fallbackMutation.error.message || '')
            .toLowerCase()
            .includes('column') ||
          String(fallbackMutation.error.message || '')
            .toLowerCase()
            .includes('user_name'));

      if (fallbackMissingIdentityColumnsError) {
        const plainFallbackMutation = existingReview?.id
          ? await writeSupabase
              .from('agent_reviews')
              .update(reviewPayload)
              .eq('id', existingReview.id)
              .select('id, agent_id, user_id, rating, review_text, created_at, updated_at')
          : await writeSupabase
              .from('agent_reviews')
              .insert(reviewPayload)
              .select('id, agent_id, user_id, rating, review_text, created_at, updated_at');

        review = plainFallbackMutation.data;
        reviewError = plainFallbackMutation.error;
      } else {
        review = fallbackMutation.data;
        reviewError = fallbackMutation.error;
      }
    }

    if (reviewError) {
      console.error('Error submitting review:', reviewError);
      return NextResponse.json(
        { error: 'Failed to submit review: ' + reviewError.message },
        { status: 500 }
      );
    }

    const normalizedReview = review?.[0] ? normalizeReview(review[0]) : null;

    if (!normalizedReview) {
      return NextResponse.json(
        {
          message: 'Review submitted successfully',
          review: null,
        },
        { status: 200 }
      );
    }

    const reviewWithProfile = {
      ...normalizedReview,
      user_name:
        normalizedReview.user_name || buildReviewerName(reviewerProfile || undefined) || 'User',
      user_profile_image:
        normalizedReview.user_profile_image ||
        (reviewerProfile?.profile_image as string | null) ||
        null,
    };

    return NextResponse.json(
      {
        message: 'Review submitted successfully',
        review: reviewWithProfile,
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

    const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getSupabaseConfig();
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
    let reviewsQuery: any = (await supabase
      .from('agent_reviews')
      .select(
        `
        id,
        agent_id,
        user_id,
        user_email,
        user_name,
        user_profile_image,
        rating,
        review_text,
        created_at,
        updated_at
      `
      )
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })) as any;

    const missingIdentityColumnsError =
      !!reviewsQuery.error &&
      (reviewsQuery.error.code === '42703' ||
        String(reviewsQuery.error.message || '')
          .toLowerCase()
          .includes('column') ||
        String(reviewsQuery.error.message || '')
          .toLowerCase()
          .includes('user_name'));

    if (missingIdentityColumnsError) {
      reviewsQuery = (await supabase
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
        .order('created_at', { ascending: false })) as any;
    }

    const { data: reviews, error: reviewsError } = reviewsQuery;

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    const reviewRows = (reviews || []) as Record<string, any>[];
    const userIds = Array.from(
      new Set(reviewRows.map((review) => review.user_id).filter((value) => !!value))
    );

    let profileByUserId = new Map<string, Record<string, any>>();

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_details')
        .select('auth_user_id, first_name, last_name, profile_image')
        .in('auth_user_id', userIds);

      if (!profilesError && profiles) {
        profileByUserId = new Map<string, Record<string, any>>(
          profiles.map((profile) => [
            profile.auth_user_id as string,
            profile as Record<string, any>,
          ])
        );
      }
    }

    const enrichedReviews = reviewRows.map((review) => {
      const normalized = normalizeReview(review);
      const profile = profileByUserId.get(review.user_id as string);
      if (!profile) {
        return normalized;
      }

      return {
        ...normalized,
        user_name: buildReviewerName(profile),
        user_profile_image: (profile.profile_image as string | null) || null,
      };
    });

    return NextResponse.json({ reviews: enrichedReviews }, { status: 200 });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
