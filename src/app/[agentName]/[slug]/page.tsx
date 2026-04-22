'use client';

import React, { FC, useState, useEffect } from 'react';
import ButtonPrimary from '@/shared/ButtonPrimary';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';
import { useRouter } from 'next/navigation';
import { Amenities_demos } from '../(components)/constant';
import GuestsInput from '../(components)/GuestsInput';
import Breadcrumb from '@/components/Breadcrumb';
import Iternary from '../(components)/Iternary';
import PackageMeta from '../(components)/PackageMeta';
import RoomRates from '../(components)/RoomRates';
import Policies from '../(components)/Policies';
import HostInformation from '../(components)/HostInformation';
import AmenitiesSection from '../(components)/AmenitiesSection';
import PackageInfo from '../(components)/PackageInfo';
import MobileFooterSticky from '../(components)/MobileFooterSticky';
import NcInputNumber from '@/components/NcInputNumber';
import { GuestsObject } from '@/app/(client-components)/type';
import { Agent } from '@/data/types';
import type { PackageDetails } from '@/data/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/utils/supabaseClient';


export interface PackageDetailProps {
  params: { agentName: string; slug: string };
}

const PackageDetail: FC<PackageDetailProps> = ({ params }) => {
  const { agentName, slug } = params;
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.title = `Hajj & Umrah Packages | ${packageMetaData.title}`;
    }
  }, []);
  // Fetch package details by slug, agent by agentName, join agent and details
  const {
    data: package_details,
    error,
    isLoading,
  } = useQuery<PackageDetails | null>({
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
  type RoomRate = { value: string; people: number; default: boolean };
  const sharingRates: RoomRate[] = React.useMemo(() => {
    try {
      const raw = package_details?.sharing_rate;
      if (!raw) return [];
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return parsed?.json?.rates ?? parsed?.rates ?? [];
    } catch {
      return [];
    }
  }, [package_details?.sharing_rate]);
  const defaultRate = sharingRates.find((r) => r.default) ?? sharingRates[0];

  // Room rate selection state
  const [selectedRate, setSelectedRate] = useState<RoomRate | undefined>(undefined);
  const [sharingCount, setSharingCount] = useState<number>(5);

  // Sync selectedRate and sharingCount when API data arrives
  useEffect(() => {
    if (defaultRate) {
      setSelectedRate(defaultRate);
      setSharingCount(defaultRate.people);
    }
  }, [defaultRate?.value, defaultRate?.people]);
  const [numberOfGuests, setNumberOfGuests] = useState(1);
  const isLoggedIn = useSupabaseIsLoggedIn();
  const router = useRouter();

  // Data for PackageMeta
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

  const packageMetaData = {
    title: package_details?.title ?? 'Untitled Package',
    duration: "5 Days, 4 Nights",
    makkahHotel: "Makkah Hotel (~500m)",
    madinaHotel: "Madina Hotel (~300m)",
    route: `${package_details?.departure_city?.toUpperCase()} - ${package_details?.arrival_city?.toUpperCase()}`,
    dates: `${departureDateText} - ${arrivalDateText}`,
    provider: package_details?.agent_name ?? 'Unknown Provider',
    url: agentName,
    providerVerified: true,
    providerLocation: package_details?.package_location ?? 'Unknown Location',
  };  
  

  const hostData = {
    name: 'Kevin Francis',
    places: 12,
    description:
      'Providing lake views, The Symphony 9 Tam Coc in Ninh Binh provides accommodation, an outdoor swimming pool, a bar, a shared lounge, a garden and barbecue facilities...',
    joined: 'Joined in March 2016',
    responseRate: '100%',
    responseTime: 'Fast response - within a few hours',
    profileUrl: agentName,
  };

  const purchaseSummary = () => {
    // Parse value as number
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
            defaultValue={{ guestAdults: 1, guestChildren: 0, guestInfants: 0 } as GuestsObject}
            onChange={(_, totalGuests) => {
              setNumberOfGuests(totalGuests);
            }}
          />
          <div className="w-full border-b border-neutral-200 dark:border-neutral-700"></div>
          <NcInputNumber 
            label="Sharing" 
            defaultValue={sharingCount} 
            className='p-3' 
            min={2} 
            max={5} 
            onChange={(value) => { 
              const nextSharingCount = Number(value);
              setSharingCount(nextSharingCount);

              const matchedRate = sharingRates.find((rate) => rate.people === nextSharingCount);
              if (matchedRate) {
                setSelectedRate(matchedRate);
              }
            }} />
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
        <ButtonPrimary
          onClick={() => {
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
              // Save current path for redirect after login
              const currentPath = window.location.pathname;
              router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
            }
          }}
        >
          Reserve
        </ButtonPrimary>
      </div>
    );
  };

  return (
    <div className="nc-ListingStayDetailPage px-2 sm:px-4 md:px-8 max-w-screen-2xl mx-auto w-full min-h-screen">
      {/* <p>Package Details: {package_details ? JSON.stringify(package_details) : 'Loading...'}</p> */}
      {/* BANNER IMAGE WITH FADE-OUT */}
      {/* <header className="relative h-48 sm:h-64 md:h-80 lg:h-96 w-full rounded-md sm:rounded-xl overflow-hidden">
        <Image
          src={PHOTOS[0]}
          alt="Banner"
          fill
          className="object-cover w-full h-full"
          priority
          sizes="100vw"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.25) 60%, rgba(255,255,255,1) 100%)',
          }}
        />
      </header> */}

      {/* BREADCRUMB */}
      <div className="relative z-20 mt-4">
        <Breadcrumb
          items={[
            { label: 'https://www.hajjscanner.com', href: '/' },
            { label: 'Packages', href: '/packages' },
            { label: slug },
          ]}
        />
      </div>

      {/* MAIN */}
      <main className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-0 w-full">
        {/* CONTENT */}
        <div className="w-full lg:w-3/5 xl:w-2/3 space-y-6 sm:space-y-8 lg:space-y-10 lg:pr-10 mb-6">
          {/** PackageMeta data extracted to variable */}
          <PackageMeta {...packageMetaData} />  

          <Iternary data={typeof package_details?.details?.iternary === 'string' ? JSON.parse(package_details.details.iternary) : (package_details?.details?.iternary ?? [])} />

          {/* <RoomRates
            rates={roomRates}
            selectedRate={selectedRate}
            onSelect={(rate) =>
              setSelectedRate({
                ...rate,
                highlight: rate.highlight ?? false,
                icon: (props: React.SVGProps<SVGSVGElement>) => {
                  const Icon = rate.icon;
                  return Icon ? <Icon {...props} /> : <></>;
                },
              })
            }
          /> */}
          <AmenitiesSection
            amenities={Amenities_demos.map((item) => ({
              ...item,
              icon: typeof item.icon === 'string' ? item.icon : (item.icon.src ?? ''),
            }))}
          />

          <PackageInfo data={typeof package_details?.details?.stay_information === 'string' ? JSON.parse(package_details.details.stay_information) : {title: 'Stay information', details: []}} />

          
          <Policies data={typeof package_details?.details?.policies === 'string' ? JSON.parse(package_details.details.policies) : {cancellation: '', checkIn: '', checkOut: '', notes: []}} />

          {/* <LocationSection {...locationData} /> */}

          <HostInformation {...hostData} />

        </div>

        {/* SIDEBAR: Purchase summary, visible on all devices, sticky on lg+ */}
        <div className="w-full lg:w-2/5 xl:w-1/3 mt-8 lg:mt-0 flex-shrink-0 flex flex-col items-stretch">
          <div className="sticky top-28 hidden lg:block max-w-md mx-auto w-full">{purchaseSummary()}</div>
          {/* Mobile/Tablet: show purchase summary below content */}
          <div className="block lg:hidden mb-8 w-full max-w-lg mx-auto">{purchaseSummary()}</div>
        </div>
      </main>
      <div className="block lg:hidden h-8" />
      <MobileFooterSticky />
    </div>
  );
};

export default PackageDetail;
