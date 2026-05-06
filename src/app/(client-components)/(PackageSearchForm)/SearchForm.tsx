'use client';
import React, { Fragment, useState, useRef } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import LocationInput from './LocationInput';
import ClearDataButton from './ClearDataButton';
import ButtonSubmit from './ButtonSubmit';
import Checkbox from '@/shared/Checkbox';
import { MONTHS_LIST_WITH_ANY } from '@/contains/contants';
import { usePackageSearch } from '@/hooks/usePackageSearch';

const SearchForm = () => {
  const [dropOffLocationType, setDropOffLocationType] = useState<'Umrah' | 'Hajj'>('Umrah');
  const {
    monthStates,
    handleChangeMonth,
    packagesUrl,
    handleSelectLocation,
    monthLabel,
    clearMonths,
  } = usePackageSearch();
  const monthRef = useRef<HTMLButtonElement>(null);

  const handleLocationSelect = (value: any) => {
    handleSelectLocation(value);
    if (monthRef.current) {
      monthRef.current.focus();
    }
  };

  const renderMonthDropdown = () => {
    return (
      <Popover className="relative flex-1">
        {({ open }) => (
          <>
            <Popover.Button
              ref={monthRef}
              className={`relative w-full h-full flex items-center justify-between text-left pr-10 py-5 [ nc-hero-field-padding ] focus:outline-none
                ${open ? 'nc-hero-field-focused' : ''}`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-neutral-300 dark:text-neutral-400">
                  <CalendarDaysIcon className="w-5 h-5 lg:w-7 lg:h-7" />
                </div>
                <div>
                  <div className="block w-full bg-transparent border-none focus:ring-0 p-0 focus:outline-none focus:placeholder-neutral-300 xl:text-lg font-semibold placeholder-neutral-800 dark:placeholder-neutral-200 truncate">
                    Month
                  </div>
                  <div className="dark:text-neutral-100 line-clamp-1 block mt-0.5 text-sm text-neutral-400 font-light">
                    {monthLabel || 'Select month'}
                  </div>
                </div>
              </div>
              {monthStates.length > 0 ? (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <ClearDataButton onClick={clearMonths} />
                </span>
              ) : null}
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
              <Popover.Panel className="absolute z-20 w-screen max-w-sm px-4 mt-3 left-0 sm:px-0 lg:max-w-md">
                <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                  <div className="relative flex flex-col px-5 py-6 space-y-5 max-h-72 overflow-y-auto">
                    {MONTHS_LIST_WITH_ANY.map((month) => (
                      <span
                        key={`${month}-${monthStates.includes(month)}`}
                        className="flex px-1 sm:px-2 items-center py-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-2xl"
                      >
                        <Checkbox
                          name={month}
                          label={month}
                          defaultChecked={monthStates.includes(month)}
                          onChange={(checked) => handleChangeMonth(checked, month)}
                        />
                      </span>
                    ))}
                  </div>
                </div>
              </Popover.Panel>
            </Transition>
          </>
        )}
      </Popover>
    );
  };

  const renderRadioBtn = () => {
    return (
      <div className="py-4 px-5 lg:py-5 [ nc-hero-field-padding ] flex items-center flex-wrap flex-row border-b border-neutral-100 dark:border-neutral-700">
        <div
          className={`py-2 px-5 lg:py-1.5 lg:px-4 flex items-center rounded-full font-medium text-sm lg:text-xs cursor-pointer mr-2 my-1 sm:mr-3 ${
            dropOffLocationType === 'Umrah'
              ? 'bg-black text-white shadow-black/10 shadow-lg'
              : 'border border-neutral-300 dark:border-neutral-700'
          }`}
          onClick={(e) => setDropOffLocationType('Umrah')}
        >
          Umrah
        </div>
        <div
          className={`py-2 px-5 lg:py-1.5 lg:px-4 flex items-center rounded-full font-medium text-sm lg:text-xs cursor-pointer mr-2 my-1 sm:mr-3 ${
            dropOffLocationType === 'Hajj'
              ? 'bg-black text-white shadow-black/10 shadow-lg'
              : 'border border-neutral-300 dark:border-neutral-700'
          }`}
          onClick={(e) => setDropOffLocationType('Hajj')}
        >
          Hajj
        </div>
      </div>
    );
  };

  const renderForm = () => {
    return (
      <form
        className="w-full relative rounded-3xl lg:rounded-[40px] xl:rounded-[49px] rounded-t-2xl xl:rounded-t-3xl shadow-xl dark:shadow-2xl bg-white dark:bg-neutral-800"
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="hidden lg:block">{renderRadioBtn()}</div>
        <div className="relative flex flex-col lg:flex-row lg:items-center">
          <LocationInput className="flex-[1.5]" onLocationSelect={handleLocationSelect} />
          <div className="hidden lg:block self-center border-r border-slate-200 dark:border-slate-700 h-8"></div>
          <div className="lg:hidden mx-5 border-b border-slate-200 dark:border-slate-700"></div>
          {renderMonthDropdown()}
          <div className="p-4 lg:p-0 lg:pl-1 lg:pr-2 xl:pr-4">
            <ButtonSubmit href={packagesUrl} />
          </div>
        </div>
      </form>
    );
  };

  return renderForm();
};

export default SearchForm;
