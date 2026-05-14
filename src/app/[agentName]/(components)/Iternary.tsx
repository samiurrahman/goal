import React from 'react';
import IternaryItem, { IternaryItemProps } from './IternaryItem';

export interface IternaryProps {
  data: IternaryItemProps[];
}

const Iternary: React.FC<IternaryProps> = ({ data }) => {
  const itineraryItems = Array.isArray(data) ? data.filter(Boolean) : [];

  return (
    <div className="listingSection__wrap !space-y-0 !p-0 overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <div className="px-6 pt-6 pb-2 sm:px-8 sm:pt-8">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.10em] text-neutral-500 dark:text-neutral-400">
          Itinerary
        </h3>
      </div>

      <div className="px-6 pb-6 sm:px-8 sm:pb-8">
        {itineraryItems.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No itinerary available yet.
          </p>
        ) : (
          <ol
            className="relative pl-7 list-none m-0"
            style={{ ['--timeline-line' as never]: 'rgb(var(--c-primary-200))' }}
          >
            <span
              className="absolute left-[9px] top-2 bottom-10 w-0.5 bg-primary-200"
              aria-hidden
            />
            {itineraryItems.map((item, idx) => (
              <IternaryItem
                key={`${item.fromDate}-${item.toDate}-${idx}`}
                fromDate={item.fromDate || ''}
                fromLocation={item.fromLocation || ''}
                toDate={item.toDate || ''}
                toLocation={item.toLocation || ''}
                tripTime={item.tripTime || ''}
                flightInfo={item.flightInfo || ''}
                nextLegLabel={item.nextLegLabel || ''}
                icon={item.icon || ''}
                isLast={idx === itineraryItems.length - 1}
              />
            ))}
            <li className="relative pt-1">
              <span
                className="absolute -left-[30px] top-[2px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-neutral-900 ring-2 bg-secondary-500 text-white ring-secondary-200"
                aria-hidden
              >
                <i className="las la-flag-checkered text-[13px] leading-none" />
              </span>
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-secondary-700 dark:text-secondary-300">
                Journey complete
              </div>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                End of itinerary. May your Hajj be accepted.
              </p>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
};

export default Iternary;
