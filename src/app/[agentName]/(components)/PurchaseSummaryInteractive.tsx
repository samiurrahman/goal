'use client';

import React, { useEffect, useMemo, useState } from 'react';
import ReserveLink from '@/components/ReserveLink';

type RoomRate = { value: string; people: number; default: boolean };

export interface PurchaseSummaryInteractiveProps {
  sharingRates: RoomRate[];
  initialGuests: number;
  initialSharing: number;
  checkoutUrl: string;
  className?: string;
  flat?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const withGuestsAndSharing = (baseHref: string, guests: number, sharing: number) => {
  try {
    const url = new URL(baseHref, 'https://local.searchumrah');
    url.searchParams.set('guests', String(guests));
    url.searchParams.set('sharing', String(sharing));
    return `${url.pathname}${url.search}`;
  } catch {
    return baseHref;
  }
};

const PurchaseSummaryInteractive: React.FC<PurchaseSummaryInteractiveProps> = ({
  sharingRates,
  initialGuests,
  initialSharing,
  checkoutUrl,
  className = '',
  flat = false,
}) => {
  // The set of tiers the agent actually quoted, sorted small-to-large.
  // Drives the sharing pill selector below — we never offer the user a
  // sharing option the agent didn't price, since clicking it would just
  // fall back to default without explanation.
  const availableSharing = useMemo(
    () =>
      [...sharingRates]
        .map((r) => Number(r.people))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b),
    [sharingRates]
  );

  // Pick the initial sharing tier: prefer the URL/parent-supplied value if
  // it matches a real rate; otherwise the agent's marked default; otherwise
  // the first available tier. Never clamp to a hardcoded [2, 5] — that
  // silently masked agents who only sold quads.
  const resolveInitialSharing = (requested: number): number => {
    if (availableSharing.includes(requested)) return requested;
    const defaultRate = sharingRates.find((r) => r.default);
    if (defaultRate?.people && availableSharing.includes(defaultRate.people)) {
      return defaultRate.people;
    }
    return availableSharing[0] ?? requested;
  };

  const [numberOfGuests, setNumberOfGuests] = useState(() => clamp(initialGuests, 1, 20));
  const [sharingCount, setSharingCount] = useState(() => resolveInitialSharing(initialSharing));

