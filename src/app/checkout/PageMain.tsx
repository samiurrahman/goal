'use client';

import {
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import React, { FC, useEffect, useMemo, useState } from 'react';
import Input from '@/shared/Input';
import Label from '@/components/Label';
import Textarea from '@/shared/Textarea';
import ButtonPrimary from '@/shared/ButtonPrimary';
import Breadcrumb from '@/components/Breadcrumb';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import type { PackageDetails } from '@/data/types';
import { supabase } from '@/utils/supabaseClient';
import NcInputNumber from '@/components/NcInputNumber';

export interface CheckOutPagePageMainProps {
  className?: string;
}

type GuestForm = {
  title: 'Mr' | 'Mrs' | 'Ms';
  name: string;
  age: string;
  email: string;
  mobile: string;
};

const createEmptyGuestForm = (): GuestForm => ({
  title: 'Mr',
  name: '',
  age: '',
  email: '',
  mobile: '',
});

type SharingRate = {
  value: string;
  people: number;
  default: boolean;
};

const CheckOutPagePageMain: FC<CheckOutPagePageMainProps> = ({ className = '' }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const guestsFromUrl = Number(searchParams.get('guests'));
  const sharingFromUrl = Number(searchParams.get('sharing'));
  const slugFromUrl = searchParams.get('slug');
  const agentNameFromUrl = searchParams.get('agent_name');
  const initialAdults = Number.isFinite(guestsFromUrl) && guestsFromUrl > 0 ? guestsFromUrl : 2;

  const { data: packageDetails } = useQuery<PackageDetails | null>({
    queryKey: ['package_details', slugFromUrl, agentNameFromUrl],
    enabled: !!slugFromUrl && !!agentNameFromUrl,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('slug', slugFromUrl)
        .eq('agent_name', agentNameFromUrl)
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

  const [guestForms, setGuestForms] = useState<GuestForm[]>(() =>
    Array.from({ length: Math.max(1, initialAdults) }, () => createEmptyGuestForm())
  );
  const [expandedGuestIndexes, setExpandedGuestIndexes] = useState<number[]>([0]);
  const [guestFormErrors, setGuestFormErrors] = useState<Array<{ name?: string; age?: string }>>([]);
  const [bookingMobile, setBookingMobile] = useState('');
  const [bookingMobileError, setBookingMobileError] = useState('');

  const sharingRates = useMemo<SharingRate[]>(() => {
    try {
      const raw = packageDetails?.sharing_rate;
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return parsed?.json?.rates ?? parsed?.rates ?? [];
    } catch {
      return [];
    }
  }, [packageDetails?.sharing_rate]);

  const selectedRate = useMemo(() => {
    const matchedRate = sharingRates.find((rate) => rate.people === sharingFromUrl);
    return matchedRate ?? sharingRates.find((rate) => rate.default) ?? sharingRates[0];
  }, [sharingFromUrl, sharingRates]);

  const [sharingCount, setSharingCount] = useState<number>(
    Number.isFinite(sharingFromUrl) && sharingFromUrl > 0 ? sharingFromUrl : 2
  );

  useEffect(() => {
    if (selectedRate?.people) {
      setSharingCount(selectedRate.people);
    }
  }, [selectedRate]);

  const activeRate = useMemo(() => {
    const matchedRate = sharingRates.find((rate) => rate.people === sharingCount);
    return matchedRate ?? selectedRate;
  }, [selectedRate, sharingCount, sharingRates]);

  const totalGuests = guestForms.length;

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

  const purchaseDetails = useMemo(() => {
    const pricePerPerson = Number(activeRate?.value ?? packageDetails?.price_per_person ?? 0);
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
  }, [activeRate?.value, packageDetails?.currency, packageDetails?.price_per_person, totalGuests]);

  const sharingMin = useMemo(() => {
    if (sharingRates.length === 0) return 1;
    return Math.min(...sharingRates.map((rate) => rate.people));
  }, [sharingRates]);

  const sharingMax = useMemo(() => {
    if (sharingRates.length === 0) return 5;
    return Math.max(...sharingRates.map((rate) => rate.people));
  }, [sharingRates]);

  const handleGuestFormChange = (index: number, field: keyof GuestForm, value: string) => {
    if (field === 'name' || field === 'age') {
      setGuestFormErrors((prev) =>
        prev.map((error, i) => (i === index ? { ...error, [field]: undefined } : error))
      );
    }

    setGuestForms((prev) =>
      prev.map((form, i) => (i === index ? { ...form, [field]: value } : form))
    );
  };

  const handleAddGuestForm = () => {
    setGuestForms((prev) => {
      const nextIndex = prev.length;
      setExpandedGuestIndexes((expandedPrev) =>
        expandedPrev.includes(nextIndex) ? expandedPrev : [...expandedPrev, nextIndex]
      );
      return [...prev, createEmptyGuestForm()];
    });
    setGuestFormErrors((prev) => [...prev, {}]);
  };

  const handleDeleteGuestForm = (index: number) => {
    setGuestForms((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });

    setExpandedGuestIndexes((prev) => {
      const reIndexed = prev.filter((i) => i !== index).map((i) => (i > index ? i - 1 : i));
      return reIndexed.length > 0 ? reIndexed : [0];
    });

    setGuestFormErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleGuestCard = (index: number) => {
    setExpandedGuestIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleConfirmAndPay = () => {
    const nextErrors = guestForms.map((form) => ({
      name: form.name.trim() ? undefined : 'Name is required',
      age: form.age.trim() ? undefined : 'Age is required',
    }));

    const invalidIndexes = nextErrors
      .map((error, index) => ({ index, hasError: !!error.name || !!error.age }))
      .filter((item) => item.hasError)
      .map((item) => item.index);

    setGuestFormErrors(nextErrors);
    const hasMobile = !!bookingMobile.trim();
    setBookingMobileError(hasMobile ? '' : 'Mobile number is required');

    if (invalidIndexes.length > 0 || !hasMobile) {
      setExpandedGuestIndexes((prev) => Array.from(new Set([...prev, ...invalidIndexes])));
      return;
    }

    const params = new URLSearchParams();

    if (slugFromUrl) {
      params.set('slug', slugFromUrl);
    }
    if (agentNameFromUrl) {
      params.set('agent_name', agentNameFromUrl);
    }

    params.set('guests', String(totalGuests));
    params.set('sharing', String(sharingCount));
    params.set('booking_mobile', bookingMobile.trim());
    params.set('guest_forms', JSON.stringify(guestForms));

    router.push(`/checkout/order?${params.toString()}`);
  };

  const renderSidebar = () => {
    return (
      <div className="listingSection__wrap w-full flex flex-col sm:rounded-2xl lg:border border-neutral-200 dark:border-neutral-700 space-y-6 sm:space-y-8 px-0 sm:p-6 xl:p-8 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="flex-shrink-0 w-full sm:w-40">
            <div className="aspect-w-4 aspect-h-3 sm:aspect-h-4 rounded-2xl overflow-hidden">
              <Image
                alt={packageDetails?.title ?? 'Package image'}
                fill
                sizes="200px"
                src={packageDetails?.thumbnail_url || '/default-image.jpg'}
                className="object-cover"
              />
            </div>
          </div>
          <div className="py-5 sm:px-5 space-y-3">
            <div>
              <span className="text-base font-medium mt-1 block">{packageDetails?.title ?? 'Package details'}</span>
              
            </div>
            <div className="space-y-2 text-sm text-neutral-500 dark:text-neutral-400">
              <div className="flex justify-between gap-4">
                <span>Agent Name</span>
                <span className="text-right text-neutral-900 dark:text-neutral-100">
                  {packageDetails?.agent_name ?? agentNameFromUrl ?? 'Package'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Route</span>
                <span className="text-right text-neutral-900 dark:text-neutral-100">
                  {packageDetails?.departure_city && packageDetails?.arrival_city
                    ? `${packageDetails.departure_city} - ${packageDetails.arrival_city}`
                    : 'TBD'}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Travel Dates</span>
                <span className="text-right text-neutral-900 dark:text-neutral-100">{formattedTravelDates}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Location</span>
                <span className="text-right text-neutral-900 dark:text-neutral-100">
                  {packageDetails?.package_location ?? 'TBD'}
                </span>
              </div>
            </div>
            <div className="w-10 border-b border-neutral-200 dark:border-neutral-700"></div>
          </div>
        </div>
        <div className="flex flex-col space-y-4">
          <h3 className="text-2xl font-semibold">Price detail</h3>
          <div className="flex justify-between text-neutral-6000 dark:text-neutral-300">
            <span>Guests</span>
            <span>{totalGuests}</span>
          </div>
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4">
            <NcInputNumber
              label="Sharing"
              desc="Adjust room sharing"
              defaultValue={sharingCount}
              min={sharingMin}
              max={sharingMax}
              onChange={(value) => setSharingCount(value)}
            />
          </div>
          <div className="flex justify-between text-neutral-6000 dark:text-neutral-300">
            <span>Price / Person</span>
            <span>{purchaseDetails.currency} {purchaseDetails.pricePerPerson}</span>
          </div>
          <div className="flex justify-between text-neutral-6000 dark:text-neutral-300">
            <span>Subtotal</span>
            <span>{purchaseDetails.currency} {purchaseDetails.subtotal}</span>
          </div>
          <div className="flex justify-between text-neutral-6000 dark:text-neutral-300">
            <span>GST (5%)</span>
            <span>{purchaseDetails.currency} {purchaseDetails.gstAmount}</span>
          </div>
          <div className="border-b border-neutral-200 dark:border-neutral-700"></div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{purchaseDetails.currency} {purchaseDetails.total}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderMain = () => {
    const packageDetailHref =
      slugFromUrl && agentNameFromUrl ? `/${agentNameFromUrl}/${slugFromUrl}` : undefined;

    return (
      <>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Packages', href: '/packages' },
            ...(slugFromUrl
              ? [
                  packageDetailHref
                    ? { label: slugFromUrl, href: packageDetailHref }
                    : { label: slugFromUrl },
                ]
              : []),
            { label: 'Checkout' },
          ]}
        />

        <div className="listingSection__wrap">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-semibold">Guest Details</h3>
              <button
                type="button"
                onClick={handleAddGuestForm}
                className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                Add Members
              </button>
            </div>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

            <div className="space-y-5">
              {guestForms.map((form, index) => {
                const hasName = form.name.trim().length > 0;
                const cardTitle = hasName ? `${form.title} ${form.name.trim()}` : `Guest ${index + 1}`;
                const isExpanded = expandedGuestIndexes.includes(index);
                const formError = guestFormErrors[index] ?? {};

                return (
                  <div
                    key={`guest-form-${index}`}
                    className="border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4 sm:p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-lg font-semibold">{cardTitle}</h4>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleGuestCard(index)}
                          className="inline-flex items-center justify-center text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                          aria-label={isExpanded ? 'Collapse guest details' : 'Expand guest details'}
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="w-5 h-5" />
                          ) : (
                            <ChevronDownIcon className="w-5 h-5" />
                          )}
                        </button>
                        {guestForms.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteGuestForm(index)}
                            className="inline-flex items-center justify-center text-red-600 hover:text-red-700"
                            aria-label="Delete guest"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] gap-4">
                          <div className="space-y-1">
                            <Label>Title</Label>
                            <select
                              value={form.title}
                              onChange={(e) => handleGuestFormChange(index, 'title', e.target.value)}
                              className="block w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm"
                            >
                              <option value="Mr">Mr</option>
                              <option value="Mrs">Mrs</option>
                              <option value="Ms">Ms</option>
                            </select>
                          </div>

                          <div className="space-y-1 min-w-0">
                            <Label>Name</Label>
                            <Input
                              type="text"
                              value={form.name}
                              onChange={(e) => handleGuestFormChange(index, 'name', e.currentTarget.value)}
                              className={formError.name ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
                              placeholder="Enter full name"
                            />
                            {formError.name ? (
                              <span className="text-xs text-red-600">{formError.name}</span>
                            ) : null}
                          </div>

                          <div className="space-y-1">
                            <Label>Age</Label>
                            <Input
                              type="number"
                              min="0"
                              value={form.age}
                              onChange={(e) => handleGuestFormChange(index, 'age', e.currentTarget.value)}
                              className={formError.age ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
                              placeholder="Age"
                            />
                            {formError.age ? (
                              <span className="text-xs text-red-600">{formError.age}</span>
                            ) : null}
                          </div>
                        </div>

                        
                      </>
                    )}
                  </div>
                );
              })}
            </div>
        </div>
            <div className="space-y-1">
                <Label>Mobile no</Label>
                <Input
                    type="tel"
                    value={bookingMobile}
                    onChange={(e) => {
                      setBookingMobile(e.currentTarget.value);
                      if (e.currentTarget.value.trim()) {
                        setBookingMobileError('');
                      }
                    }}
                    className={bookingMobileError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
                    placeholder="Enter mobile number"
                    />
                {bookingMobileError ? (
                <span className="text-xs text-red-600">{bookingMobileError}</span>
                ) : null}
            </div>
            <div className="space-y-1">
                <Label>Messager for author </Label>
                <Textarea placeholder="..." />
                <span className="text-sm text-neutral-500 block">Write a few sentences about yourself.</span>
            </div>

            <div className="pt-8">
            <ButtonPrimary onClick={handleConfirmAndPay}>Confirm and pay</ButtonPrimary>
            </div>
        </div>
      </>
    );
  };

  return (
    <div className={`nc-CheckOutPagePageMain ${className}`}>
      <main className="container mt-11 mb-24 lg:mb-32 flex flex-col-reverse lg:flex-row">
        <div className="w-full lg:w-3/5 xl:w-2/3 lg:pr-10">{renderMain()}</div>
        <div className="hidden lg:block flex-grow">{renderSidebar()}</div>
      </main>
    </div>
  );
};

export default CheckOutPagePageMain;
