'use client';

import React from 'react';

interface RangePillProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

// Visual match to the filter button "active" state (TabFilters / AgentFilter):
// outline turns primary-500 and the fill becomes the soft primary-50 tint.
const RangePill: React.FC<RangePillProps> = ({ label, selected, onClick }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={`px-3 py-1.5 text-sm rounded-full border transition-colors focus:outline-none ${
      selected
        ? 'bg-primary-50 text-primary-700 border-primary-500'
        : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-700 hover:border-primary-500'
    }`}
  >
    {label}
  </button>
);

export default RangePill;
