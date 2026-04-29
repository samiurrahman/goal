'use client';

import React, { useCallback, useMemo, useState } from 'react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import GuestsInput from './GuestsInput';
import NcInputNumber from '@/components/NcInputNumber';
import { GuestsObject } from '@/app/(client-components)/type';
import { useRouter } from 'next/navigation';

type RoomRate = { value: string; people: number; default: boolean };

const GUESTS_DEFAULT: GuestsObject = {
  guestAdults: 1,
  guestChildren: 0,
  guestInfants: 0,
};

export interface PurchaseSummaryProps {
  packageId?: string | number;
  slug: string;
  agentName: string;
  isLoggedIn: boolean;
  sharingRates: RoomRate[];
  initialGuests: number;
  initialSharing: number;
}

const PurchaseSummary: React.FC<PurchaseSummaryProps> = ({
  packageId,
  slug,
  agentName,
  isLoggedIn,
  sharingRates,
  initialGuests,
  initialSharing,
}) => {
  const router = useRouter();
  const [numberOfGuests, setNumberOfGuests] = useState(initialGuests);
  const [sharingCount, setSharingCount] = useState(initialSharing);

  const selectedRate = useMemo(() => {
    const matched = sharingRates.find((rate) => rate.people === sharingCount);
    return matched ?? sharingRates.find((rate) => rate.default) ?? sharingRates[0];
  }, [sharingCount, sharingRates]);

  const handleGuestsChange = useCallback((_: GuestsObject, totalGuests: number) => {
    setNumberOfGuests(totalGuests);
  }, []);

  const handleSharingChange = useCallback((value: number) => {
    setSharingCount(Number(value));
  }, []);

  const handleReserve = useCallback(() => {
    const params = new URLSearchParams();

    if (packageId) {
      params.set('package_id', String(packageId));
    }

    params.set('sharing', String(sharingCount));
    params.set('guests', String(numberOfGuests));
    params.set('slug', slug);
    params.set('agent_name', agentName);

    const checkoutUrl = `/checkout?${params.toString()}`;

    if (isLoggedIn) {
      router.push(checkoutUrl);
      return;
    }

    const redirectQuery = new URLSearchParams();
    redirectQuery.set('guests', String(numberOfGuests));
    redirectQuery.set('sharing', String(sharingCount));
    const redirectPath = `/${agentName}/${slug}?${redirectQuery.toString()}`;

    router.push(`/login?redirect=${encodeURIComponent(redirectPath)}`);
  }, [agentName, isLoggedIn, numberOfGuests, packageId, router, sharingCount, slug]);

  const pricePerPerson = Number(selectedRate?.value ?? 0);
  const total = pricePerPerson * numberOfGuests;
  const gstRate = 0.05;
  const gstAmount = total * gstRate;
  const grandTotal = total + gstAmount;

  const formattedPrice = pricePerPerson.toLocaleString('en-IN');
  const formattedTotal = total.toLocaleString('en-IN');
  const formattedGst = gstAmount.toLocaleString('en-IN');
  const formattedGrandTotal = grandTotal.toLocaleString('en-IN');

  return (
    <div className="listingSectionSidebar__wrap shadow-xl !space-y-4">
      <div className="flex justify-between">
        <span className="text-2xl font-normal">
          INR {formattedPrice}
          <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">
            /person
          </span>
        </span>
      </div>

      <form className="flex flex-col border border-neutral-200 dark:border-neutral-700 rounded-3xl ">
        <GuestsInput
          className="flex-1"
          defaultValue={GUESTS_DEFAULT}
          onChange={handleGuestsChange}
        />
        <div className="w-full border-b border-neutral-200 dark:border-neutral-700"></div>
        <NcInputNumber
          label="Sharing"
          defaultValue={sharingCount}
          className="p-3"
          min={2}
          max={5}
          onChange={handleSharingChange}
        />
      </form>

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

        <div className="border-b border-neutral-200 dark:border-neutral-700"></div>
        <div className="flex justify-between font-semibold text-md">
          <span>Total</span>
          <span>INR {formattedGrandTotal}</span>
        </div>
      </div>

      <ButtonPrimary onClick={handleReserve}>Reserve</ButtonPrimary>
    </div>
  );
};

export default PurchaseSummary;
