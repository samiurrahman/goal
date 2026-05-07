import React from 'react';

export interface GovtVerifiedBadgeProps {
  className?: string;
}

/**
 * Gold-seal "Government Verified" badge — used on package cards and agent
 * profiles to convey verified status. Designed to read as a stamp of approval
 * over photo backgrounds.
 */
const GovtVerifiedBadge: React.FC<GovtVerifiedBadgeProps> = ({ className = '' }) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full bg-neutral-900/80 backdrop-blur-md shadow-lg ring-1 ring-white/10 ${className}`}
    >
      <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-inner ring-1 ring-amber-300/50">
        <svg
          viewBox="0 0 12 12"
          className="w-3 h-3"
          fill="none"
          stroke="#78350F"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="2.5 6 5 8.5 9.5 3.5" />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-bold text-white tracking-wider uppercase">Verified</span>
        <span className="text-[7px] font-medium text-amber-200/80 uppercase tracking-[0.15em] mt-[1px]">
          Government
        </span>
      </span>
    </span>
  );
};

export default GovtVerifiedBadge;
