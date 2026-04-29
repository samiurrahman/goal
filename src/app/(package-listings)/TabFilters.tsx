'use client';

import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import ButtonClose from '@/shared/ButtonClose';
import Checkbox from '@/shared/Checkbox';
import Slider from 'rc-slider';
import { useRouter, useSearchParams } from 'next/navigation';
import LocationFilter from './components/LocationFilter';
import AgentFilter from './components/AgentFilter';
import MonthFilter from './components/MonthFilter';
import PackageDurationFilter from './components/PackageDurationFilter';
import PriceFilter from './components/PriceFilter';
import HotelDistanceFilter from './components/HotelDistanceFilter';
import StopPointsFilter from './components/StopPointsFilter';
import XClearIcon from './components/XClearIcon';

function formatIndianPrice(val: number) {
  if (val < 100000) return `${Math.round(val / 1000)}K`;
  const lakhs = Math.floor(val / 100000);
  const thousands = Math.round((val % 100000) / 1000);
  return `${lakhs} Lakh${thousands > 0 ? ` ${thousands}K` : ''}`;
}

const stopPoints = [
  { name: 'Nonstop' },
  { name: 'Up to 1 stops' },
  { name: 'Up to 2 stops' },
  { name: 'Any number of stops' },
];

const TabFilters = () => {
  const [isOpenMoreFilter, setisOpenMoreFilter] = useState(false);
  const [rangePrices, setRangePrices] = useState([30000, 40000]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const closeModalMoreFilter = () => setisOpenMoreFilter(false);
  const openModalMoreFilter = () => setisOpenMoreFilter(true);

  const renderMoreFilterItem = (
    data: {
      name: string;
      description?: string;
      defaultChecked?: boolean;
    }[]
  ) => {
    const list1 = data.filter((_, i) => i < data.length / 2);
    const list2 = data.filter((_, i) => i >= data.length / 2);
    return (
      <div className="grid grid-cols-2 gap-8">
        <div className="flex flex-col space-y-5">
          {list1.map((item) => (
            <Checkbox
              key={item.name}
              name={item.name}
              subLabel={item.description}
              label={item.name}
              defaultChecked={!!item.defaultChecked}
            />
          ))}
        </div>
        <div className="flex flex-col space-y-5">
          {list2.map((item) => (
            <Checkbox
              key={item.name}
              name={item.name}
              subLabel={item.description}
              label={item.name}
              defaultChecked={!!item.defaultChecked}
            />
          ))}
        </div>
      </div>
    );
  };

  // FOR RESPONSIVE MOBILE
  const renderTabMobileFilter = () => {
    return (
      <div>
        <div
          className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-primary-500 bg-primary-50 text-primary-700 focus:outline-none cursor-pointer`}
          onClick={openModalMoreFilter}
        >
          <span>
            <span className="hidden sm:inline">Flights</span> filters (3)
          </span>
          <XClearIcon />
        </div>

        <Transition appear show={isOpenMoreFilter} as={Fragment}>
          <Dialog
            as="div"
            className="fixed inset-0 z-50 overflow-y-auto"
            onClose={closeModalMoreFilter}
          >
            <div className="min-h-screen text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-40 dark:bg-opacity-60" />
              </Transition.Child>

              {/* This element is to trick the browser into centering the modal contents. */}
              <span className="inline-block h-screen align-middle" aria-hidden="true">
                &#8203;
              </span>
              <Transition.Child
                className="inline-block py-8 px-2 h-screen w-full max-w-4xl"
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <div className="inline-flex flex-col w-full max-w-4xl text-left align-middle transition-all transform overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 dark:border dark:border-neutral-700 dark:text-neutral-100 shadow-xl h-full">
                  <div className="relative flex-shrink-0 px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 text-center">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      Flight filters
                    </Dialog.Title>
                    <span className="absolute left-3 top-3">
                      <ButtonClose onClick={closeModalMoreFilter} />
                    </span>
                  </div>

                  <div className="flex-grow overflow-y-auto">
                    <div className="px-4 md:px-10 divide-y divide-neutral-200 dark:divide-neutral-800">
                      {/* --------- */}
                      {/* ---- */}
                      <div className="py-7">
                        <h3 className="text-xl font-medium">Airlines</h3>
                      </div>
                      {/* --------- */}
                      {/* ---- */}
                      <div className="py-7">
                        <h3 className="text-xl font-medium">Stop points</h3>
                        <div className="mt-6 relative ">{renderMoreFilterItem(stopPoints)}</div>
                      </div>

                      {/* --------- */}
                      {/* ---- */}
                      <div className="py-7">
                        <h3 className="text-xl font-medium">Price per person</h3>
                        <div className="mt-6 relative ">
                          <div className="space-y-5">
                            <span className="text-sm font-normal text-primary-500">
                              ₹ {formatIndianPrice(rangePrices[1])}
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
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 flex-shrink-0 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                    <ButtonThird
                      onClick={() => {
                        setRangePrices([30000, 40000]);
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete('price');
                        router.replace(window.location.pathname + '?' + params.toString());
                        closeModalMoreFilter();
                      }}
                      sizeClass="px-4 py-2 sm:px-5"
                    >
                      Clear
                    </ButtonThird>
                    <ButtonPrimary
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('price', rangePrices[1].toString());
                        router.replace(window.location.pathname + '?' + params.toString());
                        closeModalMoreFilter();
                      }}
                      sizeClass="px-4 py-2 sm:px-5"
                    >
                      Apply
                    </ButtonPrimary>
                  </div>
                </div>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </div>
    );
  };

  return (
    <div className="flex lg:space-x-4">
      {/* FOR DESKTOP */}
      <div className="hidden lg:flex space-x-4">
        <LocationFilter />
        <AgentFilter />
        <MonthFilter />
        <PackageDurationFilter />
        <PriceFilter />
        <HotelDistanceFilter />
        <StopPointsFilter />
      </div>

      {/* FOR RESPONSIVE MOBILE */}
      <div className="flex lg:hidden space-x-4">{renderTabMobileFilter()}</div>
    </div>
  );
};

export default TabFilters;
