'use client';

import React, { Fragment, useState, useEffect } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import Slider from 'rc-slider';
import { useRouter, useSearchParams } from 'next/navigation';
import XClearIcon from './XClearIcon';

const PackageDurationFilter = () => {
  const [sliderValue, setSliderValue] = useState(10);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlValue = searchParams.get('total_duration_days');
    if (urlValue) {
      setSliderValue(Number(urlValue));
    } else {
      setSliderValue(10);
    }
  }, [searchParams]);

  const handleApplyPackageDuration = (close: () => void) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('total_duration_days', sliderValue.toString());
    router.replace(window.location.pathname + '?' + params.toString());
    close();
  };

  const handleClearPackageDuration = (close: () => void) => {
    setSliderValue(10);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('total_duration_days');
    router.replace(window.location.pathname + '?' + params.toString());
    close();
  };

  let tripTimeText = `${sliderValue} days`;
  if (sliderValue === 30) {
    tripTimeText = '1 month';
  } else if (sliderValue > 30) {
    tripTimeText = `1 month ${sliderValue - 30} days`;
  }

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-primary-500 bg-primary-50 text-primary-700 focus:outline-none `}
          >
            <span>Package Duration</span>
            <XClearIcon />
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
                    <div className="font-medium">
                      Package Duration
                      <span className="text-sm font-normal ml-1 text-primary-500">
                        {tripTimeText}
                      </span>
                    </div>
                    <Slider
                      min={1}
                      max={60}
                      value={sliderValue}
                      onChange={(value) => {
                        if (typeof value === 'number') {
                          setSliderValue(value);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => handleClearPackageDuration(close)}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary
                    onClick={() => handleApplyPackageDuration(close)}
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

export default PackageDurationFilter;
