'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '@/utils/supabaseClient';

interface ReviewFormProps {
  agentId: string;
  onReviewSubmitted?: () => void;
}

const StarRating = ({
  rating,
  onRatingChange,
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onRatingChange(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          type="button"
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <i
            className={`text-2xl ${
              star <= (hoverRating || rating)
                ? 'las la-star text-yellow-400'
                : 'lar la-star text-gray-300'
            }`}
          ></i>
        </button>
      ))}
    </div>
  );
};

export default function ReviewForm({ agentId, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [formError, setFormError] = useState<string>('');
  const queryClient = useQueryClient();

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      setFormError('');

      const {
        data: { session },
      } = await supabase.auth.getSession();

      let accessToken = session?.access_token;

      if (!accessToken) {
        const { data: refreshedData } = await supabase.auth.refreshSession();
        accessToken = refreshedData?.session?.access_token;
      }

      if (!accessToken) {
        throw new Error('Session expired. Please log in again.');
      }

      const response = await fetch('/api/agents/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          agentId,
          rating,
          reviewText,
        }),
      });

      if (!response.ok) {
        let message = 'Failed to submit review';
        try {
          const error = await response.json();
          message = error?.error || message;
        } catch {
          // keep fallback message
        }
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      setFormError('');
      toast.success('Review submitted successfully!');
      setRating(0);
      setReviewText('');
      queryClient.invalidateQueries({ queryKey: ['agentReviews', agentId] });
      onReviewSubmitted?.();
    },
    onError: (error: Error) => {
      setFormError(error.message || 'Failed to submit review');
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setFormError('');

    if (rating === 0) {
      setFormError('Please select a rating before submitting.');
      toast.error('Please select a rating');
      return;
    }

    if (reviewText.trim().length < 5) {
      setFormError('Review must be at least 5 characters.');
      toast.error('Review must be at least 5 characters');
      return;
    }

    submitReviewMutation.mutate();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-6 mb-8"
    >
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
        Share Your Experience
      </h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Rating
        </label>
        <StarRating rating={rating} onRatingChange={setRating} />
      </div>

      <div className="mb-4">
        <label
          htmlFor="review"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Your Review
        </label>
        <textarea
          id="review"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience with this agent..."
          rows={4}
          minLength={5}
          required
          className="w-full px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {formError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
          {formError}
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setRating(0);
            setReviewText('');
          }}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 rounded-lg hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitReviewMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors disabled:cursor-not-allowed"
        >
          {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}
