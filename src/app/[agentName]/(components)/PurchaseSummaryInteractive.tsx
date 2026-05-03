'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type RoomRate = { value: string; people: number; default: boolean };

export interface PurchaseSummaryInteractiveProps {
  sharingRates: RoomRate[];
  initialGuests: number;
  initialSharing: number;
  reserveHref: string;
  className?: string;
  flat?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const buildReserveHref = (baseHref: string, guests: number, sharing: number) => {
  try {
    const dummyOrigin = 'https://local.hajjscanner';
    const url = new URL(baseHref, dummyOrigin);

    if (url.pathname === '/login') {
      const redirect = url.searchParams.get('redirect');
      if (redirect) {
        const redirectUrl = new URL(redirect, dummyOrigin);
        redirectUrl.searchParams.set('guests', String(guests));
        redirectUrl.searchParams.set('sharing', String(sharing));
        url.searchParams.set('redirect', `${redirectUrl.pathname}${redirectUrl.search}`);
      }
    } else {
      url.searchParams.set('guests', String(guests));
      url.searchParams.set('sharing', String(sharing));
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return baseHref;
  }
};

const PurchaseSummaryInteractive: React.FC<PurchaseSummaryInteractiveProps> = ({
  sharingRates,
  initialGuests,
  initialSharing,
  reserveHref,
  className = '',
  flat = false,
}) => {
  const [numberOfGuests, setNumberOfGuests] = useState(() => clamp(initialGuests, 1, 20));
  const [sharingCount, setSharingCount] = useState(() => clamp(initialSharing, 2, 5));

  useEffect(() => {
    setNumberOfGuests(clamp(initialGuests, 1, 20));
    setSharingCount(clamp(initialSharing, 2, 5));
  }, [initialGuests, initialSharing]);

  const selectedRate =
    sharingRates.find((rate) => rate.people === sharingCount) ??
    sharingRates.find((rate) => rate.default) ??
    sharingRates[0];

  const pricePerPerson = Number(selectedRate?.value ?? 0);
  const total = pricePerPerson * numberOfGuests;
  const gstRate = 0.05;
  const gstAmount = total * gstRate;
  const grandTotal = total + gstAmount;

  const formattedPrice = pricePerPerson.toLocaleString('en-IN');
  const formattedTotal = total.toLocaleString('en-IN');
  const formattedGst = gstAmount.toLocaleString('en-IN');
  const formattedGrandTotal = grandTotal.toLocaleString('en-IN');

  const resolvedReserveHref = useMemo(
    () => buildReserveHref(reserveHref, numberOfGuests, sharingCount),
    [reserveHref, numberOfGuests, sharingCount]
  );

  return (
    <div
      className={`listingSectionSidebar__wrap !space-y-4 ${flat ? '!shadow-none !border-0 !rounded-none' : 'shadow-xl'} ${className}`}
    >
      <div className="flex justify-between">
        <span className="text-2xl font-normal">
          INR {formattedPrice}
          <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">
            /person
          </span>
        </span>
      </div>

      <div
        className={`flex flex-col overflow-hidden ${flat ? '' : 'border border-neutral-200 dark:border-neutral-700 rounded-3xl'}`}
      >
        <div className="p-3 flex items-center justify-between">
          <span className="font-medium text-neutral-800 dark:text-neutral-200">Guests</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNumberOfGuests((prev) => clamp(prev - 1, 1, 20))}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-neutral-400 dark:border-neutral-500"
            >
              -
            </button>
            <span className="w-8 text-center">{numberOfGuests}</span>
            <button
              type="button"
              onClick={() => setNumberOfGuests((prev) => clamp(prev + 1, 1, 20))}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-neutral-400 dark:border-neutral-500"
            >
              +
            </button>
          </div>
        </div>

        {!flat ? (
          <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />
        ) : null}

        <div className="p-3 flex items-center justify-between">
          <span className="font-medium text-neutral-800 dark:text-neutral-200">Sharing</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSharingCount((prev) => clamp(prev - 1, 2, 5))}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-neutral-400 dark:border-neutral-500"
            >
              -
            </button>
            <span className="w-8 text-center">{sharingCount}</span>
            <button
              type="button"
              onClick={() => setSharingCount((prev) => clamp(prev + 1, 2, 5))}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-neutral-400 dark:border-neutral-500"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex justify-between text-neutral-600 dark:text-neutral-300 text-sm">
          <span>
            No of Guest ({numberOfGuests} x {formattedPrice})
          </span>
          <span>INR {formattedTotal}</span>
        </div>
        <div className="flex justify-between text-neutral-6000 dark:text-neutral-300 text-sm">
          <span>GST (5%)</span>
          <span>INR {formattedGst}</span>
        </div>

        {!flat ? <div className="border-b border-neutral-200 dark:border-neutral-700"></div> : null}
        <div className="flex justify-between font-semibold text-md">
          <span>Total</span>
          <span>INR {formattedGrandTotal}</span>
        </div>
      </div>

      <Link
        href={resolvedReserveHref}
        className="ttnc-ButtonPrimary disabled:bg-opacity-70 bg-primary-6000 hover:bg-primary-700 text-neutral-50 relative h-auto inline-flex items-center justify-center rounded-full transition-colors text-sm sm:text-base font-medium px-4 py-3 sm:px-6"
      >
        Reserve
      </Link>
    </div>
  );
};

export default PurchaseSummaryInteractive;
