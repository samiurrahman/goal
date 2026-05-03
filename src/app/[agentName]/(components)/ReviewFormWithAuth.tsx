'use client';

import { useEffect, useState } from 'react';
import ReviewForm from './ReviewForm';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';
import { supabase } from '@/utils/supabaseClient';

interface ReviewFormWithAuthProps {
  agentId: string;
}

export default function ReviewFormWithAuth({ agentId }: ReviewFormWithAuthProps) {
  const { isLoggedIn, isAuthReady } = useSupabaseIsLoggedIn();
  const [reviewAccess, setReviewAccess] = useState<'loading' | 'login' | 'allowed' | 'blocked'>(
    'loading'
  );

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

  const showLoadingState = reviewAccess === 'loading';

  if (showLoadingState) {
    // Placeholder skeleton for loading
    return <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />;
  }

  if (reviewAccess === 'allowed') {
    return <ReviewForm agentId={agentId} />;
  }

  if (reviewAccess === 'blocked') {
    return (
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 mb-6">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          Agent accounts cannot submit reviews. Please use a user account to review this agent.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 mb-6">
      <p className="text-sm text-blue-800 dark:text-blue-200">
        Please{' '}
        <a href="/login" className="font-semibold hover:underline">
          log in
        </a>{' '}
        to write a review.
      </p>
    </div>
  );
}
