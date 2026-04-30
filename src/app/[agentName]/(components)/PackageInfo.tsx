import React from 'react';

interface PackageInfoProps {
  data: { title: string; details: string[] };
}

const PackageInfo: React.FC<PackageInfoProps> = ({ data }) => (
  <div className="listingSection__wrap !space-y-4">
    <h2 className="text-xl font-normal text-gray-900">{data.title}</h2>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
    <div className="text-neutral-600 dark:text-neutral-300 text-sm gap-3 grid">
      {data.details?.length === 0 ? (
        <span>No stay information available.</span>
      ) : (
        data.details?.map((text, idx) => (
          <div key={idx} className="flex items-start gap-2.5">
            <i className="las la-check-circle text-base text-neutral-900 dark:text-neutral-100 mt-[1px]"></i>
            <span>{text}</span>
          </div>
        ))
      )}
    </div>
  </div>
);
export default PackageInfo;
