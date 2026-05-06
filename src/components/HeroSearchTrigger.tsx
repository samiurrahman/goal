'use client';

import React, { Fragment, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { XMarkIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { useTimeoutFn } from 'react-use';
import Checkbox from '@/shared/Checkbox';
import { MONTHS_LIST_WITH_ANY } from '@/contains/contants';
import { usePackageSearch, type CityItem } from '@/hooks/usePackageSearch';

const HeroSearchTrigger = () => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [, , resetIsShowingDialog] = useTimeoutFn(() => setShowDialog(true), 1);

  const [fieldNameShow, setFieldNameShow] = useState<'location' | 'month'>('location');
  const [locationQuery, setLocationQuery] = useState('');

  const {
    locationValue,
    selectedLocation,
    handleSelectLocation,
    monthStates,
    handleChangeMonth,
    monthLabel,
    packagesUrl,
    clearAll,
    filteredCities: allCities,
  } = usePackageSearch();

  const closeModal = () => setShowModal(false);
  const openModal = () => {
    setShowModal(true);
    setFieldNameShow('location');
    setLocationQuery('');
  };

  const onPickLocation = (city: CityItem) => {
    handleSelectLocation(city);
    setLocationQuery('');
    setFieldNameShow('month');
  };

  const onClearAll = () => {
    clearAll();
    setLocationQuery('');
    setShowDialog(false);
    resetIsShowingDialog();
    setFieldNameShow('location');
  };

  const onSubmit = () => {
    closeModal();
    router.push(packagesUrl);
  };

  const queryFiltered = locationQuery
    ? allCities.filter((c) =>
        (c.name + (c.state ? ', ' + c.state : '')).toLowerCase().includes(locationQuery.toLowerCase())
      )
    : allCities;

  const renderTrigger = () => (
    <button
      type="button"
      onClick={openModal}
      className="relative flex items-center w-full border border-neutral-200 dark:border-neutral-700 px-4 py-2 pr-11 rounded-full shadow-lg bg-white dark:bg-neutral-800"
    >
      <MagnifyingGlassIcon className="flex-shrink-0 w-5 h-5" />
      <div className="ml-3 flex-1 text-left overflow-hidden">
        <span className="block font-medium text-sm">Where to?</span>
        <span className="block mt-0.5 text-xs font-light text-neutral-500 dark:text-neutral-400">
          <span className="line-clamp-1">Anywhere • Any month</span>
        </span>
      </div>
      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 dark:text-neutral-300">
        <svg
          viewBox="0 0 16 16"
          aria-hidden="true"
          role="presentation"
          focusable="false"
          className="block w-4 h-4"
          fill="currentColor"
        >
          <path d="M5 8c1.306 0 2.418.835 2.83 2H14v2H7.829A3.001 3.001 0 1 1 5 8zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm6-8a3 3 0 1 1-2.829 4H2V4h6.17A3.001 3.001 0 0 1 11 2zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"></path>
        </svg>
      </span>
    </button>
  );

  const renderInputLocation = () => {
    const isActive = fieldNameShow === 'location';
    return (
      <div
        className={`w-full bg-white dark:bg-neutral-800 ${
          isActive
            ? 'rounded-2xl shadow-lg'
            : 'rounded-xl shadow-[0px_2px_2px_0px_rgba(0,0,0,0.25)]'
        }`}
      >
        {!isActive ? (
          <button
            type="button"
            className="w-full flex justify-between text-sm font-medium p-4"
            onClick={() => setFieldNameShow('location')}
          >
            <span className="text-neutral-400">Where</span>
            <span className="truncate ml-3">{locationValue || 'Location'}</span>
          </button>
        ) : (
          <div className="p-5">
            <span className="block font-semibold text-xl sm:text-2xl">Where to?</span>
            <div className="relative mt-5">
              <input
                className="block w-full bg-transparent border px-4 py-3 pr-12 border-neutral-900 dark:border-neutral-200 rounded-xl focus:ring-0 focus:outline-none text-base leading-none placeholder-neutral-500 dark:placeholder-neutral-300 truncate font-bold placeholder:truncate"
                placeholder="Search location"
                value={locationQuery || locationValue}
                onChange={(e) => setLocationQuery(e.currentTarget.value)}
                autoFocus
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <MagnifyingGlassIcon className="w-5 h-5 text-neutral-700 dark:text-neutral-400" />
              </span>
            </div>
            <div className="mt-7">
              <p className="block font-semibold text-base">
                {locationQuery ? 'Locations' : 'Popular destinations'}
              </p>
              <div className="mt-3 max-h-[30vh] overflow-y-auto">
                {queryFiltered.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onPickLocation(item)}
                    className="py-2 mb-1 flex items-center space-x-3 text-sm cursor-pointer"
                  >
                    <MapPinIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                    <span>
                      {item.name}
                      {item.state ? ', ' + item.state : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderInputMonth = () => {
    const isActive = fieldNameShow === 'month';
    return (
      <div
        className={`w-full bg-white dark:bg-neutral-800 overflow-hidden ${
          isActive
            ? 'rounded-2xl shadow-lg'
            : 'rounded-xl shadow-[0px_2px_2px_0px_rgba(0,0,0,0.25)]'
        }`}
      >
        {!isActive ? (
          <button
            type="button"
            className="w-full flex justify-between text-sm font-medium p-4"
            onClick={() => setFieldNameShow('month')}
          >
            <span className="text-neutral-400">Month</span>
            <span className="truncate ml-3">{monthLabel || 'Any'}</span>
          </button>
        ) : (
          <div className="p-5">
            <span className="block font-semibold text-xl sm:text-2xl">Month</span>
            <div className="mt-5 space-y-3 max-h-[40vh] overflow-y-auto">
              {MONTHS_LIST_WITH_ANY.map((month) => (
                <span
                  key={`${month}-${monthStates.includes(month)}`}
                  className="flex items-center py-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-2xl px-2"
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
        )}
      </div>
    );
  };

  const renderForm = () => (
    <div className="w-full space-y-5">
      {renderInputLocation()}
      {renderInputMonth()}
    </div>
  );

  return (
    <div className="HeroSearchForm2Mobile">
      {renderTrigger()}

      <Transition appear show={showModal} as={Fragment}>
        <Dialog
          as="div"
          className="HeroSearchFormMobile__Dialog relative z-max"
          onClose={closeModal}
        >
          <div className="fixed inset-0 bg-neutral-100 dark:bg-neutral-900 h-[100dvh]">
            <div className="flex h-full min-h-0">
              <Transition.Child
                as={Fragment}
                enter="ease-out transition-transform"
                enterFrom="opacity-0 translate-y-52"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in transition-transform"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-52"
              >
                <Dialog.Panel className="relative h-full min-h-0 overflow-hidden flex-1 flex flex-col">
                  {showDialog && (
                    <>
                      <div className="absolute left-4 top-4 z-10">
                        <button onClick={closeModal} aria-label="Close search">
                          <XMarkIcon className="w-5 h-5 text-black dark:text-white" />
                        </button>
                      </div>

                      <div className="flex-1 min-h-0 pt-12 px-1.5 sm:px-4 flex overflow-hidden">
                        <div className="flex-1 min-h-0 overflow-y-auto hiddenScrollbar py-4">
                          <div className="transition-opacity animate-[myblur_0.4s_ease-in-out]">
                            {renderForm()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 flex justify-between items-center">
                        <button
                          type="button"
                          className="underline font-semibold flex-shrink-0"
                          onClick={onClearAll}
                        >
                          Clear all
                        </button>
                        <button
                          type="button"
                          onClick={onSubmit}
                          className="flex-shrink-0 px-4 py-2.5 cursor-pointer rounded-xl bg-primary-6000 flex items-center justify-center text-neutral-50 focus:outline-none relative z-20"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                          </svg>
                          <span className="ml-2">Search</span>
                        </button>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default HeroSearchTrigger;
