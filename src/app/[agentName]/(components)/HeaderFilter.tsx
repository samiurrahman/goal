import React, { FC, ReactNode } from 'react';

export interface HeaderFilterProps {
  tabActive: string;
  tabs: string[];
  heading: ReactNode;
  subHeading?: ReactNode;
}

const HeaderFilter: FC<HeaderFilterProps> = ({
  tabActive,
  tabs,
  subHeading = '',
  heading = 'Latest Articles 🎈',
}) => {
  return (
    <div className="flex flex-col mb-8 relative">
      <div>
        <h2 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
          {heading}
        </h2>
        {subHeading ? (
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">{subHeading}</p>
        ) : null}
      </div>
      <div className="mt-4 flex items-center gap-2 overflow-x-auto hiddenScrollbar">
        {tabs.map((item, index) => {
          const isActive = item === tabActive;
          return (
            <span
              key={index}
              className={`px-4 py-2 rounded-full border whitespace-nowrap text-sm ${
                isActive
                  ? 'bg-neutral-900 text-white border-neutral-900 dark:bg-white dark:text-neutral-900 dark:border-white'
                  : 'bg-white text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700'
              }`}
            >
              {item}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default HeaderFilter;
