'use client';

import { useEffect, useState } from 'react';
import ReviewForm from './ReviewForm';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';
import { supabase } from '@/utils/supabaseClient';
import type { AgentReview } from '@/data/types';

interface ReviewFormWithAuthProps {
  agentId: string;
  editingReview?: AgentReview | null;
  onCancelEdit?: () => void;
  onSubmitted?: () => void;
}

export default function ReviewFormWithAuth({
  agentId,
  editingReview,
  onCancelEdit,
  onSubmitted,
}: ReviewFormWithAuthProps) {
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
    return <div className="mb-6 h-32 animate-pulse rounded-xl bg-neutral-100" />;
  }

  if (reviewAccess === 'allowed') {
    return (
      <ReviewForm
        agentId={agentId}
        editingReview={editingReview ?? null}
        onCancelEdit={onCancelEdit}
        onReviewSubmitted={onSubmitted}
      />
    );
  }

  const InfoIcon = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  if (reviewAccess === 'blocked') {
    return (
      <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
        {InfoIcon}
        <span>
          Agent accounts cannot submit reviews. Sign in with a pilgrim account to review this
          agent.
        </span>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-center gap-2.5 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-[13px] text-primary-800">
      {InfoIcon}
      <span>
        Please{' '}
        <a href="/login" className="font-semibold underline">
          log in
        </a>{' '}
        to write a review.
      </span>
    </div>
  );
}
