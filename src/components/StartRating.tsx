import { StarIcon } from '@heroicons/react/24/solid';
import React, { FC } from 'react';

export interface StartRatingProps {
  className?: string;
  point?: number;
  reviewCount?: number;
}

const STAR_INDEXES = [0, 1, 2, 3, 4];

const StartRating: FC<StartRatingProps> = ({ className = '', point = 0, reviewCount = 0 }) => {
  const safePoint = Math.max(0, Math.min(5, Number(point) || 0));
  const fillPercent = (safePoint / 5) * 100;

  return (
    <div
      className={`nc-StartRating inline-flex items-center gap-1 text-sm ${className}`}
      data-nc-id="StartRating"
      aria-label={`Rating ${safePoint.toFixed(1)} out of 5 from ${reviewCount} reviews`}
    >
      <div className="relative inline-flex">
        <div className="flex text-neutral-300 dark:text-neutral-600">
          {STAR_INDEXES.map((i) => (
            <StarIcon key={`bg-${i}`} className="w-4 h-4" />
          ))}
        </div>
        <div
          className="absolute inset-y-0 left-0 overflow-hidden text-orange-500"
          style={{ width: `${fillPercent}%` }}
          aria-hidden="true"
        >
          <div className="flex">
            {STAR_INDEXES.map((i) => (
              <StarIcon key={`fg-${i}`} className="w-4 h-4 flex-shrink-0" />
            ))}
          </div>
        </div>
      </div>
      <span className="font-medium text-neutral-700 dark:text-neutral-200">
        {safePoint.toFixed(1)}
      </span>
      <span className="text-neutral-500 dark:text-neutral-400">({reviewCount})</span>
    </div>
  );
};

export default StartRating;
