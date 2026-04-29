'use client';

import React, { Fragment, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import Slider from 'rc-slider';
import { useRouter, useSearchParams } from 'next/navigation';
import XClearIcon from './XClearIcon';

function formatIndianPrice(val: number) {
  if (val < 100000) return `${Math.round(val / 1000)}K`;
  const lakhs = Math.floor(val / 100000);
  const thousands = Math.round((val % 100000) / 1000);
  return `${lakhs} Lakh${thousands > 0 ? ` ${thousands}K` : ''}`;
}

const PriceFilter = () => {
  const [rangePrices, setRangePrices] = useState([30000, 40000]);

  const router = useRouter();
  const searchParams = useSearchParams();

  const handleApplyPrice = (close: () => void) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('price', rangePrices[1].toString());
    router.replace(window.location.pathname + '?' + params.toString());
    close();
  };

  const handleClearPrice = (close: () => void) => {
    setRangePrices([30000, 40000]);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('price');
    router.replace(window.location.pathname + '?' + params.toString());
    close();
  };

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-primary-500 bg-primary-50 text-primary-700 focus:outline-none `}
          >
            <span>Price</span>
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
                    <span className="font-medium">
                      Price per person{' '}
                      <span className="text-sm font-normal ml-1 text-primary-500">
                        ₹ {formatIndianPrice(rangePrices[1])}
                      </span>
                    </span>
                    <Slider
                      min={30000}
                      max={300000}
                      step={5000}
                      value={rangePrices[1]}
                      onChange={(val) => setRangePrices([30000, val as number])}
                    />
                  </div>
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => handleClearPrice(close)}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary
                    onClick={() => handleApplyPrice(close)}
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
