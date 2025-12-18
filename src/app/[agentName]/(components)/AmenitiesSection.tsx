import React, { FC, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import ButtonSecondary from '@/shared/ButtonSecondary';
import ButtonClose from '@/shared/ButtonClose';

interface Amenity {
  name: string;
  icon: string;
}

interface AmenitiesSectionProps {
  amenities: Amenity[];
}

const AmenitiesSection: FC<AmenitiesSectionProps> = ({ amenities }) => (
  <div className="listingSection__wrap">
    <div>
      <h2 className="text-2xl font-semibold">Amenities </h2>
      <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
        {` About the property's amenities and services`}
      </span>
    </div>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 text-sm text-neutral-700 dark:text-neutral-300 ">
      {amenities.slice(0, 12).map((item) => (
        <div key={item.name} className="flex items-center space-x-3">
          <i className={`text-3xl las ${item.icon}`}></i>
          <span>{item.name}</span>
        </div>
      ))}
    </div>
  </div>
);

export default AmenitiesSection;
