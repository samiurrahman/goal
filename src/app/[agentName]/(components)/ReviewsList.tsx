'use client';

import { useQuery } from '@tanstack/react-query';
import { AgentReview } from '@/data/types';
import Image from 'next/image';

interface ReviewsListProps {
  agentId: string;
  agentName: string;
}

const StarDisplay = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`text-sm ${
            star <= rating ? 'las la-star text-yellow-400' : 'lar la-star text-gray-300'
          }`}
        ></i>
      ))}
    </div>
  );
};

const getInitials = (email: string, fullName?: string) => {
  if (fullName) {
    return fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return (email?.[0] || '?').toUpperCase();
};

const getAvatarColor = (email: string) => {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-yellow-500',
    'bg-green-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
  ];
  const hash = (email || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export default function ReviewsList({ agentId, agentName }: ReviewsListProps) {
  const {
    data: reviewsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['agentReviews', agentId],
    queryFn: async () => {
      const response = await fetch(`/api/agents/reviews?agentId=${agentId}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
  });

  const reviews: AgentReview[] = reviewsData?.reviews || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>Failed to load reviews</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No reviews yet. Be the first to review this agent!</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
      {reviews.map((review) => {
        const initials = getInitials(review.user_email, review.user_name);
        const avatarColor = getAvatarColor(review.user_email);
        const displayName = review.user_name || review.user_email?.split('@')[0] || 'Anonymous';
        const hasProfileImage = !!review.user_profile_image;

        return (
          <div key={review.id} className="py-8">
            <div className="flex gap-4">
              {/* Avatar */}
              <div className="h-14 w-14 rounded-full flex-shrink-0 overflow-hidden">
                {hasProfileImage ? (
                  <Image
                    src={review.user_profile_image as string}
                    alt={displayName}
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className={`h-full w-full rounded-full flex items-center justify-center text-white font-semibold ${avatarColor}`}
                  >
                    {initials}
                  </div>
                )}
              </div>

              {/* Review Content */}
              <div className="flex-1 min-w-0">
                {/* Header: Name and Review Title */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h4 className="font-semibold text-neutral-900 dark:text-white">
                      {displayName}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      review in {agentName}
                    </p>
                  </div>
                </div>

                {/* Date and Rating */}
                <div className="flex items-center justify-between gap-4 mb-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(review.created_at)}
                  </p>
                  <StarDisplay rating={review.rating} />
                </div>

                {/* Review Text */}
                <p className="text-gray-700 dark:text-gray-300 leading-6">{review.review_text}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
