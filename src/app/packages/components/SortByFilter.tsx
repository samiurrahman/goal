'use client';

import React, { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  ArrowsUpDownIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useRouter, useSearchParams } from 'next/navigation';
import { SortValue } from '@/lib/queries/packages';

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: '', label: 'Top rated' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

const SortByFilter = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = (searchParams.get('sort') || '') as SortValue;

  const currentLabel =
    SORT_OPTIONS.find((opt) => opt.value === currentSort)?.label || 'Top rated';

  const handleSelect = (value: SortValue) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('sort', value);
    else params.delete('sort');
    const query = params.toString();
    router.replace(window.location.pathname + (query ? `?${query}` : ''));
  };

  return (
    <Menu as="div" className="relative inline-block text-left">
      {({ open }) => (
        <>
          <Menu.Button
            className={`group inline-flex items-center gap-2 h-10 px-3.5 text-sm rounded-full border bg-white dark:bg-neutral-800 transition-[box-shadow,transform,background-color,border-color] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 active:scale-[0.98]
              ${
                open
                  ? 'border-primary-500 text-neutral-900 dark:text-neutral-50 shadow-md ring-2 ring-primary-500/15'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-500 hover:shadow-sm'
              }`}
          >
            <ArrowsUpDownIcon
              className={`w-4 h-4 ${open ? 'text-primary-500' : 'text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-100'} transition-colors`}
            />
            <span className="hidden sm:inline text-neutral-500 dark:text-neutral-400 leading-none">
              Sort by:
            </span>
            <span className="font-medium leading-none truncate max-w-[140px] sm:max-w-none">
              {currentLabel}
            </span>
            <ChevronDownIcon
              className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180 text-primary-500' : 'text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'}`}
              aria-hidden="true"
            />
          </Menu.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-150"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Menu.Items className="absolute right-0 z-20 mt-2 w-64 origin-top-right rounded-2xl bg-white dark:bg-neutral-900 shadow-xl border border-neutral-200 dark:border-neutral-700 focus:outline-none overflow-hidden">
              <div className="py-2">
                {SORT_OPTIONS.map((opt) => {
                  const isActive = currentSort === opt.value;
                  return (
                    <Menu.Item key={opt.value || 'recommended'}>
                      {({ active }) => (
                        <button
                          type="button"
                          onClick={() => handleSelect(opt.value)}
                          className={`w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition ${
                            active ? 'bg-neutral-100 dark:bg-neutral-800' : ''
                          } ${
                            isActive
                              ? 'text-primary-700 dark:text-primary-300 font-medium'
                              : 'text-neutral-700 dark:text-neutral-200'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {isActive ? <CheckIcon className="w-4 h-4" /> : null}
                        </button>
                      )}
                    </Menu.Item>
                  );
                })}
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
};

export default SortByFilter;
