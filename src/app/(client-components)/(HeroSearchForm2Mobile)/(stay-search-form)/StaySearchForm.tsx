'use client';

import React, { useState } from 'react';
import Checkbox from '@/shared/Checkbox';
import { MONTHS_LIST_WITH_ANY } from '@/contains/contants';
import LocationInput from '../LocationInput';

const StaySearchForm = () => {
  const [fieldNameShow, setFieldNameShow] = useState<'location' | 'month'>('location');
  const [locationInputTo, setLocationInputTo] = useState('');
  const [monthStates, setMonthStates] = useState<string[]>([]);

  const handleChangeMonth = (checked: boolean, name: string) => {
    setMonthStates((prev) => {
      if (checked) {
        if (name === 'Any') {
          return ['Any'];
        }

        const withoutAny = prev.filter((item) => item !== 'Any');
        return withoutAny.includes(name) ? withoutAny : [...withoutAny, name];
      }

      return prev.filter((item) => item !== name);
    });
  };

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
            className="w-full flex justify-between text-sm font-medium p-4"
            onClick={() => setFieldNameShow('location')}
          >
            <span className="text-neutral-400">Where</span>
            <span>{locationInputTo || 'Location'}</span>
          </button>
        ) : (
          <LocationInput
            defaultValue={locationInputTo}
            onChange={(value) => {
              setLocationInputTo(value);
              setFieldNameShow('month');
            }}
          />
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
            className="w-full flex justify-between text-sm font-medium p-4"
            onClick={() => setFieldNameShow('month')}
          >
            <span className="text-neutral-400">Month</span>
            <span>{monthStates.length > 0 ? monthStates.join(', ') : 'Any'}</span>
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
    <div>
      <div className="w-full space-y-5">
        {renderInputLocation()}
        {renderInputMonth()}
      </div>
    </div>
  );
};

export default StaySearchForm;
