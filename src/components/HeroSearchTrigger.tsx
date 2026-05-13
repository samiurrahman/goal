'use client';

import React, { Fragment, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { XMarkIcon, MapPinIcon, CalendarDaysIcon } from '@heroicons/react/24/solid';
import { useTimeoutFn } from 'react-use';
import toast from 'react-hot-toast';
import Checkbox from '@/shared/Checkbox';
import { MONTHS_LIST_WITH_ANY } from '@/contains/contants';
import { usePackageSearch, type CityItem } from '@/hooks/usePackageSearch';
import { useCitySearch } from '@/hooks/useCitySearch';
import { useUserLocation } from '@/hooks/useUserLocation';
import { stripDiacritics } from '@/components/CityMultiSelect';

type FieldName = 'location' | 'month';

const HeroSearchTrigger = () => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [, , resetIsShowingDialog] = useTimeoutFn(() => setShowDialog(true), 1);

  const [fieldNameShow, setFieldNameShow] = useState<FieldName>('location');
  const [locationQuery, setLocationQuery] = useState('');

  const {
    locationValue,
    handleSelectLocation,
    monthStates,
    handleChangeMonth,
    monthLabel,
    packagesUrl,
    clearAll,
  } = usePackageSearch();

  // City picker now hits the API directly — same pattern as the desktop
  // SearchForm and the listing-page filters.
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(locationQuery), 250);
    return () => clearTimeout(t);
  }, [locationQuery]);
  const { data: suggestions, isFetching: citiesLoading } = useCitySearch(debouncedQuery);

  const closeModal = () => setShowModal(false);
  const openModal = (initialField: FieldName = 'location') => {
    setShowModal(true);
    setFieldNameShow(initialField);
    setLocationQuery(initialField === 'location' ? locationValue || '' : '');
  };

  // Selecting a city auto-advances to the month picker — the well-tested
  // existing behavior, just preserved.
  const onPickLocation = (city: CityItem) => {
    handleSelectLocation(city);
    setLocationQuery(city.name + (city.state ? ', ' + city.state : ''));
    setFieldNameShow('month');
  };

  const { status: geoStatus, request: requestGeo, errorMessage: geoError } = useUserLocation();
  const isDetecting = geoStatus === 'requesting';

  const detectAndPick = async () => {
    const detected = await requestGeo();
    if (!detected) {
      if (geoError) toast.error(geoError);
      return;
    }
    const queryName = (detected.city || detected.state || '').trim();
    if (!queryName) {
      toast.error('Could not figure out your city. Pick one manually.');
      return;
    }
    const params = new URLSearchParams({ q: queryName, country: 'IN', limit: '1' });
    const res = await fetch(`/api/cities/search?${params}`);
    if (!res.ok) {
      toast.error('Location lookup failed. Pick a city manually.');
      return;
    }
    const json = (await res.json()) as {
      cities?: Array<{ id: number; slug: string; name: string; admin1_name: string | null }>;
    };
    const top = json.cities?.[0];
    if (!top) {
      toast.error(`No packages near ${queryName} yet. Pick a city manually.`);
      return;
    }
    onPickLocation({
      id: top.id,
      name: top.name,
      state: top.admin1_name ?? undefined,
      slug: top.slug,
    });
    toast.success(`Showing packages near ${stripDiacritics(top.name)}`);
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

  // API-backed suggestions. Adapter from the cities API shape to the
  // legacy CityItem shape the picker render expects.
  const queryFiltered: CityItem[] = (suggestions ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    state: c.admin1_name ?? undefined,
    slug: c.slug,
  }));

  // ───── Inline card (the visible hero form on mobile) ─────
  const renderInlineCard = () => (
    <div
      className="bg-white dark:bg-neutral-900 rounded-3xl p-4 grid gap-2.5"
      style={{ boxShadow: '0 24px 64px -16px rgba(17,17,26,0.35)' }}
    >
      <button
        type="button"
        onClick={() => openModal('location')}
        className="grid grid-cols-[36px_1fr] items-center gap-3 px-3.5 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-left hover:border-neutral-400 dark:hover:border-neutral-500 transition"
      >
        <MapPinIcon className="w-5 h-5 text-primary-700" />
        <div className="min-w-0">
          <div className="text-xs font-light text-neutral-500 dark:text-neutral-400">
            Departure city
          </div>
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {locationValue || 'Anywhere'}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={() => openModal('month')}
        className="grid grid-cols-[36px_1fr] items-center gap-3 px-3.5 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-left hover:border-neutral-400 dark:hover:border-neutral-500 transition"
      >
        <CalendarDaysIcon className="w-5 h-5 text-primary-700" />
        <div className="min-w-0">
          <div className="text-xs font-light text-neutral-500 dark:text-neutral-400">
            Travel month
          </div>
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {monthLabel || 'Any month'}
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={onSubmit}
        className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-700 hover:bg-primary-800 text-white font-semibold text-base py-4 mt-1 transition shadow-md"
      >
        <MagnifyingGlassIcon className="w-5 h-5" strokeWidth={2.2} />
        Search Umrah packages
      </button>
    </div>
  );

  // ───── Full-screen dialog sub-views (the well-tested old flow) ─────
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
            <button
              type="button"
              onClick={detectAndPick}
              disabled={isDetecting || citiesLoading}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-900 px-3 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-900/40 disabled:opacity-60 transition-colors"
            >
              <MapPinIcon className="w-3.5 h-3.5" />
              {isDetecting ? 'Detecting…' : 'Use my location'}
            </button>
            <div className="relative mt-4">
              <input
                className="block w-full bg-transparent border px-4 py-3 pr-12 border-neutral-900 dark:border-neutral-200 rounded-xl focus:ring-0 focus:outline-none text-base leading-none placeholder-neutral-500 dark:placeholder-neutral-300 truncate font-bold placeholder:truncate"
                placeholder="Search location"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.currentTarget.value)}
                autoFocus
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <MagnifyingGlassIcon className="w-5 h-5 text-neutral-700 dark:text-neutral-400" />
              </span>
            </div>
            <div className="mt-7">
              <p className="block font-semibold text-base">Search results</p>
              <div className="mt-3 max-h-[30vh] overflow-y-auto">
                {debouncedQuery.length < 2 ? (
                  <p className="py-4 text-sm text-neutral-500 dark:text-neutral-400">
                    Start typing a city (e.g. Akola).
                  </p>
                ) : citiesLoading && queryFiltered.length === 0 ? (
                  <p className="py-4 text-sm text-neutral-500 dark:text-neutral-400">
                    Searching…
                  </p>
                ) : queryFiltered.length === 0 ? (
                  <p className="py-4 text-sm text-neutral-500 dark:text-neutral-400">
                    No location matches &ldquo;{debouncedQuery}&rdquo;.
                  </p>
                ) : (
                  queryFiltered.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onPickLocation(item)}
                      className="py-2 mb-1 flex items-center space-x-3 text-sm cursor-pointer"
                    >
                      <MapPinIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
                      <span>
                        {stripDiacritics(item.name)}
                        {item.state ? ', ' + stripDiacritics(item.state) : ''}
                      </span>
                    </div>
                  ))
                )}
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

  return (
    <div className="HeroSearchForm2Mobile">
      {renderInlineCard()}

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
                          <div className="transition-opacity animate-[myblur_0.4s_ease-in-out] w-full space-y-5">
                            {renderInputLocation()}
                            {renderInputMonth()}
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
