'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AgentReview } from '@/data/types';
import ReviewFormWithAuth from './ReviewFormWithAuth';
import ReviewsList from './ReviewsList';
import { supabase } from '@/utils/supabaseClient';

interface ReviewsSectionProps {
  agentId: string;
  agentName: string;
  initialReviews: AgentReview[];
}

export default function ReviewsSection({
  agentId,
  initialReviews,
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<AgentReview[]>(initialReviews);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<AgentReview | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setCurrentUserId(data?.user?.id || null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setReviews(initialReviews);
  }, [initialReviews]);

  const refreshReviews = async () => {
    try {
      const res = await fetch(
        `/api/agents/reviews?agentId=${encodeURIComponent(agentId)}`,
        { cache: 'no-store' }
      );
      if (!res.ok) return;
      const json = await res.json();
      if (Array.isArray(json?.reviews)) {
        setReviews(json.reviews as AgentReview[]);
      }
    } catch {
      /* keep current state */
    }
  };

  const handleEdit = (review: AgentReview) => {
    setEditingReview(review);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleCancelEdit = () => {
    setEditingReview(null);
  };

  const handleSubmitted = async () => {
    setEditingReview(null);
    await refreshReviews();
  };

  const userAlreadyReviewed =
    !!currentUserId && reviews.some((r) => r.user_id === currentUserId);
  const showForm = !userAlreadyReviewed || !!editingReview;

  const { reviewCount, avgRating } = useMemo(() => {
    const count = reviews.length;
    const avg =
      count > 0
        ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count
        : 0;
    return { reviewCount: count, avgRating: avg };
  }, [reviews]);

  return (
    <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white p-5 sm:p-7 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-[22px] font-semibold tracking-[-0.01em] text-neutral-900">
            Reviews
          </h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-neutral-700">
            {reviewCount > 0 ? (
              <>
                <span className="text-lg text-[#FACC15]">★</span>
                <b className="text-lg font-semibold text-neutral-900">
                  {avgRating.toFixed(1)}
                </b>
                <span className="text-neutral-500">
                  based on {reviewCount.toLocaleString('en-IN')} review
                  {reviewCount === 1 ? '' : 's'}
                </span>
              </>
            ) : (
              <span className="text-neutral-500">No reviews yet</span>
            )}
          </div>
        </div>
      </div>

      {showForm ? (
        <div ref={formRef}>
          <ReviewFormWithAuth
            agentId={agentId}
            editingReview={editingReview}
            onCancelEdit={handleCancelEdit}
            onSubmitted={handleSubmitted}
          />
        </div>
      ) : null}

      <ReviewsList
        reviews={reviews}
        currentUserId={currentUserId}
        onEditReview={handleEdit}
        editingReviewId={editingReview?.id ? String(editingReview.id) : null}
      />
    </section>
  );
}
