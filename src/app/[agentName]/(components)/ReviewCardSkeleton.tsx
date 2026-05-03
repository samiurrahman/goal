'use client';

interface ReviewCardSkeletonProps {
  count?: number;
  className?: string;
}

export default function ReviewCardSkeleton({ count = 1, className = '' }: ReviewCardSkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`agent-review-skeleton-${index}`}
          className="listingSection__wrap rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5 animate-pulse"
        >
          <div className="flex gap-4">
            <div className="h-14 w-14 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-2">
                  <div className="h-5 w-36 rounded bg-neutral-200 dark:bg-neutral-700" />
                  <div className="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-700" />
                </div>
                <div className="h-4 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
              </div>
              <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="h-4 w-4/5 rounded bg-neutral-200 dark:bg-neutral-700" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
