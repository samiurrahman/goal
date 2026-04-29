'use client';

import React, { Fragment, useState } from 'react';
import { Popover, Transition } from '@headlessui/react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import ButtonThird from '@/shared/ButtonThird';
import Checkbox from '@/shared/Checkbox';
import XClearIcon from './XClearIcon';

const stopPoints = [
  { name: 'Nonstop' },
  { name: 'Up to 1 stops' },
  { name: 'Up to 2 stops' },
  { name: 'Any number of stops' },
];

const StopPointsFilter = () => {
  const [stopPontsStates, setStopPontsStates] = useState<string[]>([]);

  const handleChangeStopPoint = (checked: boolean, name: string) => {
    if (checked) {
      setStopPontsStates((prev) => [...prev, name]);
    } else {
      setStopPontsStates((prev) => prev.filter((i) => i !== name));
    }
  };

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center justify-center px-4 py-2 text-sm rounded-full border border-neutral-300 dark:border-neutral-700 focus:outline-none
            ${open ? '!border-primary-500 ' : ''}
              ${!!stopPontsStates.length ? '!border-primary-500 bg-primary-50' : ''}
              `}
          >
            <span>Flight Stop</span>
            {!stopPontsStates.length ? (
              <i className="las la-angle-down ml-2"></i>
            ) : (
              <span onClick={() => setStopPontsStates([])}>
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
                <div className="relative flex flex-col px-5 py-6 space-y-5">
                  {stopPoints.map((item) => (
                    <div key={item.name} className="">
                      <Checkbox
                        name={item.name}
                        label={item.name}
                        defaultChecked={stopPontsStates.includes(item.name)}
                        onChange={(checked) => handleChangeStopPoint(checked, item.name)}
                      />
                    </div>
                  ))}
                </div>
                <div className="p-5 bg-neutral-50 dark:bg-neutral-900 dark:border-t dark:border-neutral-800 flex items-center justify-between">
                  <ButtonThird
                    onClick={() => {
                      setStopPontsStates([]);
                      close();
                    }}
                    sizeClass="px-4 py-2 sm:px-5"
                  >
                    Clear
                  </ButtonThird>
                  <ButtonPrimary onClick={close} sizeClass="px-4 py-2 sm:px-5">
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

export default StopPointsFilter;
