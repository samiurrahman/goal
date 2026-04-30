import React, { FC } from 'react';

interface Amenity {
  name: string;
  icon: string;
}

interface AmenitiesSectionProps {
  amenities: Amenity[];
}

const AmenitiesSection: FC<AmenitiesSectionProps> = ({ amenities }) => (
  <div className="listingSection__wrap !space-y-4">
    <div>
      <h2 className="text-xl font-normal text-gray-900">Amenities </h2>
    </div>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-neutral-700 dark:text-neutral-300 ">
      {amenities.slice(0, 12).map((item) => (
        <div key={item.name} className="flex items-center space-x-3">
          <i className="las la-check-circle text-2xl"></i>
          <span>{item.name}</span>
        </div>
      ))}
    </div>
  </div>
);

export default AmenitiesSection;
