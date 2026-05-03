'use client';

import { ChevronDownIcon, ChevronUpIcon, TrashIcon } from '@heroicons/react/24/outline';
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
  save_for_future: boolean;
};

type SavedTraveler = {
  id: string;
  label: string | null;
  first_name: string | null;
  last_name: string | null;
  age?: number | string | null;
  date_of_birth: string | null;
};

const createEmptyGuestForm = (): GuestForm => ({
  title: 'Mr',
  name: '',
  age: '',
  email: '',
  mobile: '',
  save_for_future: false,
});

type SharingRate = {
  value: string;
  people: number;
  default: boolean;
};

const isUuid = (value?: string | null) =>
  !!value &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const CheckOutPagePageMain: FC<CheckOutPagePageMainProps> = ({ className = '' }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const guestsFromUrl = Number(searchParams.get('guests'));
  const sharingFromUrl = Number(searchParams.get('sharing'));
  const slugFromUrl = searchParams.get('slug');
  const agentNameFromUrl = searchParams.get('agent_name');
  const agentIdFromUrl = searchParams.get('agent_id');
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
  const [guestFormErrors, setGuestFormErrors] = useState<Array<{ name?: string; age?: string }>>(
    []
  );
  const [bookingMobile, setBookingMobile] = useState('');
  const [bookingMobileError, setBookingMobileError] = useState('');
  const [savedTravelers, setSavedTravelers] = useState<SavedTraveler[]>([]);
  const [isTravelersLoading, setIsTravelersLoading] = useState(false);
  const [selectedTravelerIds, setSelectedTravelerIds] = useState<string[]>([]);
  const [travelerToGuestIndex, setTravelerToGuestIndex] = useState<Record<string, number>>({});

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

  const [sharingCount, setSharingCount] = useState<number>(
    Number.isFinite(sharingFromUrl) && sharingFromUrl > 0 ? sharingFromUrl : 2
  );

  useEffect(() => {
    if (selectedRate?.people) {
      setSharingCount(selectedRate.people);
    }
  }, [selectedRate]);

  useEffect(() => {
    let isMounted = true;

    const loadSavedTravelers = async () => {
      setIsTravelersLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        setSavedTravelers([]);
        setIsTravelersLoading(false);
        return;
      }

      const [travelersResult, userDetailsResult] = await Promise.all([
        supabase
          .from('traveler_profiles')
          .select('id, label, first_name, last_name, age, date_of_birth')
          .eq('auth_user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: true }),
        supabase.from('user_details').select('phone').eq('auth_user_id', user.id).maybeSingle(),
      ]);

      if (!isMounted) return;

      if (travelersResult.error) {
        console.error('Failed to load saved travelers:', travelersResult.error.message);
        setSavedTravelers([]);
      } else {
        setSavedTravelers((travelersResult.data || []) as SavedTraveler[]);
      }

      if (userDetailsResult.error) {
        console.error('Failed to load user phone:', userDetailsResult.error.message);
      } else {
        const dbPhone = userDetailsResult.data?.phone?.trim() || '';
        if (dbPhone) {
          setBookingMobile((prev) => prev || dbPhone);
        }
      }

      setIsTravelersLoading(false);
    };

    void loadSavedTravelers();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const getTravelerDisplayName = (traveler: SavedTraveler) => {
    const fullName = [traveler.first_name || '', traveler.last_name || ''].join(' ').trim();
    if (fullName) return fullName;
    if (traveler.label?.trim()) return traveler.label.trim();
    return 'Unnamed traveler';
  };

  const getTravelerAge = (traveler: SavedTraveler) => {
    const directAge = traveler.age;
    if (directAge !== null && directAge !== undefined && String(directAge).trim() !== '') {
      return String(directAge);
    }

    const dateOfBirth = traveler.date_of_birth;
    if (!dateOfBirth) return '';
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return '';

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age -= 1;
    }

    if (age < 0) return '';
    return String(age);
  };

  const handleTravelerToggle = (traveler: SavedTraveler, checked: boolean) => {
    if (!checked) {
      const mappedIndex = travelerToGuestIndex[traveler.id];

      if (mappedIndex !== undefined) {
        setGuestForms((prev) =>
          prev.map((form, index) => (index === mappedIndex ? { ...form, name: '', age: '' } : form))
        );

        setGuestFormErrors((prev) =>
          prev.map((error, index) =>
            index === mappedIndex ? { ...error, name: undefined, age: undefined } : error
          )
        );

        setTravelerToGuestIndex((prev) => {
          const next = { ...prev };
          delete next[traveler.id];
          return next;
        });
      }

      setSelectedTravelerIds((prev) => prev.filter((id) => id !== traveler.id));
      return;
    }

    if (selectedTravelerIds.includes(traveler.id)) return;

    const occupiedIndexes = new Set(Object.values(travelerToGuestIndex));
    const travelerName = getTravelerDisplayName(traveler);
    const travelerAge = getTravelerAge(traveler);

    let targetIndex = guestForms.findIndex(
      (form, index) => !occupiedIndexes.has(index) && !form.name.trim() && !form.age.trim()
    );

    let nextForms = [...guestForms];
    if (targetIndex === -1) {
      targetIndex = nextForms.length;
      nextForms.push(createEmptyGuestForm());
    }

    nextForms[targetIndex] = {
      ...nextForms[targetIndex],
      name: travelerName,
      age: travelerAge,
    };

    setGuestForms(nextForms);
    setGuestFormErrors((prev) => {
      const next = [...prev];
      const existing = next[targetIndex] || {};
      next[targetIndex] = { ...existing, name: undefined, age: undefined };
      return next;
    });
    setExpandedGuestIndexes((prev) => (prev.includes(targetIndex) ? prev : [...prev, targetIndex]));
    setSelectedTravelerIds((prev) => [...prev, traveler.id]);
    setTravelerToGuestIndex((prev) => ({ ...prev, [traveler.id]: targetIndex }));
  };

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

    setTravelerToGuestIndex((prev) => {
      const next: Record<string, number> = {};
      const removedTravelerIds: string[] = [];

      Object.entries(prev).forEach(([travelerId, mappedIndex]) => {
        if (mappedIndex === index) {
          removedTravelerIds.push(travelerId);
          return;
        }
        next[travelerId] = mappedIndex > index ? mappedIndex - 1 : mappedIndex;
      });

      if (removedTravelerIds.length > 0) {
        setSelectedTravelerIds((current) =>
          current.filter((travelerId) => !removedTravelerIds.includes(travelerId))
        );
      }

      return next;
    });
  };

  const toggleGuestCard = (index: number) => {
    setExpandedGuestIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleConfirmAndPay = async () => {
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBookingMobileError('Please login to continue with booking.');
      return;
    }

    if (!packageDetails?.id || !slugFromUrl) {
      console.error('Missing package context for booking creation.');
      return;
    }

    let resolvedAgentId = String(agentIdFromUrl || packageDetails.agent_id || '').trim();
    const resolvedAgentName = String(agentNameFromUrl || packageDetails.agent_name || '').trim();

    if (!isUuid(resolvedAgentId) && resolvedAgentName) {
      const { data: agentBySlug } = await supabase
        .from('agents')
        .select('auth_user_id')
        .eq('slug', resolvedAgentName)
        .maybeSingle();

      const candidate = String(agentBySlug?.auth_user_id || '').trim();
      if (isUuid(candidate)) {
        resolvedAgentId = candidate;
      }
    }

    if (!resolvedAgentName || !isUuid(resolvedAgentId)) {
      console.error('Missing agent details for booking creation.');
      return;
    }

    const mappedGuestIndexes = new Set(Object.values(travelerToGuestIndex));

    const guestsToSave = guestForms
      .map((guest, index) => ({ guest, index }))
      .filter(
        ({ guest, index }) =>
          !mappedGuestIndexes.has(index) &&
          guest.save_for_future &&
          guest.name.trim() &&
          guest.age.trim()
      )
      .map(({ guest }) => ({
        name: guest.name.trim(),
        age: Number(guest.age),
      }))
      .filter((guest) => Number.isFinite(guest.age) && guest.age > 0);

    if (guestsToSave.length > 0) {
      const { error: saveTravelersError } = await supabase.from('traveler_profiles').insert(
        guestsToSave.map((guest) => ({
          auth_user_id: user.id,
          label: 'other',
          first_name: guest.name,
          age: guest.age,
        }))
      );

      if (saveTravelersError) {
        console.error('Failed to save travelers for future:', saveTravelersError.message);
      }
    }

    const subtotalAmount =
      Number(activeRate?.value ?? packageDetails?.price_per_person ?? 0) * totalGuests;
    const totalAmount = subtotalAmount + subtotalAmount * 0.05;

    const { data: createdBooking, error: bookingError } = await supabase
      .from('bookings')
      .insert([
        {
          auth_user_id: user.id,
          agent_id: resolvedAgentId,
          agent_name: resolvedAgentName,
          package_id: packageDetails.id,
          slug: slugFromUrl,
          guests: guestForms,
          sharing: sharingCount,
          booking_mobile: bookingMobile.trim(),
          total_amount: totalAmount,
          currency: packageDetails?.currency ?? 'INR',
          status: 'pending',
        },
      ])
      .select('id')
      .single();

    if (bookingError) {
      console.error('Failed to create booking:', bookingError.message);
      return;
    }

    const params = new URLSearchParams();

    if (slugFromUrl) {
      params.set('slug', slugFromUrl);
    }
    if (agentNameFromUrl) {
      params.set('agent_name', agentNameFromUrl);
    }
    if (agentIdFromUrl) {
      params.set('agent_id', agentIdFromUrl);
    } else if (resolvedAgentId) {
      params.set('agent_id', resolvedAgentId);
    }
    params.set('booking_id', String(createdBooking.id));

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
              <span className="text-base font-medium mt-1 block">
                {packageDetails?.title ?? 'Package details'}
              </span>
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
                <span className="text-right text-neutral-900 dark:text-neutral-100">
                  {formattedTravelDates}
                </span>
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
            <span>
              {purchaseDetails.currency} {purchaseDetails.pricePerPerson}
            </span>
          </div>
          <div className="flex justify-between text-neutral-6000 dark:text-neutral-300">
            <span>Subtotal</span>
            <span>
              {purchaseDetails.currency} {purchaseDetails.subtotal}
            </span>
          </div>
          <div className="flex justify-between text-neutral-6000 dark:text-neutral-300">
            <span>GST (5%)</span>
            <span>
              {purchaseDetails.currency} {purchaseDetails.gstAmount}
            </span>
          </div>
          <div className="border-b border-neutral-200 dark:border-neutral-700"></div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>
              {purchaseDetails.currency} {purchaseDetails.total}
            </span>
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
              <ButtonPrimary type="button" onClick={handleAddGuestForm} className="flex-shrink-0">
                <i className="text-xl las la-plus"></i>
                <span className="ml-3">Add Members</span>
              </ButtonPrimary>
            </div>
            <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

            <details className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4">
              <summary className="cursor-pointer font-medium select-none">
                Use saved travelers
              </summary>
              <div className="mt-4 space-y-3">
                {isTravelersLoading ? (
                  <p className="text-sm text-neutral-500">Loading saved travelers...</p>
                ) : savedTravelers.length === 0 ? (
                  <p className="text-sm text-neutral-500">No saved travelers found.</p>
                ) : (
                  savedTravelers.map((traveler) => (
                    <label key={traveler.id} className="flex items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedTravelerIds.includes(traveler.id)}
                        onChange={(e) => handleTravelerToggle(traveler, e.target.checked)}
                      />
                      <span>{getTravelerDisplayName(traveler)}</span>
                    </label>
                  ))
                )}
              </div>
            </details>

            <div className="space-y-5">
              {guestForms.map((form, index) => {
                const hasName = form.name.trim().length > 0;
                const cardTitle = hasName
                  ? `${form.title} ${form.name.trim()}`
                  : `Guest ${index + 1}`;
                const isExpanded = expandedGuestIndexes.includes(index);
                const formError = guestFormErrors[index] ?? {};
                const isFromSavedTraveler = Object.values(travelerToGuestIndex).includes(index);

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
                          aria-label={
                            isExpanded ? 'Collapse guest details' : 'Expand guest details'
                          }
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
                              onChange={(e) =>
                                handleGuestFormChange(index, 'title', e.target.value)
                              }
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
                              onChange={(e) =>
                                handleGuestFormChange(index, 'name', e.currentTarget.value)
                              }
                              className={
                                formError.name
                                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                                  : ''
                              }
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
                              onChange={(e) =>
                                handleGuestFormChange(index, 'age', e.currentTarget.value)
                              }
                              className={
                                formError.age
                                  ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                                  : ''
                              }
                              placeholder="Age"
                            />
                            {formError.age ? (
                              <span className="text-xs text-red-600">{formError.age}</span>
                            ) : null}
                          </div>
                        </div>

                        {isFromSavedTraveler ? (
                          <p className="text-xs text-neutral-500">
                            This traveler is from saved list and will not be saved again.
                          </p>
                        ) : (
                          <label className="inline-flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                            <input
                              type="checkbox"
                              checked={form.save_for_future}
                              onChange={(e) => {
                                const checked = e.currentTarget.checked;
                                setGuestForms((prev) =>
                                  prev.map((guest, i) =>
                                    i === index ? { ...guest, save_for_future: checked } : guest
                                  )
                                );
                              }}
                            />
                            Save for future
                          </label>
                        )}
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
              className={
                bookingMobileError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''
              }
              placeholder="Enter mobile number"
            />
            {bookingMobileError ? (
              <span className="text-xs text-red-600">{bookingMobileError}</span>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label>Messager for author </Label>
            <Textarea placeholder="..." />
            <span className="text-sm text-neutral-500 block">
              Write a few sentences about yourself.
            </span>
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
