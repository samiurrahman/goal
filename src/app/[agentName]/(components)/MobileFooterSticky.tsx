'use client';

import React, { useEffect, useState } from 'react';
import PurchaseSummaryInteractive from './PurchaseSummaryInteractive';

type RoomRate = { value: string; people: number; default: boolean };

interface MobileFooterStickyProps {
  sharingRates: RoomRate[];
  initialGuests: number;
  initialSharing: number;
  reserveHref: string;
  priceLabel: string;
}

const MobileFooterSticky = ({
  sharingRates,
  initialGuests,
  initialSharing,
  reserveHref,
  priceLabel,
}: MobileFooterStickyProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isExpanded]);

  return (
    <div className="block lg:hidden">
      {isExpanded ? (
        <button
          type="button"
          aria-label="Close purchase summary"
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setIsExpanded(false)}
        />
      ) : null}

      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
          isExpanded ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-full rounded-t-3xl bg-white dark:bg-neutral-900">
          <div className="container max-h-[78vh] overflow-y-auto py-4">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                className="text-sm font-medium text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-100"
                onClick={() => setIsExpanded(false)}
              >
                Close
              </button>
            </div>
            <PurchaseSummaryInteractive
              sharingRates={sharingRates}
              initialGuests={initialGuests}
              initialSharing={initialSharing}
              reserveHref={reserveHref}
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 inset-x-0 py-2 sm:py-3 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-6000 z-40">
        <div className="container flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="block text-lg sm:text-xl font-semibold truncate">
              {priceLabel}
              <span className="ml-1 text-sm font-normal text-neutral-500 dark:text-neutral-400">
                /person
              </span>
            </span>
            <span className="block text-sm underline font-medium">Instant confirmation</span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="ttnc-ButtonPrimary disabled:bg-opacity-70 bg-primary-6000 hover:bg-primary-700 text-neutral-50 relative h-auto inline-flex items-center justify-center rounded-2xl transition-colors text-sm sm:text-base font-medium px-5 sm:px-7 py-3"
          >
            Reserve
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileFooterSticky;
