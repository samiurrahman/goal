import React from 'react';
import IternaryItem, { IternaryItemProps } from './IternaryItem';

export interface IternaryProps {
  data: IternaryItemProps[];
}

const Iternary: React.FC<IternaryProps> = ({ data }) => {
  const itineraryItems = Array.isArray(data) ? data.filter(Boolean) : [];

  return (
    <div className="listingSection__wrap !space-y-4">
      <h2 className="text-xl font-normal text-gray-900">Iternary</h2>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

      {itineraryItems.length === 0 ? (
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          No itinerary available yet.
        </span>
      ) : (
        itineraryItems.map((item, idx) => (
          <div key={`${item.fromDate}-${item.toDate}-${idx}`}>
            <IternaryItem
              fromDate={item.fromDate || ''}
              fromLocation={item.fromLocation || ''}
              toDate={item.toDate || ''}
              toLocation={item.toLocation || ''}
              tripTime={item.tripTime || ''}
              flightInfo={item.flightInfo || ''}
            />

            {idx < itineraryItems.length - 1 ? (
              <div className="my-7 md:my-10 space-y-2 md:pl-24">
                <div className="border-t border-neutral-200 dark:border-neutral-700" />
                {item.nextLegLabel?.trim() ? (
                  <div className="text-neutral-700 dark:text-neutral-300 text-sm">
                    {item.nextLegLabel.trim()}
                  </div>
                ) : null}
                <div className="border-t border-neutral-200 dark:border-neutral-700" />
              </div>
            ) : item.nextLegLabel?.trim() ? (
              <div className="my-7 md:my-10 space-y-2 md:pl-24">
                <div className="border-t border-neutral-200 dark:border-neutral-700" />
                <div className="text-neutral-700 dark:text-neutral-300 text-sm">
                  {item.nextLegLabel.trim()}
                </div>
                <div className="border-t border-neutral-200 dark:border-neutral-700" />
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
};

export default Iternary;
