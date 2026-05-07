'use client';

import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import Slider from 'rc-slider';
import { useSingleValueFilter } from '@/hooks/filters/useSingleValueFilter';
import XClearIcon from './XClearIcon';

const PRICE_MIN = 30000;
const PRICE_MAX = 300000;

function formatIndianPrice(val: number) {
  if (val < 100000) return `${Math.round(val / 1000)}K`;
  const lakhs = Math.floor(val / 100000);
  const thousands = Math.round((val % 100000) / 1000);
  return `${lakhs} Lakh${thousands > 0 ? ` ${thousands}K` : ''}`;
}

const PriceFilter = () => {
  const filter = useSingleValueFilter('price', PRICE_MAX);

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border focus:outline-none
              ${open ? '!border-primary-500' : ''}
              ${
                filter.isActive
                  ? '!border-primary-500 bg-primary-50 text-primary-700'
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
                <div className="relative flex flex-col px-5 py-6 space-y-8">
                  <div className="space-y-5">
                    <span className="font-medium">
                      Price per person{' '}
                      <span className="text-sm font-normal ml-1 text-primary-500">
                        ₹ {formatIndianPrice(filter.value)}
                      </span>
                    </span>
                    <Slider
                      min={PRICE_MIN}
                      max={PRICE_MAX}
                      step={5000}
                      value={filter.value}
                      onChange={(val) => filter.setValue(val as number)}
                    />
                  </div>
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
