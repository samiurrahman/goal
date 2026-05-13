'use client';

import { useEffect, useRef, useState } from 'react';
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
  agentName,
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

  return (
    <div className="listingSection__wrap !space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-normal text-gray-900 dark:text-white">Reviews</h2>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

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
        agentName={agentName}
        reviews={reviews}
        currentUserId={currentUserId}
        onEditReview={handleEdit}
        editingReviewId={editingReview?.id ? String(editingReview.id) : null}
      />
    </div>
  );
}
