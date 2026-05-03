import { AgentReview } from '@/data/types';
import ReviewFormWithAuth from './ReviewFormWithAuth';
import ReviewsList from './ReviewsList';

interface ReviewsSectionProps {
  agentId: string;
  agentName: string;
  initialReviews: AgentReview[];
}

export default function ReviewsSection({ agentId, agentName, initialReviews }: ReviewsSectionProps) {

  return (
    <div className="listingSection__wrap !space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-normal text-gray-900 dark:text-white">Reviews</h2>
      </div>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      {/* Review Form with Auth Handling */}
      <ReviewFormWithAuth agentId={agentId} />

      {/* Reviews List */}
      <ReviewsList agentName={agentName} reviews={initialReviews} />
    </div>
  );
}
