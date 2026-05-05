'use client';

import React, { Fragment, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, Tab, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import ButtonSubmit from '../(HeroSearchForm2Mobile)/ButtonSubmit';
import { useTimeoutFn } from 'react-use';
import StaySearchForm from '../(HeroSearchForm2Mobile)/(stay-search-form)/StaySearchForm';

const ComparePackagesButton = () => {
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();
  const packagesUrlRef = useRef('/packages');

  const handleUrlChange = useCallback((url: string) => {
    packagesUrlRef.current = url;
  }, []);

  const [showDialog, setShowDialog] = useState(false);
  let [, , resetIsShowingDialog] = useTimeoutFn(() => setShowDialog(true), 1);

  function closeModal() {
    setShowModal(false);
  }

  function openModal() {
    setShowModal(true);
  }

  return (
    <>
      <button
        onClick={openModal}
        className="px-6 py-3 rounded-xl bg-primary-6000 hover:bg-primary-700 text-neutral-50 font-medium text-sm sm:text-base transition-colors"
      >
        Compare Packages
      </button>

      <Transition appear show={showModal} as={Fragment}>
        <Dialog
          as="div"
          className="HeroSearchFormMobile__Dialog relative z-max"
          onClose={closeModal}
        >
          <div className="fixed inset-0 bg-neutral-100 dark:bg-neutral-900">
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
                <Dialog.Panel className="relative h-full min-h-0 overflow-y-auto flex-1 flex flex-col justify-between">
                  {showDialog && (
                    <Tab.Group manual>
                      <div className="absolute left-4 top-4">
                        <button onClick={closeModal}>
                          <XMarkIcon className="w-5 h-5 text-black dark:text-white" />
                        </button>
                      </div>

                      <Tab.List className="pt-12 flex w-full justify-center font-semibold text-sm sm:text-base text-neutral-500 dark:text-neutral-400 space-x-6 sm:space-x-8">
                        {['Umrah', 'Hajj'].map((item, index) => (
                          <Tab key={index} as={Fragment}>
                            {({ selected }) => (
                              <div className="relative focus:outline-none focus-visible:ring-0 outline-none select-none">
                                <div
                                  className={`${selected ? 'text-black dark:text-white' : ''}`}
                                >
                                  {item}
                                </div>
                                {selected && (
                                  <span className="absolute inset-x-0 top-full border-b-2 border-black dark:border-white"></span>
                                )}
                              </div>
                            )}
                          </Tab>
                        ))}
                      </Tab.List>
                      <div className="flex-1 min-h-0 pt-3 px-1.5 sm:px-4 flex overflow-hidden">
                        <Tab.Panels className="flex-1 min-h-0 overflow-y-auto hiddenScrollbar py-4">
                          <Tab.Panel>
                            <div className="transition-opacity animate-[myblur_0.4s_ease-in-out]">
                              <StaySearchForm onUrlChange={handleUrlChange} />
                            </div>
                          </Tab.Panel>
                          <Tab.Panel>
                            <div className="transition-opacity animate-[myblur_0.4s_ease-in-out]">
                              <StaySearchForm onUrlChange={handleUrlChange} />
                            </div>
                          </Tab.Panel>
                        </Tab.Panels>
                      </div>
                      <div className="px-4 py-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 flex justify-between">
                        <button
                          type="button"
                          className="underline font-semibold flex-shrink-0"
                          onClick={() => {
                            setShowDialog(false);
                            resetIsShowingDialog();
                          }}
                        >
                          Clear all
                        </button>
                        <ButtonSubmit
                          onClick={() => {
                            closeModal();
                            router.push(packagesUrlRef.current);
                          }}
                        />
                      </div>
                    </Tab.Group>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default ComparePackagesButton;
