'use client';

import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';
import { useRouter } from 'next/navigation';
import { Amenities_demos } from '../(components)/constant';
import GuestsInput from '../(components)/GuestsInput';
import Breadcrumb from '@/components/Breadcrumb';
import Iternary from '../(components)/Iternary';
import PackageMeta from '../(components)/PackageMeta';
import Policies from '../(components)/Policies';
import HostInformation from '../(components)/HostInformation';
import AmenitiesSection from '../(components)/AmenitiesSection';
import PackageInfo from '../(components)/PackageInfo';
import MobileFooterSticky from '../(components)/MobileFooterSticky';
import NcInputNumber from '@/components/NcInputNumber';
import { GuestsObject } from '@/app/(client-components)/type';
import type { PackageDetails } from '@/data/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';

type RoomRate = { value: string; people: number; default: boolean };

const GUESTS_DEFAULT: GuestsObject = {
  guestAdults: 1,
  guestChildren: 0,
  guestInfants: 0,
};

const HOST_DATA = {
  name: 'Kevin Francis',
  places: 12,
  description:
    'Providing lake views, The Symphony 9 Tam Coc in Ninh Binh provides accommodation, an outdoor swimming pool, a bar, a shared lounge, a garden and barbecue facilities...',
  joined: 'Joined in March 2016',
  responseRate: '100%',
  responseTime: 'Fast response - within a few hours',
};

export interface PackageDetailProps {
  params: { agentName: string; slug: string };
}

