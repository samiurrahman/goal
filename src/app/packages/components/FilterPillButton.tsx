'use client';

import React from 'react';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

type Props = {
  icon?: React.ReactNode;
  label: string;
  // Inline label after a separator dot when active — e.g. "Location · Mumbai".
  // Kept narrow (truncated at ~160px) so a long activeText doesn't blow up the row.
  activeText?: string | null;
  count?: number;
  isActive: boolean;
  isOpen?: boolean;
  onClear?: () => void;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;

const FilterPillButton = React.forwardRef<HTMLButtonElement, Props>(function FilterPillButton(
  { icon, label, activeText, count, isActive, isOpen, onClear, className = '', ...rest },
  ref
) {
  const showValue = isActive && activeText;
  const showCount = !!(count && count > 0);

  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={`group inline-flex items-center gap-2 h-10 pl-3.5 ${
        isActive && onClear ? 'pr-1.5' : 'pr-3'
      } text-sm rounded-full border transition-[box-shadow,transform,background-color,border-color] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 active:scale-[0.98]
        ${
          isActive
            ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm shadow-primary-500/15 hover:shadow-md hover:shadow-primary-500/20 dark:bg-primary-500/15 dark:text-primary-100 dark:border-primary-400/80'
            : isOpen
              ? 'border-primary-500 bg-white text-neutral-900 shadow-md ring-2 ring-primary-500/15 dark:bg-neutral-800 dark:text-neutral-50'
              : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:border-neutral-500'
        } ${className}`}
    >
      {icon ? (
        <span
          aria-hidden
          className={`flex items-center justify-center transition-colors
            ${
              isActive
                ? 'text-primary-600 dark:text-primary-200'
                : 'text-neutral-500 group-hover:text-neutral-800 dark:text-neutral-400 dark:group-hover:text-neutral-100'
            }`}
        >
          {icon}
        </span>
      ) : null}

      <span className="flex items-center gap-1.5 font-medium leading-none">
        <span>{label}</span>
        {showValue ? (
          <>
            <span aria-hidden className="text-primary-400/70 dark:text-primary-300/50">
              ·
            </span>
            <span className="max-w-[160px] truncate text-primary-700 dark:text-primary-100">
              {activeText}
            </span>
          </>
        ) : null}
        {showCount ? (
          <span
            className={`ml-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
              isActive
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100'
            }`}
          >
            {count}
          </span>
        ) : null}
      </span>

      {isActive && onClear ? (
        <span
          role="button"
          aria-label={`Clear ${label} filter`}
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-primary-600 transition-colors hover:bg-primary-500 hover:text-white dark:text-primary-200 dark:hover:bg-primary-500"
        >
          <XMarkIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
      ) : (
        <ChevronDownIcon
          aria-hidden
          className={`h-4 w-4 transition-transform duration-200 ${
            isOpen
              ? 'rotate-180 text-primary-500'
              : 'text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'
          }`}
        />
      )}
    </button>
  );
});

export default FilterPillButton;
