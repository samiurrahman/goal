'use client';
import React, { FC, Fragment, useState, useRef, useEffect } from 'react';
import { Popover, Transition } from '@headlessui/react';
import LocationInput from '../LocationInput';
import ClearDataButton from '../ClearDataButton';
import ButtonSubmit from '../ButtonSubmit';
import Checkbox from '@/shared/Checkbox';

const StaySearchForm: FC<{}> = ({}) => {
  const [dropOffLocationType, setDropOffLocationType] = useState<'Umrah' | 'Hajj'>('Umrah');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [monthStates, setMonthStates] = useState<string[]>([]);
  const [packagesUrl, setPackagesUrl] = useState<string>("/packages");
  const monthRef = useRef<HTMLButtonElement>(null);

  const monthsList = ['Any', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const buildPackagesUrl = (locationObj: any, selectedMonths: string[]) => {
    // Try to extract location string from common shapes
    let location = '';
    if (locationObj) {
      if (typeof locationObj === 'string') {
        location = locationObj;
      } else if (locationObj.label) {
        location = locationObj.label;
      } else if (locationObj.name) {
        location = locationObj.name;
      }
    }

    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (selectedMonths.length > 0) {
      params.append('month', selectedMonths.join(','));
    }

    return params.toString() ? `/packages?${params.toString()}` : '/packages';
  };

  const handleLocationSelect = (value: any) => {
    setSelectedLocation(value);
    // Focus month selector when location is selected.
    if (monthRef.current) {
      monthRef.current.focus();
    }
  };

  const handleChangeMonth = (checked: boolean, name: string) => {
    setMonthStates((prev) => {
      if (checked) {
        return [...prev, name];
      }

      return prev.filter((item) => item !== name);
    });
  };

  useEffect(() => {
    setPackagesUrl(buildPackagesUrl(selectedLocation, monthStates));
  }, [selectedLocation, monthStates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No need to update packagesUrl here, it's already updated in the handlers
  };

  const renderMonthDropdown = () => {
    return (
      <Popover className="relative flex-1">
        {({ open }) => (
          <>
            <Popover.Button
              ref={monthRef}
              className={`relative w-full h-full flex items-center justify-between text-left pl-10 pr-10 py-5 [ nc-hero-field-padding ] focus:outline-none
                ${open ? 'bg-neutral-50 dark:bg-neutral-700' : ''}`}
            >
              <div>
                <div className="block w-full bg-transparent border-none focus:ring-0 p-0 focus:outline-none focus:placeholder-neutral-300 xl:text-lg font-semibold placeholder-neutral-800 dark:placeholder-neutral-200 truncate">Month</div>
                <div className="dark:text-neutral-100 line-clamp-1 block mt-0.5 text-sm text-neutral-400 font-light">
                  {monthStates.length > 0 ? monthStates.join(', ') : 'Select month'}
                </div>
              </div>
              {monthStates.length > 0 ? (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <ClearDataButton
                    onClick={() => {
                      setMonthStates([]);
                    }}
                  />
                </span>
              ) : (
                <i className="las la-angle-down ml-2"></i>
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
              <Popover.Panel className="absolute z-20 w-screen max-w-sm px-4 mt-3 left-0 sm:px-0 lg:max-w-md">
                <div className="overflow-hidden rounded-2xl shadow-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                  <div className="relative flex flex-col px-5 py-6 space-y-5 max-h-72 overflow-y-auto">
                    {monthsList.map((month) => (
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
      <div className=" py-5 [ nc-hero-field-padding ] flex items-center flex-wrap flex-row border-b border-neutral-100 dark:border-neutral-700">
        <div
          className={`py-1.5 px-4 flex items-center rounded-full font-medium text-xs cursor-pointer mr-2 my-1 sm:mr-3 ${
            dropOffLocationType === 'Umrah'
              ? 'bg-black text-white shadow-black/10 shadow-lg'
              : 'border border-neutral-300 dark:border-neutral-700'
          }`}
          onClick={(e) => setDropOffLocationType('Umrah')}
        >
          Umrah
        </div>
        <div
          className={`py-1.5 px-4 flex items-center rounded-full font-medium text-xs cursor-pointer mr-2 my-1 sm:mr-3 ${
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
      <form className="w-full relative rounded-[40px] xl:rounded-[49px] rounded-t-2xl xl:rounded-t-3xl shadow-xl dark:shadow-2xl bg-white dark:bg-neutral-800 " onSubmit={handleSubmit}>
        {renderRadioBtn()}
        <div className={`relative flex flex-row items-center self-center`}>
          <LocationInput className="flex-[1.5]" onLocationSelect={handleLocationSelect} />
          <div className="self-center border-r border-slate-200 dark:border-slate-700 h-8"></div>
          {renderMonthDropdown()}
          {/* <div className="self-center border-r border-slate-200 dark:border-slate-700 h-8"></div>
          <GuestsInput className="flex-1" /> */}
          <div className="pl-1 pr-2 xl:pr-4">
            <ButtonSubmit href={packagesUrl} />
          </div>
        </div>
      </form>
    );
  };

  return renderForm();
};

export default StaySearchForm;
