'use client';

import React, { Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import Checkbox from '@/shared/Checkbox';
import { MONTHS_LIST } from '@/contains/contants';
import { useMultiSelectFilter } from '@/hooks/filters/useMultiSelectFilter';
import { getHijriMonthsForGregorianMonth } from '@/lib/hijri';
import FilterPillButton from './FilterPillButton';

const MonthFilter = () => {
  const filter = useMultiSelectFilter('month');
  const year = new Date().getFullYear();

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            as={FilterPillButton}
            icon={<CalendarDaysIcon className="h-4 w-4" />}
            label="Month"
            activeText={filter.count === 1 ? filter.selected[0] : null}
            count={filter.count > 1 ? filter.count : 0}
            isActive={filter.isActive}
            isOpen={open}
            onClear={filter.clear}
          />
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
                  {MONTHS_LIST.map((month, idx) => {
                    const hijri = getHijriMonthsForGregorianMonth(year, idx).join(' / ');
                    return (
                      <Checkbox
                        key={month}
                        name={month}
                        label={`${month} ${year}`}
                        subLabel={hijri}
                        defaultChecked={filter.selected.includes(month)}
                        onChange={(checked) => filter.toggle(checked, month)}
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

export default MonthFilter;
