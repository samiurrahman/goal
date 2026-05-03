'use client';

import ReviewForm from './ReviewForm';
import ReviewsList from './ReviewsList';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';

interface ReviewsSectionProps {
  agentId: string;
  agentName: string;
}

export default function ReviewsSection({ agentId, agentName }: ReviewsSectionProps) {
  const { isLoggedIn } = useSupabaseIsLoggedIn();

  return (
    <div className="listingSection__wrap !space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-normal text-gray-900 dark:text-white">Reviews</h2>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      {isLoggedIn ? (
        <ReviewForm agentId={agentId} />
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
