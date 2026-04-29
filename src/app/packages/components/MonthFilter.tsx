'use client';

import React, { Fragment, useState, useEffect } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import Checkbox from '@/shared/Checkbox';
import { useRouter, useSearchParams } from 'next/navigation';
import { MONTHS_LIST } from '@/contains/contants';
import XClearIcon from './XClearIcon';

const MonthFilter = () => {
  const [monthStates, setMonthStates] = useState<string[]>([]);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlMonth = searchParams.get('month');
    if (urlMonth) {
      setMonthStates(urlMonth.split(','));
    } else {
      setMonthStates([]);
    }
  }, [searchParams]);

  const handleChangeMonth = (checked: boolean, name: string) => {
    if (checked) {
      setMonthStates((prev) => [...prev, name]);
    } else {
      setMonthStates((prev) => prev.filter((i) => i !== name));
    }
  };

  const handleApplyMonth = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (monthStates.length > 0) {
      params.set('month', monthStates.join(','));
    } else {
      params.delete('month');
    }
    router.replace(window.location.pathname + '?' + params.toString());
  };

  const handleClearMonthFilter = () => {
    setMonthStates([]);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('month');
    router.replace(window.location.pathname + '?' + params.toString());
  };

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 focus:outline-none
             ${open ? '!border-primary-500 ' : ''}
              ${!!monthStates.length ? '!border-primary-500 bg-primary-50' : ''}
              `}
          >
            <span>Month</span>
            {!monthStates.length ? (
              <i className="las la-angle-down ml-2"></i>
            ) : (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearMonthFilter();
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
            <Popover.Panel className="absolute z-10 w-screen max-w-sm px-4 mt-3 left-0 sm:px-0 lg:max-w-md">
              <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                <div className="relative flex flex-col px-5 py-6 space-y-5 max-h-72 overflow-y-auto">
                  {MONTHS_LIST.map((month) => (
                    <Checkbox
                      key={month}
                      name={month}
                      label={month}
                      defaultChecked={monthStates.includes(month)}
                      onChange={(checked) => handleChangeMonth(checked, month)}
                    />
                  ))}
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => {
                      handleClearMonthFilter();
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary
                    onClick={() => {
                      handleApplyMonth();
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

export default MonthFilter;
