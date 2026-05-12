'use client';

import React, { FC, useCallback } from 'react';
import { useFilterUrlSync } from '@/hooks/filters/useFilterUrlSync';
import { RelaxedFilter } from '@/lib/queries/packages';

export interface RelaxedSearchBannerProps {
  relaxedFilters: RelaxedFilter[];
  resultCount: number;
  // Re-run the query with relaxation disabled — useful when the user
  // would rather see "no results" than approximate matches.
  onShowExactOnly: () => void;
}

const InfoIcon = () => (
  <svg
    aria-hidden="true"
    className="h-5 w-5 flex-shrink-0 text-primary-600 dark:text-primary-300"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
      clipRule="evenodd"
    />
  </svg>
);

const CloseIcon = () => (
  <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

const RelaxedSearchBanner: FC<RelaxedSearchBannerProps> = ({
  relaxedFilters,
  resultCount,
  onShowExactOnly,
}) => {
  const { replaceParams } = useFilterUrlSync();

  // Permanently drop the relaxed filter from the URL — same effect as
  // clicking the filter chip's clear button. After this, the user's search
  // is the relaxed search and the banner goes away.
  const removeFilter = useCallback(
    (urlKeys: string[]) => {
      replaceParams((params) => {
        urlKeys.forEach((k) => params.delete(k));
      });
    },
    [replaceParams]
  );

  // Human-readable summary line for the headline ("we widened X and Y").
  // Drops read as "removed your <filter> filter"; widenings as
  // "<filter> from A → B".
  const summarize = (f: RelaxedFilter) => {
    if (f.kind === 'drop') return `${f.filterLabel.toLowerCase()}`;
    return `${f.filterLabel.toLowerCase()} from ${f.originalValueLabel} → ${f.relaxedValueLabel}`;
  };

  const tried = relaxedFilters.map(summarize).join(', and ');
  const hasOnlyDrops = relaxedFilters.every((f) => f.kind === 'drop');
  const verb = hasOnlyDrops ? 'set aside' : 'expanded';

  return (
    <div className="mb-6 rounded-2xl border border-primary-200 bg-primary-50/70 px-4 py-4 dark:border-primary-800/60 dark:bg-primary-900/20 sm:px-5">
      <div className="flex items-start gap-3">
        <InfoIcon />
        <div className="flex-grow min-w-0">
          <p className="text-sm text-neutral-800 dark:text-neutral-100">
            <span className="font-semibold">No exact match for your search.</span>{' '}
            We {verb} <span className="font-medium">{tried}</span> and found{' '}
            <span className="font-medium">
              {resultCount} package{resultCount === 1 ? '' : 's'}
            </span>{' '}
            that match the rest of your filters — still interested?
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {relaxedFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => removeFilter(f.urlKeys)}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary-300 bg-white px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 dark:border-primary-700 dark:bg-neutral-900 dark:text-primary-200 dark:hover:bg-primary-900/40"
                title={`Remove ${f.filterLabel} filter from your search`}
              >
                <span className="text-neutral-500 dark:text-neutral-400">
                  {f.filterLabel}:
                </span>
                {f.kind === 'widen' ? (
                  <>
                    <span className="line-through opacity-70">
                      {f.originalValueLabel}
                    </span>
                    <span aria-hidden="true">→</span>
                    <span>{f.relaxedValueLabel}</span>
                  </>
                ) : (
                  <>
                    <span className="line-through opacity-70">
                      {f.originalValueLabel}
                    </span>
                    <span>(removed)</span>
                  </>
                )}
                <CloseIcon />
              </button>
            ))}
            <button
              type="button"
              onClick={onShowExactOnly}
              className="text-xs font-medium text-primary-700 underline-offset-2 hover:underline dark:text-primary-300"
            >
              Show only exact matches
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelaxedSearchBanner;
