import React from 'react';

interface LocationSectionProps {
  title: string;
  address: string;
  mapSrc: string;
}

const LocationSection: React.FC<LocationSectionProps> = ({ title, address, mapSrc }) => (
  <div className="listingSection__wrap">
    {/* HEADING */}
    <div>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <span className="block mt-2 text-neutral-500 dark:text-neutral-400">{address}</span>
    </div>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />

    {/* MAP */}
    <div className="aspect-w-5 aspect-h-5 sm:aspect-h-3 ring-1 ring-black/10 rounded-xl z-0">
      <div className="rounded-xl overflow-hidden z-0">
        <iframe
          width="100%"
          height="100%"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={mapSrc}
        ></iframe>
      </div>
    </div>
  </div>
);

export default LocationSection;
