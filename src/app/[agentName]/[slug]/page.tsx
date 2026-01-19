'use client';

import React, { FC, useState } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import CommentListing from '@/components/CommentListing';
import FiveStartIconForRate from '@/components/FiveStartIconForRate';
import ButtonCircle from '@/shared/ButtonCircle';
import ButtonPrimary from '@/shared/ButtonPrimary';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';
import { useRouter } from 'next/navigation';
import ButtonSecondary from '@/shared/ButtonSecondary';
import Input from '@/shared/Input';
import Image from 'next/image';
import { Amenities_demos, PHOTOS } from '../(components)/constant';
import { roomRates } from '../(components)/constant';
import StayDatesRangeInput from '../(components)/StayDatesRangeInput';
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
// import LocationSection from "./LocationSection";

export interface PackageDetailProps {
  params: { agentName: string; slug: string };
}

const PackageDetail: FC<PackageDetailProps> = ({ params }) => {
  const { agentName, slug } = params;
  // Room rate selection state
  const [selectedRate, setSelectedRate] = useState(roomRates[0]);
  const isLoggedIn = useSupabaseIsLoggedIn();
  const router = useRouter();

  // Dummy data for policies
  const policiesData = {
    cancellation:
      'Refund 50% of the booking value when customers cancel the room within 48 hours after successful booking and 14 days before the check-in time. Then, cancel the room 14 days before the check-in time, get a 50% refund of the total amount paid (minus the service fee).',
    checkIn: '08:00 am - 12:00 am',
    checkOut: '02:00 pm - 04:00 pm',
    notes: [
      'Ban and I will work together to keep the landscape and environment green and clean by not littering, not using stimulants and respecting people around.',
      'Do not sing karaoke past 11:30',
    ],
  };
  // Dummy data for demonstration
  const iternaryData = [
    {
      fromDate: 'Monday, August 12 · 10:00',
      fromLocation: 'Tokyo International Airport (HND)',
      toDate: 'Monday, August 16 · 10:00',
      toLocation: 'Singapore International Airport (SIN)',
      tripTime: '7 hours 45 minutes',
      flightInfo: 'ANA · Business class · Boeing 787 · NH 847',
    },
    {
      fromDate: 'Tuesday, August 17 · 09:00',
      fromLocation: 'Singapore International Airport (SIN)',
      toDate: 'Tuesday, August 17 · 15:00',
      toLocation: 'Jeddah International Airport (JED)',
      tripTime: '8 hours 00 minutes',
      flightInfo: 'Emirates · Economy class · Boeing 777 · EK 123',
    },
    {
      fromDate: 'Wednesday, August 18 · 08:00',
      fromLocation: 'Jeddah International Airport (JED)',
      toDate: 'Wednesday, August 18 · 12:00',
      toLocation: 'Makkah Hotel',
      tripTime: '4 hours 00 minutes',
      flightInfo: 'Private Transfer',
    },
  ];
  const packageInfoData = {
    title: 'Stay information',
    details: [
      'Providing lake views, The Symphony 9 Tam Coc in Ninh Binh provides accommodation, an outdoor swimming pool, a bar, a shared lounge, a garden and barbecue facilities. Complimentary WiFi is provided.≠',
      'There is a private bathroom with bidet in all units, along with a hairdryer and free toiletries.',
      'The Symphony 9 Tam Coc offers a terrace. Both a bicycle rental service and a car rental service are available at the accommodation, while cycling can be enjoyed nearby.',
    ],
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
  // Dummy data for location
  // const locationData = {
  //   title: "Location",
  //   address: "San Diego, CA, United States of America (SAN-San Diego Intl.)",
  //   mapSrc:
  //     "https://www.google.com/maps/embed/v1/place?key=AIzaSyAGVJfZMAKYfZ71nzL_v5i3LjTTWnCYwTY&q=Eiffel+Tower,Paris+France",
  // };

  const purchaseSummary = () => {
    // Parse value as number
    const pricePerPerson = Number(selectedRate.value);
    // number of guests from API (hardcoded for now)
    const numberOfGuests = 4;
    const total = pricePerPerson * numberOfGuests;
    const gstRate = 0.05;
    const gstAmount = total * gstRate;
    const grandTotal = total + gstAmount;
    const formattedPrice = pricePerPerson.toLocaleString('en-IN');
    const formattedTotal = total.toLocaleString('en-IN');
    const formattedGst = gstAmount.toLocaleString('en-IN');
    const formattedGrandTotal = grandTotal.toLocaleString('en-IN');
    return (
      <div className="listingSectionSidebar__wrap shadow-xl">
        {/* PRICE */}
        <div className="flex justify-between">
          <span className="text-3xl font-semibold">
            INR {formattedPrice}
            <span className="text-base font-normal text-neutral-500 dark:text-neutral-400">
              /person
            </span>
          </span>
        </div>

        {/* FORM */}
        <form className="flex flex-col border border-neutral-200 dark:border-neutral-700 rounded-3xl ">
          <StayDatesRangeInput className="flex-1 z-[11]" />
          <div className="w-full border-b border-neutral-200 dark:border-neutral-700"></div>
          <GuestsInput className="flex-1" />
        </form>

        {/* SUM */}
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between text-neutral-6000 dark:text-neutral-300">
            <span>
              No of Guest ({numberOfGuests} x INR {formattedPrice})
            </span>
            <span>INR {formattedTotal}</span>
          </div>
          <div className="flex justify-between text-neutral-6000 dark:text-neutral-300">
            <span>GST (5%)</span>
            <span>INR {formattedGst}</span>
          </div>
          
          <div className="border-b border-neutral-200 dark:border-neutral-700"></div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>INR {formattedGrandTotal}</span>
          </div>
        </div>

        {/* SUBMIT */}
        <ButtonPrimary
          onClick={() => {
            if (isLoggedIn) {
              router.push('/checkout');
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
        <div className="w-full lg:w-3/5 xl:w-2/3 space-y-6 sm:space-y-8 lg:space-y-10 lg:pr-10">
          <PackageMeta
            title="Luxury umrah package from Mumbai to Mumbai"
            duration="5 Days, 4 Nights"
            makkahHotel="Makkah Hotel (~500m)"
            madinaHotel="Madina Hotel (~300m)"
            route="Mumbai to Mumbai"
            provider="Iqra Hajj Tours"
            url={agentName}
            providerVerified={true}
            providerLocation="Akola, Maharashtra"
          />

          <Iternary data={iternaryData} />

          <RoomRates
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
          />

          <PackageInfo {...packageInfoData} />

          <AmenitiesSection
            amenities={Amenities_demos.map((item) => ({
              ...item,
              icon: typeof item.icon === 'string' ? item.icon : (item.icon.src ?? ''),
            }))}
          />
          <Policies {...policiesData} />
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