const PackageDetail: FC<PackageDetailProps> = ({ params }) => {
  const { agentName, slug } = params;
  // Fetch package details by slug, agent by agentName, join agent and details
  const { data: package_details } = useQuery<PackageDetails | null>({
    queryKey: ['package_details', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('slug', slug)
        .eq('agent_name', agentName)
        .single();

      if (error) throw error;

      // Fetch package_details by package_id
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
  // Parse sharing rates from API data
  const sharingRates = useMemo<RoomRate[]>(() => {
    try {
      const raw = package_details?.sharing_rate;
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return parsed?.json?.rates ?? parsed?.rates ?? [];
    } catch {
      return [];
    }
  }, [package_details?.sharing_rate]);
  const defaultRate = useMemo(
    () => sharingRates.find((rate) => rate.default) ?? sharingRates[0],
    [sharingRates]
  );

  // Room rate selection state
  const [selectedRate, setSelectedRate] = useState<RoomRate | undefined>(undefined);
  const [sharingCount, setSharingCount] = useState<number>(5);

  // Sync selectedRate and sharingCount when API data arrives
  useEffect(() => {
    if (defaultRate) {
      setSelectedRate(defaultRate);
      setSharingCount(defaultRate.people);
    }
  }, [defaultRate]);
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const isLoggedIn = useSupabaseIsLoggedIn();
  const router = useRouter();

  const packageMetaData = useMemo(() => {
    const departureDateText = package_details?.departure_date
      ? new Date(package_details.departure_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'TBD';

    const arrivalDateText = package_details?.arrival_date
      ? new Date(package_details.arrival_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'TBD';

    return {
      title: package_details?.title ?? 'Untitled Package',
      duration: '5 Days, 4 Nights',
      makkahHotel: 'Makkah Hotel (~500m)',
      madinaHotel: 'Madina Hotel (~300m)',
      route: `${package_details?.departure_city?.toUpperCase() ?? ''} - ${package_details?.arrival_city?.toUpperCase() ?? ''}`,
      dates: `${departureDateText} - ${arrivalDateText}`,
      provider: package_details?.agent_name ?? 'Unknown Provider',
      url: agentName,
      providerVerified: true,
      providerLocation: package_details?.package_location ?? 'Unknown Location',
    };
  }, [
    agentName,
    package_details?.agent_name,
    package_details?.arrival_city,
    package_details?.arrival_date,
    package_details?.departure_city,
    package_details?.departure_date,
    package_details?.package_location,
    package_details?.title,
  ]);

  useEffect(() => {
    document.title = `Hajj & Umrah Packages | ${packageMetaData.title}`;
  }, [packageMetaData.title]);

  const hostData = useMemo(() => ({ ...HOST_DATA, profileUrl: agentName }), [agentName]);

  const iternaryData = useMemo(() => {
    const raw = package_details?.details?.iternary;
    if (!raw) return [];
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [package_details?.details?.iternary]);

  const stayInfoData = useMemo(() => {
    const raw = package_details?.details?.stay_information;
    if (!raw) return { title: 'Stay information', details: [] };
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [package_details?.details?.stay_information]);

  const policiesData = useMemo(() => {
    const raw = package_details?.details?.policies;
    if (!raw) return { cancellation: '', checkIn: '', checkOut: '', notes: [] };
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }, [package_details?.details?.policies]);

  const amenitiesData = useMemo(
    () =>
      Amenities_demos.map((item) => ({
        ...item,
        icon: typeof item.icon === 'string' ? item.icon : (item.icon.src ?? ''),
      })),
    []
  );

  const handleGuestsChange = useCallback((_: GuestsObject, totalGuests: number) => {
    setNumberOfGuests(totalGuests);
  }, []);

  const handleSharingChange = useCallback(
    (value: number) => {
      const nextSharingCount = Number(value);
      setSharingCount(nextSharingCount);

      const matchedRate = sharingRates.find((rate) => rate.people === nextSharingCount);
      if (matchedRate) {
        setSelectedRate(matchedRate);
      }
    },
    [sharingRates]
  );

  const handleReserve = useCallback(() => {
    const params = new URLSearchParams();

    if (package_details?.id) {
      params.set('package_id', String(package_details.id));
    }
    params.set('sharing', String(sharingCount));
    params.set('guests', String(numberOfGuests));
    params.set('slug', slug);
    params.set('agent_name', agentName);

    const checkoutUrl = `/checkout?${params.toString()}`;

    if (isLoggedIn) {
      router.push(checkoutUrl);
    } else {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [agentName, isLoggedIn, numberOfGuests, package_details?.id, router, sharingCount, slug]);

  const purchaseSummary = useMemo(() => {
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
        {/* PRICE */}
        <div className="flex justify-between">
          <span className="text-2xl font-normal">
            INR {formattedPrice}
            <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">
              /person
            </span>
          </span>
        </div>

        {/* FORM */}
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

        {/* SUM */}
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

        {/* SUBMIT */}
        <ButtonPrimary onClick={handleReserve}>Reserve</ButtonPrimary>
      </div>
    );
  }, [
    handleGuestsChange,
    handleReserve,
    handleSharingChange,
    numberOfGuests,
    selectedRate,
    sharingCount,
  ]);

  return (
    <div className="nc-ListingStayDetailPage px-2 sm:px-4 md:px-8 max-w-screen-2xl mx-auto w-full min-h-screen">
      <div className="relative z-20 mt-4">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Packages', href: '/packages' },
            { label: slug },
          ]}
        />
      </div>

      {/* MAIN */}
      <main className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-0 w-full">
        {/* CONTENT */}
        <div className="w-full lg:w-3/5 xl:w-2/3 space-y-6 sm:space-y-8 lg:space-y-10 lg:pr-10 mb-6">
          <PackageMeta {...packageMetaData} />
          <Iternary data={iternaryData} />
          <AmenitiesSection amenities={amenitiesData} />
          <PackageInfo data={stayInfoData} />
          <Policies data={policiesData} />
          <HostInformation {...hostData} />
        </div>

        {/* SIDEBAR: Purchase summary, visible on all devices, sticky on lg+ */}
        <div className="w-full lg:w-2/5 xl:w-1/3 mt-8 lg:mt-0 flex-shrink-0 flex flex-col items-stretch">
          <div className="sticky top-28 hidden lg:block max-w-md mx-auto w-full">
            {purchaseSummary}
          </div>
          {/* Mobile/Tablet: show purchase summary below content */}
          <div className="block lg:hidden mb-8 w-full max-w-lg mx-auto">{purchaseSummary}</div>
        </div>
      </main>
      <div className="block lg:hidden h-8" />
      <MobileFooterSticky />
    </div>
  );
};

export default PackageDetail;
