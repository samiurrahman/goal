'use client';

import React, { FC, useMemo } from 'react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { PackageDetails } from '@/data/types';
import { supabase } from '@/utils/supabaseClient';
import StartRating from '@/components/StartRating';

type GuestForm = {
  title: 'Mr' | 'Mrs' | 'Ms';
  name: string;
  age: string;
  email: string;
  mobile: string;
};

type SharingRate = {
  value: string;
  people: number;
  default: boolean;
};

const CheckoutOrderPage: FC = () => {
  const searchParams = useSearchParams();

  const slug = searchParams.get('slug');
  const agentName = searchParams.get('agent_name');
  const agentId = searchParams.get('agent_id');
  const guestsFromUrl = Number(searchParams.get('guests'));
  const sharingFromUrl = Number(searchParams.get('sharing'));
  const bookingMobile = searchParams.get('booking_mobile') ?? '';
  const guestFormsRaw = searchParams.get('guest_forms');

  const { data: packageDetails } = useQuery<PackageDetails | null>({
    queryKey: ['order_package_details', slug, agentName],
    enabled: !!slug && !!agentName,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('slug', slug)
        .eq('agent_name', agentName)
        .single();

      if (error) throw error;

      if (data?.id) {
        const { data: details, error: detailsError } = await supabase
          .from('package_details')
          .select('*')
          .eq('package_id', data.id)
          .single();

        if (detailsError) throw detailsError;
        data.details = details;
      }

      return data;
    },
  });

  const guestForms = useMemo<GuestForm[]>(() => {
    try {
      if (!guestFormsRaw) return [];
      const parsed = JSON.parse(guestFormsRaw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [guestFormsRaw]);

  const totalGuests =
    Number.isFinite(guestsFromUrl) && guestsFromUrl > 0
      ? guestsFromUrl
      : Math.max(guestForms.length, 1);

  const sharingRates = useMemo<SharingRate[]>(() => {
    try {
      const purchaseSummary = packageDetails?.details?.purchase_summary as
        | { rates?: SharingRate[] }
        | undefined;
      const purchaseSummaryRates = purchaseSummary?.rates;
      if (Array.isArray(purchaseSummaryRates) && purchaseSummaryRates.length > 0) {
        return purchaseSummaryRates;
      }

      const raw = packageDetails?.sharing_rate;
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return parsed?.json?.rates ?? parsed?.rates ?? [];
    } catch {
      return [];
    }
  }, [packageDetails?.details?.purchase_summary, packageDetails?.sharing_rate]);

  const selectedRate = useMemo(() => {
    const matchedRate = sharingRates.find((rate) => rate.people === sharingFromUrl);
    return matchedRate ?? sharingRates.find((rate) => rate.default) ?? sharingRates[0];
  }, [sharingFromUrl, sharingRates]);

  const formattedTravelDates = useMemo(() => {
    if (!packageDetails?.departure_date || !packageDetails?.arrival_date) return 'TBD';

    const departure = new Date(packageDetails.departure_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const arrival = new Date(packageDetails.arrival_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `${departure} - ${arrival}`;
  }, [packageDetails?.arrival_date, packageDetails?.departure_date]);

  const totals = useMemo(() => {
    const pricePerPerson = Number(selectedRate?.value ?? packageDetails?.price_per_person ?? 0);
    const subtotal = pricePerPerson * totalGuests;
    const gstAmount = subtotal * 0.05;
    const total = subtotal + gstAmount;

    return {
      currency: packageDetails?.currency ?? 'INR',
      pricePerPerson: pricePerPerson.toLocaleString('en-IN'),
      subtotal: subtotal.toLocaleString('en-IN'),
      gstAmount: gstAmount.toLocaleString('en-IN'),
      total: total.toLocaleString('en-IN'),
    };
  }, [
    packageDetails?.currency,
    packageDetails?.price_per_person,
    selectedRate?.value,
    totalGuests,
  ]);

  return (
    <div className="nc-PayPage">
      <main className="container mt-11 mb-24 lg:mb-32 ">
        <div className="max-w-4xl mx-auto">
          <div className="w-full flex flex-col sm:rounded-2xl space-y-10 px-0 sm:p-6 xl:p-8">
            <div>
              <h2 className="text-3xl lg:text-4xl font-semibold">Order Preview</h2>
              <p className="mt-3 text-neutral-500 dark:text-neutral-400">
                Review the final booking details before moving to payment.
              </p>
            </div>

            <div className="border-b border-neutral-200 dark:border-neutral-700"></div>

            <div className="space-y-6">
              <h3 className="text-2xl font-semibold">Your booking</h3>
              <div className="flex flex-col sm:flex-row sm:items-center">
                <div className="flex-shrink-0 w-full sm:w-40">
                  <div className="aspect-w-4 aspect-h-3 sm:aspect-h-4 rounded-2xl overflow-hidden">
                    <Image
                      fill
                      alt={packageDetails?.title ?? 'Package image'}
                      className="object-cover"
                      src={packageDetails?.thumbnail_url || '/default-image.jpg'}
                    />
                  </div>
                </div>
                <div className="pt-5 sm:pb-5 sm:px-5 space-y-3">
                  <div>
                    <span className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                      {packageDetails?.agent_name ?? agentName ?? 'Package'}
                    </span>
                    <span className="text-base sm:text-lg font-medium mt-1 block">
                      {packageDetails?.title ?? 'Package details'}
                    </span>
                  </div>
                  <span className="block text-sm text-neutral-500 dark:text-neutral-400">
                    {packageDetails?.departure_city && packageDetails?.arrival_city
                      ? `${packageDetails.departure_city} - ${packageDetails.arrival_city}`
                      : 'TBD'}
                  </span>
                  <div className="w-10 border-b border-neutral-200 dark:border-neutral-700"></div>
                  <StartRating />
                </div>
              </div>
              <div className="mt-6 border border-neutral-200 dark:border-neutral-700 rounded-3xl flex flex-col sm:flex-row divide-y sm:divide-x sm:divide-y-0 divide-neutral-200 dark:divide-neutral-700">
                <div className="flex-1 p-5 flex space-x-4">
                  <svg
                    className="w-8 h-8 text-neutral-300 dark:text-neutral-6000"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9.33333 8.16667V3.5M18.6667 8.16667V3.5M8.16667 12.8333H19.8333M5.83333 24.5H22.1667C23.4553 24.5 24.5 23.4553 24.5 22.1667V8.16667C24.5 6.878 23.4553 5.83333 22.1667 5.83333H5.83333C4.54467 5.83333 3.5 6.878 3.5 8.16667V22.1667C3.5 23.4553 4.54467 24.5 5.83333 24.5Z"
                      stroke="#D1D5DB"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-400">Date</span>
                    <span className="mt-1.5 text-lg font-semibold">{formattedTravelDates}</span>
                  </div>
                </div>
                <div className="flex-1 p-5 flex space-x-4">
                  <svg
                    className="w-8 h-8 text-neutral-300 dark:text-neutral-6000"
                    viewBox="0 0 28 28"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M14 5.07987C14.8551 4.11105 16.1062 3.5 17.5 3.5C20.0773 3.5 22.1667 5.58934 22.1667 8.16667C22.1667 10.744 20.0773 12.8333 17.5 12.8333C16.1062 12.8333 14.8551 12.2223 14 11.2535M17.5 24.5H3.5V23.3333C3.5 19.4673 6.63401 16.3333 10.5 16.3333C14.366 16.3333 17.5 19.4673 17.5 23.3333V24.5ZM17.5 24.5H24.5V23.3333C24.5 19.4673 21.366 16.3333 17.5 16.3333C16.225 16.3333 15.0296 16.6742 14 17.2698M15.1667 8.16667C15.1667 10.744 13.0773 12.8333 10.5 12.8333C7.92267 12.8333 5.83333 10.744 5.83333 8.16667C5.83333 5.58934 7.92267 3.5 10.5 3.5C13.0773 3.5 15.1667 5.58934 15.1667 8.16667Z"
                      stroke="#D1D5DB"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>

                  <div className="flex flex-col">
                    <span className="text-sm text-neutral-400">Guests</span>
                    <span className="mt-1.5 text-lg font-semibold">{totalGuests} Guests</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-semibold">Booking detail</h3>
              <div className="flex flex-col space-y-4">
                <div className="flex text-neutral-6000 dark:text-neutral-300">
                  <span className="flex-1">Agent Name</span>
                  <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">
                    {packageDetails?.agent_name ?? agentName ?? 'TBD'}
                  </span>
                </div>
                <div className="flex text-neutral-6000 dark:text-neutral-300">
                  <span className="flex-1">Location</span>
                  <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">
                    {packageDetails?.package_location ?? 'TBD'}
                  </span>
                </div>
                <div className="flex text-neutral-6000 dark:text-neutral-300">
                  <span className="flex-1">Sharing</span>
                  <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">
                    {selectedRate?.people ?? 'TBD'} Person
                  </span>
                </div>
                <div className="flex text-neutral-6000 dark:text-neutral-300">
                  <span className="flex-1">Booking Mobile</span>
                  <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">
                    {bookingMobile || 'TBD'}
                  </span>
                </div>
                <div className="flex text-neutral-6000 dark:text-neutral-300">
                  <span className="flex-1">Price / Person</span>
                  <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">
                    {totals.currency} {totals.pricePerPerson}
                  </span>
                </div>
                <div className="flex text-neutral-6000 dark:text-neutral-300">
                  <span className="flex-1">Subtotal</span>
                  <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">
                    {totals.currency} {totals.subtotal}
                  </span>
                </div>
                <div className="flex text-neutral-6000 dark:text-neutral-300">
                  <span className="flex-1">GST (5%)</span>
                  <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">
                    {totals.currency} {totals.gstAmount}
                  </span>
                </div>
                <div className="flex text-neutral-6000 dark:text-neutral-300">
                  <span className="flex-1">Total</span>
                  <span className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">
                    {totals.currency} {totals.total}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-2xl font-semibold">Travellers</h3>
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  {guestForms.length} traveller{guestForms.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex flex-col space-y-4">
                {guestForms.map((guest, index) => (
                  <div
                    key={`preview-guest-${index}`}
                    className="flex flex-col sm:flex-row sm:items-start gap-4 rounded-3xl border border-neutral-200 dark:border-neutral-700 p-5"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="text-lg font-semibold">
                        {guest.title} {guest.name || `Guest ${index + 1}`}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        Traveller {index + 1}
                      </div>
                    </div>
                    <div className="w-full sm:w-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm sm:min-w-[360px]">
                      <div>
                        <div className="text-neutral-400">Name</div>
                        <div className="mt-1 font-medium">{guest.name || 'TBD'}</div>
                      </div>
                      <div>
                        <div className="text-neutral-400">Age</div>
                        <div className="mt-1 font-medium">{guest.age || 'TBD'}</div>
                      </div>
                      <div>
                        <div className="text-neutral-400">Title</div>
                        <div className="mt-1 font-medium">{guest.title}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {guestForms.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-neutral-300 dark:border-neutral-700 p-5 text-sm text-neutral-500 dark:text-neutral-400">
                    No traveller data was found in this preview.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <ButtonPrimary href="/booking-success">Proceed to Payment</ButtonPrimary>
              <Link
                href={
                  slug && agentName
                    ? `/checkout?slug=${slug}&agent_name=${agentName}${agentId ? `&agent_id=${agentId}` : ''}&guests=${totalGuests}&sharing=${selectedRate?.people ?? sharingFromUrl}`
                    : '/checkout'
                }
                className="inline-flex items-center justify-center px-6 py-4 rounded-full border border-neutral-300 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                Back to checkout
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutOrderPage;
