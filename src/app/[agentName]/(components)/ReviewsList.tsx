'use client';

import { AgentReview } from '@/data/types';
import Image from 'next/image';
import { getOptimizedImageUrl } from '@/lib/imageUrl';

interface ReviewsListProps {
  reviews: AgentReview[];
  currentUserId?: string | null;
  onEditReview?: (review: AgentReview) => void;
  editingReviewId?: string | null;
}

const StarDisplay = ({ rating }: { rating: number }) => {
  return (
    <div
      className="text-sm tracking-[1px]"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= rating ? 'text-[#FACC15]' : 'text-neutral-300'}
        >
          ★
        </span>
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

export default function ReviewsList({
  reviews,
  currentUserId,
  onEditReview,
  editingReviewId,
}: ReviewsListProps) {
  if (reviews.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-neutral-500">
        <p className="m-0">No reviews yet. Be the first to review this agent!</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      {reviews.map((review) => {
        const anonymous = !!review.is_anonymous;
        const initials = anonymous ? '?' : getInitials(review.user_email, review.user_name);
        const displayName = anonymous
          ? 'Anonymous'
          : review.user_name || review.user_email?.split('@')[0] || 'Anonymous';
        const hasProfileImage = !anonymous && !!review.user_profile_image;
        const isOwn = !!currentUserId && review.user_id === currentUserId;
        const isEditingThis = !!editingReviewId && String(review.id) === editingReviewId;

        return (
          <div
            key={review.id}
            className="border-t border-neutral-200 py-5 first:border-t-0 first:pt-0"
          >
            <div className="mb-3 flex items-center gap-3">
              {/* Avatar */}
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full">
                {hasProfileImage ? (
                  <Image
                    src={
                      getOptimizedImageUrl(review.user_profile_image, {
                        width: 88,
                        height: 88,
                        resize: 'cover',
                        quality: 70,
                      }) || (review.user_profile_image as string)
                    }
                    alt={displayName}
                    width={44}
                    height={44}
                    className="h-full w-full object-cover"
                    quality={70}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary-100 text-sm font-semibold text-primary-800">
                    {initials}
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <span className="truncate">{displayName}</span>
                  {isOwn ? (
                    <span className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-700">
                      You
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 text-xs text-neutral-500">
                  {formatDate(review.created_at)}
                </div>
              </div>

              {/* Stars + edit */}
              <div className="flex items-center gap-3">
                <StarDisplay rating={review.rating} />
                {isOwn && onEditReview ? (
                  <button
                    type="button"
                    onClick={() => onEditReview(review)}
                    disabled={isEditingThis}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-sm font-medium text-primary-700 hover:text-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <i className="las la-pen text-base" aria-hidden="true"></i>
                    {isEditingThis ? 'Editing…' : 'Edit'}
                  </button>
                ) : null}
              </div>
            </div>

            <p className="m-0 whitespace-pre-wrap break-words text-sm leading-[1.6] text-neutral-700">
              {review.review_text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
