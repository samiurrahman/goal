'use client';

import {
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import React, { FC, useEffect, useState } from 'react';
import Input from '@/shared/Input';
import Label from '@/components/Label';
import Textarea from '@/shared/Textarea';
import ButtonPrimary from '@/shared/ButtonPrimary';
import StartRating from '@/components/StartRating';
import Breadcrumb from '@/components/Breadcrumb';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

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

const CheckOutPagePageMain: FC<CheckOutPagePageMainProps> = ({ className = '' }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const guestsFromUrl = Number(searchParams.get('guests'));
  const slugFromUrl = searchParams.get('slug');
  const agentNameFromUrl = searchParams.get('agent_name');
  const initialAdults = Number.isFinite(guestsFromUrl) && guestsFromUrl > 0 ? guestsFromUrl : 2;

  const [guestForms, setGuestForms] = useState<GuestForm[]>(() =>
    Array.from({ length: Math.max(1, initialAdults) }, () => createEmptyGuestForm())
  );
  const [expandedGuestIndexes, setExpandedGuestIndexes] = useState<number[]>([0]);
  const [guestFormErrors, setGuestFormErrors] = useState<Array<{ name?: string; age?: string }>>([]);
  const [bookingMobile, setBookingMobile] = useState('');
  const [bookingMobileError, setBookingMobileError] = useState('');

  const totalGuests = initialAdults;

  useEffect(() => {
    const requiredCount = Math.max(1, totalGuests);
    setGuestForms((prev) => {
      if (prev.length >= requiredCount) return prev;
      return [
        ...prev,
        ...Array.from({ length: requiredCount - prev.length }, () => createEmptyGuestForm()),
      ];
    });
  }, [totalGuests]);

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

    router.push('/pay-done');
  };

  const renderSidebar = () => {
    return (
      <div className="listingSection__wrap w-full flex flex-col sm:rounded-2xl lg:border border-neutral-200 dark:border-neutral-700 space-y-6 sm:space-y-8 px-0 sm:p-6 xl:p-8 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center">
          <div className="flex-shrink-0 w-full sm:w-40">
            <div className="aspect-w-4 aspect-h-3 sm:aspect-h-4 rounded-2xl overflow-hidden">
              <Image
                alt=""
                fill
                sizes="200px"
                src="https://images.pexels.com/photos/6373478/pexels-photo-6373478.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
              />
            </div>
          </div>
          <div className="py-5 sm:px-5 space-y-3">
            <div>
              <span className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-1">
                Hotel room in Tokyo, Jappan
              </span>
              <span className="text-base font-medium mt-1 block">The Lounge & Bar</span>
            </div>
            <span className="block text-sm text-neutral-500 dark:text-neutral-400">2 beds · 2 baths</span>
            <div className="w-10 border-b border-neutral-200 dark:border-neutral-700"></div>
            <StartRating />
          </div>
        </div>
        <div className="flex flex-col space-y-4">
          <h3 className="text-2xl font-semibold">Price detail</h3>
          <div className="flex justify-between text-neutral-6000 dark:text-neutral-300">
            <span>$19 x 3 day</span>
            <span>$57</span>
          </div>
          <div className="flex justify-between text-neutral-6000 dark:text-neutral-300">
            <span>Service charge</span>
            <span>$0</span>
          </div>
          <div className="border-b border-neutral-200 dark:border-neutral-700"></div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>$57</span>
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
            { label: 'https://www.hajjscanner.com', href: '/' },
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
