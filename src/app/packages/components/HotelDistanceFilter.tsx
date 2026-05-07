'use client';

import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import Slider from 'rc-slider';
import { useHotelDistanceFilter } from '@/hooks/filters/useHotelDistanceFilter';
import XClearIcon from './XClearIcon';

const DISTANCE_MAX = 5000;

function formatDistance(val: number) {
  if (val < 1000) return `${val} m`;
  const km = Math.floor(val / 1000);
  const m = val % 1000;
  return `${km} km${m > 0 ? ` ${m} m` : ''}`;
}

const HotelDistanceFilter = () => {
  const filter = useHotelDistanceFilter(DISTANCE_MAX);

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
            <span>Hotel Distance</span>
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
                      Makkah Hotel Distance{' '}
                      <span className="text-sm font-normal ml-1 text-primary-500">
                        {formatDistance(filter.makkah)}
                      </span>
                    </span>
                    <Slider
                      min={0}
                      max={DISTANCE_MAX}
                      step={50}
                      value={filter.makkah}
                      onChange={(val) => filter.setMakkah(val as number)}
                    />
                  </div>
                  <div className="space-y-5">
                    <span className="font-medium">
                      Madina Hotel Distance{' '}
                      <span className="text-sm font-normal ml-1 text-primary-500">
                        {formatDistance(filter.madinah)}
                      </span>
                    </span>
                    <Slider
                      min={0}
                      max={DISTANCE_MAX}
                      step={50}
                      value={filter.madinah}
                      onChange={(val) => filter.setMadinah(val as number)}
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

export default HotelDistanceFilter;
