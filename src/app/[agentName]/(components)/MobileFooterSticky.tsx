import React from 'react';
import Link from 'next/link';

interface MobileFooterStickyProps {
  reserveHref: string;
  priceLabel: string;
}

const MobileFooterSticky = ({ reserveHref, priceLabel }: MobileFooterStickyProps) => {
  return (
    <div className="block lg:hidden fixed bottom-0 inset-x-0 py-2 sm:py-3 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-6000 z-40">
      <div className="container flex items-center justify-between">
        <div className="">
          <span className="block text-xl font-semibold">
            {priceLabel}
            <span className="ml-1 text-sm font-normal text-neutral-500 dark:text-neutral-400">
              /person
            </span>
          </span>
          <span className="block text-sm underline font-medium">Instant confirmation</span>
        </div>
        <Link
          href={reserveHref}
          className="ttnc-ButtonPrimary disabled:bg-opacity-70 bg-primary-6000 hover:bg-primary-700 text-neutral-50 relative h-auto inline-flex items-center justify-center rounded-2xl transition-colors text-sm sm:text-base font-medium px-5 sm:px-7 py-3"
        >
          Reserve
        </Link>
      </div>
    </div>
  );
};

export default MobileFooterSticky;
