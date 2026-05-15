'use client';

import React, { Fragment, useEffect, useRef, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import { rangeId } from '@/hooks/filters/useMultiRangeFilter';
import { useSingleRangeFilter } from '@/hooks/filters/useSingleRangeFilter';
import { useFilterUrlSync } from '@/hooks/filters/useFilterUrlSync';
import { DISTANCE_RANGES, formatDistanceRangeLabel } from './filterRanges';
import RangePill from './RangePill';
import XClearIcon from './XClearIcon';

type City = 'makkah' | 'madinah';

const HotelDistanceFilter = () => {
  const { replaceParams } = useFilterUrlSync();
  const makkah = useSingleRangeFilter('makkah_hotel_distance_m');
  const madinah = useSingleRangeFilter('madinah_hotel_distance_m');
  const [activeTab, setActiveTab] = useState<City>('makkah');
  // Brief pulse highlight on the Madinah tab when auto-switched, so the
  // user notices focus moved to the next picker instead of feeling like
  // their click did nothing.
  const [pulseMadinah, setPulseMadinah] = useState(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  const isActive = makkah.isActive || madinah.isActive;
  const totalCount = makkah.count + madinah.count;

  // Batch both writes — sequential .apply() / .clear() calls would each fire
  // router.replace on a stale searchParams snapshot, and only the last write
  // would land. See MobileFiltersModal.handleApplyAll for the same pattern.
  const clearAll = () => {
    makkah.setSelected(null);
    madinah.setSelected(null);
    replaceParams((params) => {
      makkah.mutateClear(params);
      madinah.mutateClear(params);
    });
  };

  const applyAll = () => {
    replaceParams((params) => {
      makkah.mutate(params);
      madinah.mutate(params);
    });
  };

  const current = activeTab === 'makkah' ? makkah : madinah;

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border bg-white dark:bg-neutral-800 focus:outline-none
              ${open ? '!border-primary-500' : ''}
              ${
                isActive
                  ? '!border-primary-500 !bg-primary-50 text-primary-700'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
          >
            <span>Hotel Distance</span>
            {totalCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-500 text-[10px] font-semibold text-white">
                {totalCount}
              </span>
            )}
            {!isActive ? (
              <i className="las la-angle-down ml-2"></i>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  clearAll();
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
                <div className="px-5 pt-5 flex justify-center">
                  <div className="inline-flex rounded-full border border-neutral-200 dark:border-neutral-700 p-1">
                    {(['makkah', 'madinah'] as const).map((tab) => {
                      const label = tab === 'makkah' ? 'Makkah' : 'Madinah';
                      const count = tab === 'makkah' ? makkah.count : madinah.count;
                      const selected = activeTab === tab;
                      const pulse = tab === 'madinah' && pulseMadinah;
                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveTab(tab)}
                          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-full focus:outline-none transition-all duration-300 ${
                            selected
                              ? 'bg-primary-50 text-primary-700 border border-primary-500'
                              : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          } ${pulse ? 'scale-110 ring-2 ring-primary-300' : 'scale-100'}`}
                        >
                          <span>{label}</span>
                          {count > 0 && (
                            <span
                              className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-primary-500 text-white"
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Transition
                  as="div"
                  appear
                  show
                  key={activeTab}
                  enter="transition-all duration-300 ease-out"
                  enterFrom={`opacity-0 ${activeTab === 'madinah' ? 'translate-x-3' : '-translate-x-3'}`}
                  enterTo="opacity-100 translate-x-0"
                  className="relative grid grid-cols-2 gap-2 px-5 py-5 max-h-72 overflow-y-auto"
                >
                  {DISTANCE_RANGES.map((range) => {
                    const id = rangeId(range);
                    const selected = current.isSelected(range);
                    return (
                      <RangePill
                        key={`${activeTab}-${id}`}
                        label={formatDistanceRangeLabel(range)}
                        selected={selected}
                        onClick={() => {
                          const nowSelected = !selected;
                          current.select(nowSelected ? range : null);
                          // After picking a Makkah range, jump focus to the
                          // Madinah picker so the user can complete both
                          // sides without hunting for the tab.
                          if (nowSelected && activeTab === 'makkah') {
                            setActiveTab('madinah');
                            setPulseMadinah(true);
                            if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
                            pulseTimerRef.current = setTimeout(() => setPulseMadinah(false), 600);
                          }
                        }}
                      />
                    );
                  })}
                </Transition>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => {
                      clearAll();
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary
                    onClick={() => {
                      applyAll();
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