  useEffect(() => {
    setNumberOfGuests(clamp(initialGuests, 1, 20));
    setSharingCount(resolveInitialSharing(initialSharing));
    // resolveInitialSharing closes over availableSharing / sharingRates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGuests, initialSharing, availableSharing.join(',')]);

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

  const resolvedCheckoutUrl = useMemo(
    () => withGuestsAndSharing(checkoutUrl, numberOfGuests, sharingCount),
    [checkoutUrl, numberOfGuests, sharingCount]
  );

  const minusBtnClass =
    'w-7 h-7 rounded-full flex items-center justify-center border border-neutral-300 dark:border-neutral-600 text-primary-6000 text-base leading-none disabled:text-neutral-300 dark:disabled:text-neutral-600 transition';
  const plusBtnClass = minusBtnClass;

  return (
    <div
      className={`listingSectionSidebar__wrap !space-y-0 !p-0 overflow-hidden ${flat ? '!shadow-none !border-0 !rounded-none' : 'shadow-xl'} ${className}`}
    >
      <div className="px-5 sm:px-6 pt-5 pb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-primary-900 dark:text-primary-200 leading-none tracking-tight">
            INR {formattedPrice}
          </span>
          <span className="text-[13px] font-normal text-neutral-500 dark:text-neutral-400">
            / person
          </span>
        </div>
        {sharingCount ? (
          <div className="mt-1 text-[12px] text-neutral-500 dark:text-neutral-400">
            {sharingCount}-sharing room · change tier below
          </div>
        ) : null}
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 text-[12px] font-medium">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                fillRule="evenodd"
                d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Includes flight, hotel, visa & transfers
          </span>
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-700" />

      <div className="px-5 sm:px-6 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">
              Guests
            </div>
            <div className="text-[12px] text-neutral-500 dark:text-neutral-400">
              Adults (12 yrs+)
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNumberOfGuests((prev) => clamp(prev - 1, 1, 20))}
              disabled={numberOfGuests <= 1}
              aria-label="Decrease guests"
              className={minusBtnClass}
            >
              −
            </button>
            <span className="w-5 text-center text-[14px] font-medium">{numberOfGuests}</span>
            <button
              type="button"
              onClick={() => setNumberOfGuests((prev) => clamp(prev + 1, 1, 20))}
              disabled={numberOfGuests >= 20}
              aria-label="Increase guests"
              className={plusBtnClass}
            >
              +
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div>
            <div className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">
              Sharing
            </div>
            <div className="text-[12px] text-neutral-500 dark:text-neutral-400">
              Per-room occupancy — pick from what the agent offers
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableSharing.length === 0 ? (
              <span className="text-[12px] text-neutral-500">No sharing options listed.</span>
            ) : (
              availableSharing.map((people) => {
                const active = people === sharingCount;
                return (
                  <button
                    key={people}
                    type="button"
                    onClick={() => setSharingCount(people)}
                    aria-pressed={active}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-medium transition ${
                      active
                        ? 'border-primary-6000 bg-primary-6000 text-white shadow-sm'
                        : 'border-neutral-300 text-neutral-700 hover:border-primary-400 dark:border-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {people}-sharing
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="bg-neutral-50 dark:bg-neutral-800/50 px-5 sm:px-6 py-3 space-y-1.5">
        <div className="flex justify-between text-[12.5px] text-neutral-600 dark:text-neutral-300">
          <span>
            INR {formattedPrice} × {numberOfGuests} {numberOfGuests === 1 ? 'guest' : 'guests'}
          </span>
          <span>INR {formattedTotal}</span>
        </div>
        <div className="flex justify-between text-[12.5px] text-neutral-600 dark:text-neutral-300">
          <span>GST (5%)</span>
          <span>INR {formattedGst}</span>
        </div>
        <div className="flex justify-between text-[12.5px] text-neutral-600 dark:text-neutral-300">
          <span>Visa & ihram</span>
          <span>INR 0</span>
        </div>
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-2 mt-2 flex justify-between items-center">
          <span className="text-[14px] font-semibold text-neutral-900 dark:text-neutral-100">
            Total
          </span>
          <span className="text-[17px] font-bold text-primary-900 dark:text-primary-200 tracking-tight">
            INR {formattedGrandTotal}
          </span>
        </div>
      </div>

      <div className="px-5 sm:px-6 pt-4 pb-3">
        <ReserveLink
          checkoutUrl={resolvedCheckoutUrl}
          className="ttnc-ButtonPrimary disabled:bg-opacity-70 bg-primary-6000 hover:bg-primary-700 text-neutral-50 relative h-auto inline-flex items-center justify-center rounded-full transition-colors text-[14px] font-semibold w-full px-6 py-3.5"
        >
          Send enquiry
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5 ml-2"
          >
            <path
              fillRule="evenodd"
              d="M3 10a1 1 0 011-1h11.586l-3.293-3.293a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414-1.414L15.586 11H4a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </ReserveLink>
        <p className="mt-2.5 text-center text-[12px] text-neutral-500 dark:text-neutral-400">
          No charge yet · Pay <span className="font-semibold">only after the agent confirms</span>
        </p>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-700" />

      <ul className="px-5 sm:px-6 py-3 space-y-1.5 text-[12.5px] text-neutral-600 dark:text-neutral-300">
        <li className="flex items-start gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Searchumrah <span className="font-semibold">never holds your money</span>. You pay the
            agent directly.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            <span className="font-semibold">Free cancellation</span> up to 30 days before
            departure.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-3.5 h-3.5 mt-0.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0"
          >
            <path
              fillRule="evenodd"
              d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Government-licensed & <span className="font-semibold">verified agent</span>.
          </span>
        </li>
      </ul>
    </div>
  );
};

export default PurchaseSummaryInteractive;
