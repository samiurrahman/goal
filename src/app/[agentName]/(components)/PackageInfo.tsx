import React from 'react';

interface PackageInfoProps {
  title: string;
  details: string[];
}

const PackageInfo: React.FC<PackageInfoProps> = ({ title, details }) => (
  <div className="listingSection__wrap !space-y-4">
    <h2 className="text-xl font-light">{title}</h2>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
    <div className="text-neutral-600 dark:text-neutral-300 text-sm gap-3 grid">
      {details.map((text, idx) => (
        <span key={idx}>
          {text}          
        </span>
      ))}
    </div>
  </div>
);

export default PackageInfo;
