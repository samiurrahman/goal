'use client';

import { useEffect, useState } from 'react';
import ReviewForm from './ReviewForm';
import ReviewsList from './ReviewsList';
import ReviewCardSkeleton from './ReviewCardSkeleton';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';
import { supabase } from '@/utils/supabaseClient';

interface ReviewsSectionProps {
  agentId: string;
  agentName: string;
}

export default function ReviewsSection({ agentId, agentName }: ReviewsSectionProps) {
  const { isLoggedIn, isAuthReady } = useSupabaseIsLoggedIn();
  const [reviewAccess, setReviewAccess] = useState<'loading' | 'login' | 'allowed' | 'blocked'>(
    'loading'
  );
  const [isReviewsLoading, setIsReviewsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const resolveEligibility = async () => {
      if (!isAuthReady) {
        if (mounted) setReviewAccess('loading');
        return;
      }

      if (!isLoggedIn) {
        if (mounted) setReviewAccess('login');
        return;
      }

      if (mounted) setReviewAccess('loading');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setReviewAccess('login');
        return;
      }

      const { data: userDetails, error: userDetailsError } = await supabase
        .from('user_details')
        .select('user_type')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      // If lookup fails, default to allowed and let server-side guard enforce final validation.
      if (userDetailsError) {
        if (mounted) setReviewAccess('allowed');
        return;
      }

      const isAgentUserType = (userDetails?.user_type || '').toLowerCase().trim() === 'agent';

      if (mounted) setReviewAccess(isAgentUserType ? 'blocked' : 'allowed');
    };

    resolveEligibility();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn, isAuthReady]);

  const showUnifiedLoader = reviewAccess === 'loading' || isReviewsLoading;

  return (
    <div className="listingSection__wrap !space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-normal text-gray-900 dark:text-white">Reviews</h2>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      {showUnifiedLoader ? (
        <ReviewCardSkeleton className="mb-6" />
      ) : reviewAccess === 'allowed' ? (
        <ReviewForm agentId={agentId} />
      ) : reviewAccess === 'blocked' ? (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 mb-6">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Agent accounts cannot submit reviews. Please use a user account to review this agent.
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Please{' '}
            <a href="/login" className="font-semibold hover:underline">
              log in
            </a>{' '}
            to write a review.
          </p>
        </div>
      )}

      {reviewAccess !== 'loading' ? (
        <ReviewsList
          agentId={agentId}
          agentName={agentName}
          hideLoader
          onLoadingChange={setIsReviewsLoading}
        />
      ) : null}
    </div>
  );
}
