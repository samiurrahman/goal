'use client';
import React, { FC, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LocationInput from '../LocationInput';
import GuestsInput from '../GuestsInput';
import StayDatesRangeInput from './StayDatesRangeInput';
import ButtonSubmit from '../ButtonSubmit';

const StaySearchForm: FC<{}> = ({}) => {
  const [dropOffLocationType, setDropOffLocationType] = useState<'Umrah' | 'Hajj'>('Umrah');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedDates, setSelectedDates] = useState<any>(null);
  const [packagesUrl, setPackagesUrl] = useState<string>("/packages");
  const dateRangeRef = useRef<HTMLButtonElement>(null);

  const buildPackagesUrl = (locationObj: any, datesObj: any) => {
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
    let dateStart = '';
    let dateEnd = '';
    // Helper to format date as YYYY-MM-DD
    const formatDate = (d: any) => {
      if (!d) return '';
      const date = typeof d === 'string' ? new Date(d) : d;
      if (isNaN(date.getTime())) return '';
      return date.toISOString().slice(0, 10);
    };
    if (datesObj && datesObj.startDate && datesObj.endDate) {
      dateStart = formatDate(datesObj.startDate);
      dateEnd = formatDate(datesObj.endDate);
    }
    const params = new URLSearchParams();
    if (location) params.append('location', location);
    if (dateStart) params.append('datestart', dateStart);
    if (dateEnd) params.append('dateend', dateEnd);
    return params.toString() ? `/packages?${params.toString()}` : '/packages';
  };

  const handleLocationSelect = (value: any) => {
    setSelectedLocation(value);
    // Focus the StayDatesRangeInput when location is selected
    if (dateRangeRef.current) {
      dateRangeRef.current.focus();
    }
  };

  const handleDateSelect = (value: any) => {
    setSelectedDates(value);
  };

  useEffect(() => {
    setPackagesUrl(buildPackagesUrl(selectedLocation, selectedDates));
  }, [selectedLocation, selectedDates]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No need to update packagesUrl here, it's already updated in the handlers
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
          <StayDatesRangeInput className="flex-1" onDateSelect={handleDateSelect}  />
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
