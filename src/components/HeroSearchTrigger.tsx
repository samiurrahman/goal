'use client';

import React, { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import SearchForm from '@/app/(client-components)/(PackageSearchForm)/SearchForm';

const HeroSearchTrigger = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center pl-4 pr-1.5 py-1.5 bg-white rounded-full shadow-md border border-neutral-200 dark:bg-neutral-800 dark:border-neutral-700"
      >
        <MagnifyingGlassIcon className="w-5 h-5 text-neutral-500 flex-shrink-0" />
        <span className="ml-3 flex-1 text-left text-sm text-neutral-500 truncate">
          Where to?
        </span>
        <span className="ml-2 inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-6000 text-white">
          <MagnifyingGlassIcon className="w-5 h-5" />
        </span>
      </button>

      <Transition show={open} as={Fragment}>
        <Dialog onClose={() => setOpen(false)} className="relative z-50">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="ease-in duration-200"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <Dialog.Panel className="w-full sm:max-w-lg bg-transparent">
                <div className="flex justify-end px-4 pb-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close search"
                    className="w-9 h-9 inline-flex items-center justify-center rounded-full bg-white shadow text-neutral-700"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-3 pb-6">
                  <SearchForm />
                </div>
              </Dialog.Panel>
            </div>
          </Transition.Child>
        </Dialog>
      </Transition>
    </>
  );
};

export default HeroSearchTrigger;
