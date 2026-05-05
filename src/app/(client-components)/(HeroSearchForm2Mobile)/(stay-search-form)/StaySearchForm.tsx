'use client';

import React from 'react';
import Checkbox from '@/shared/Checkbox';
import { MONTHS_LIST_WITH_ANY } from '@/contains/contants';
import LocationInput from '../LocationInput';
import { usePackageSearch } from '@/hooks/usePackageSearch';

interface StaySearchFormProps {
  onUrlChange?: (url: string) => void;
}

const StaySearchForm: React.FC<StaySearchFormProps> = ({ onUrlChange }) => {
  const {
    locationValue,
    setLocationValue,
    handleSelectLocation,
    monthStates,
    handleChangeMonth,
    monthLabel,
    packagesUrl,
  } = usePackageSearch();

  React.useEffect(() => {
    onUrlChange?.(packagesUrl);
  }, [packagesUrl, onUrlChange]);

  const [fieldNameShow, setFieldNameShow] = React.useState<'location' | 'month'>('location');

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
            <span>{locationValue || 'Location'}</span>
          </button>
        ) : (
          <LocationInput
            defaultValue={locationValue}
            onChange={(value) => {
              setLocationValue(value);
              setFieldNameShow('month');
            }}
            onLocationSelect={(city) => {
              handleSelectLocation(city);
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
            <span>{monthLabel || 'Any'}</span>
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
