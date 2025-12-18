import React from 'react';

interface PackageInfoProps {
  title: string;
  details: string[];
}

const PackageInfo: React.FC<PackageInfoProps> = ({ title, details }) => (
  <div className="listingSection__wrap">
    <h2 className="text-2xl font-semibold">{title}</h2>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
    <div className="text-neutral-6000 dark:text-neutral-300">
      {details.map((text, idx) => (
        <span key={idx}>
          {text}
          <br />
          <br />
        </span>
      ))}
    </div>
  </div>
);

export default PackageInfo;
