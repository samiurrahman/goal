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
      headers: {
        Authorization: authHeader,
      },
    },
  });
};

export async function POST(request: NextRequest) {
  try {
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

    // Only normal users can review agents. Agent accounts are blocked.
    const [{ data: userDetails }, { data: agentProfile }] = await Promise.all([
      supabase
        .from('user_details')
        .select('user_type')
        .eq('auth_user_id', authData.user.id)
        .maybeSingle(),
      supabase.from('agents').select('id').eq('auth_user_id', authData.user.id).maybeSingle(),
    ]);

    const isAgentUserType = (userDetails?.user_type || '').toLowerCase() === 'agent';
    const isAgentByProfile = !!agentProfile?.id;
    if (isAgentUserType || isAgentByProfile) {
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
    const { data: agentExists, error: agentCheckError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', agentId)
      .single();

    if (agentCheckError || !agentExists) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Insert or update review (upsert)
    const userEmail = authData.user.email || '';
    const userMetadata = authData.user.user_metadata || {};
    const userFullName =
      (userMetadata.full_name as string) ||
      (userMetadata.name as string) ||
      userEmail.split('@')[0] ||
      '';
    const userProfileImage =
      (userMetadata.profile_image as string) ||
      (userMetadata.avatar_url as string) ||
      (userMetadata.picture as string) ||
      '';

    const { data: review, error: reviewError } = await supabase
      .from('agent_reviews')
      .upsert(
        {
          agent_id: agentId,
          user_id: authData.user.id,
          rating: rating,
          review_text: reviewText.trim(),
          user_email: userEmail,
          user_name: userFullName,
          user_profile_image: userProfileImage,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'agent_id,user_id',
        }
      )
      .select();

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
        review: review?.[0],
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Server is not configured for Supabase' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch reviews for the agent, sorted by newest first
    const { data: reviews, error: reviewsError } = await supabase
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
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    return NextResponse.json({ reviews: reviews || [] }, { status: 200 });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
