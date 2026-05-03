'use client';

import { useEffect, useState } from 'react';
import ReviewForm from './ReviewForm';
import ReviewsList from './ReviewsList';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';
import { supabase } from '@/utils/supabaseClient';

interface ReviewsSectionProps {
  agentId: string;
  agentName: string;
}

export default function ReviewsSection({ agentId, agentName }: ReviewsSectionProps) {
  const { isLoggedIn, isAuthReady } = useSupabaseIsLoggedIn();
  const [canReview, setCanReview] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;

    const resolveEligibility = async () => {
      if (!isLoggedIn) {
        if (mounted) setCanReview(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setCanReview(false);
        return;
      }

      const [{ data: userDetails }, { data: agentProfile }] = await Promise.all([
        supabase.from('user_details').select('user_type').eq('auth_user_id', user.id).maybeSingle(),
        supabase.from('agents').select('id').eq('auth_user_id', user.id).maybeSingle(),
      ]);

      const isAgentUserType = (userDetails?.user_type || '').toLowerCase() === 'agent';
      const isAgentByProfile = !!agentProfile?.id;

      if (mounted) setCanReview(!(isAgentUserType || isAgentByProfile));
    };

    resolveEligibility();

    return () => {
      mounted = false;
    };
  }, [isLoggedIn]);

  return (
    <div className="listingSection__wrap !space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-normal text-gray-900 dark:text-white">Reviews</h2>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      {isLoggedIn && canReview ? (
        <ReviewForm agentId={agentId} />
      ) : isLoggedIn && isAuthReady ? (
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

      <ReviewsList agentId={agentId} agentName={agentName} />
    </div>
  );
}
