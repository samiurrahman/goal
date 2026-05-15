'use client';

import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import { rangeId } from '@/hooks/filters/useMultiRangeFilter';
import { useSingleRangeFilter } from '@/hooks/filters/useSingleRangeFilter';
import { PRICE_RANGES, formatPriceRangeLabel } from './filterRanges';
import RangePill from './RangePill';
import XClearIcon from './XClearIcon';

const PriceFilter = () => {
  const filter = useSingleRangeFilter('price');

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border bg-white dark:bg-neutral-800 focus:outline-none
              ${open ? '!border-primary-500' : ''}
              ${
                filter.isActive
                  ? '!border-primary-500 !bg-primary-50 text-primary-700'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
          >
            <span>Price</span>
            {!filter.isActive ? (
              <i className="las la-angle-down ml-2"></i>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  filter.clear();
                }}
              >
                <XClearIcon />
              </span>
            )}
          </Popover.Button>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-10 w-screen max-w-sm px-4 mt-3 left-0 sm:px-0">
              <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                <div className="relative grid grid-cols-2 gap-2 px-5 py-6 max-h-72 overflow-y-auto">
                  {PRICE_RANGES.map((range) => {
                    const id = rangeId(range);
                    const selected = filter.isSelected(range);
                    return (
                      <RangePill
                        key={id}
                        label={formatPriceRangeLabel(range)}
                        selected={selected}
                        onClick={() => filter.select(selected ? null : range)}
                      />
                    );
                  })}
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => {
                      filter.clear();
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary
                    onClick={() => {
                      filter.apply();
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Apply
                  </ButtonPrimary>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
};

export default PriceFilter;
