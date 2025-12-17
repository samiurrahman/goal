"use client";

import React, { FC, useState } from "react";
import ButtonPrimary from "@/shared/ButtonPrimary";
import Image from "next/image";
import { Amenities_demos, PHOTOS } from "./(components)/constant";
import { roomRates } from "./(components)/constant";
import StayDatesRangeInput from "./(components)/StayDatesRangeInput";
import GuestsInput from "./(components)/GuestsInput";
import Breadcrumb from "@/components/Breadcrumb";
import Iternary from "./(components)/Iternary";
import PackageMeta from "./(components)/PackageMeta";
import RoomRates from "./(components)/RoomRates";
import Policies from "./(components)/Policies";
import AmenitiesSection from "./(components)/AmenitiesSection";
import PackageInfo from "./(components)/PackageInfo";
// import LocationSection from "./LocationSection";

export interface AgentDetailsProps {
  params: { agentName: string };
}

const AgentDetails: FC<AgentDetailsProps> = ({ params }) => {
  const { agentName } = params;
  console.log(agentName);

  // Room rate selection state
  const [selectedRate, setSelectedRate] = useState(roomRates[0]);

  // Dummy data for policies
  const policiesData = {
    cancellation:
      "Refund 50% of the booking value when customers cancel the room within 48 hours after successful booking and 14 days before the check-in time. Then, cancel the room 14 days before the check-in time, get a 50% refund of the total amount paid (minus the service fee).",
    checkIn: "08:00 am - 12:00 am",
    checkOut: "02:00 pm - 04:00 pm",
    notes: [
      "Ban and I will work together to keep the landscape and environment green and clean by not littering, not using stimulants and respecting people around.",
      "Do not sing karaoke past 11:30",
    ],
  };
  // Dummy data for demonstration
  const iternaryData = [
    {
      fromDate: "Monday, August 12 · 10:00",
      fromLocation: "Tokyo International Airport (HND)",
      toDate: "Monday, August 16 · 10:00",
      toLocation: "Singapore International Airport (SIN)",
      tripTime: "7 hours 45 minutes",
      flightInfo: "ANA · Business class · Boeing 787 · NH 847",
    },
    {
      fromDate: "Tuesday, August 17 · 09:00",
      fromLocation: "Singapore International Airport (SIN)",
      toDate: "Tuesday, August 17 · 15:00",
      toLocation: "Jeddah International Airport (JED)",
      tripTime: "8 hours 00 minutes",
      flightInfo: "Emirates · Economy class · Boeing 777 · EK 123",
    },
    {
      fromDate: "Wednesday, August 18 · 08:00",
      fromLocation: "Jeddah International Airport (JED)",
      toDate: "Wednesday, August 18 · 12:00",
      toLocation: "Makkah Hotel",
      tripTime: "4 hours 00 minutes",
      flightInfo: "Private Transfer",
    },
  ];
  const packageInfoData = {
    title: "Stay information",
    details: [
      "Providing lake views, The Symphony 9 Tam Coc in Ninh Binh provides accommodation, an outdoor swimming pool, a bar, a shared lounge, a garden and barbecue facilities. Complimentary WiFi is provided.",
      "There is a private bathroom with bidet in all units, along with a hairdryer and free toiletries.",
      "The Symphony 9 Tam Coc offers a terrace. Both a bicycle rental service and a car rental service are available at the accommodation, while cycling can be enjoyed nearby.",
    ],
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
    const formattedPrice = pricePerPerson.toLocaleString("en-IN");
    const formattedTotal = total.toLocaleString("en-IN");
    const formattedGst = gstAmount.toLocaleString("en-IN");
    const formattedGrandTotal = grandTotal.toLocaleString("en-IN");
    return (
      <div className="listingSectionSidebar__wrap shadow-xl">
        {/* PRICE */}
        <div className="flex justify-between">
          <span className="text-3xl font-semibold">
            INR {formattedPrice}
            <span className="ml-1 text-base font-normal text-neutral-500 dark:text-neutral-400">
              / person x {numberOfGuests} guests
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
              INR {formattedPrice} x {numberOfGuests} guests
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
        <ButtonPrimary href={"/checkout"}>Reserve</ButtonPrimary>
      </div>
    );
  };

  return (
    <div className="nc-ListingStayDetailPage">
      {/* BANNER IMAGE WITH FADE-OUT */}
      <header className="relative h-64 sm:h-80 md:h-96 w-full rounded-md sm:rounded-xl overflow-hidden">
        <Image
          src={PHOTOS[0]}
          alt="Banner"
          fill
          className="object-cover w-full h-full"
          priority
          sizes="100vw"
        />
        {/* Fade-out gradient at the bottom */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.25) 60%, rgba(255,255,255,1) 100%)",
          }}
        />
      </header>

      {/* BREADCRUMB */}
      <div className="relative z-20 mt-4">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: agentName, href: `/packages/${agentName}` },
          ]}
        />
      </div>

      {/* MAIN */}
      <main className="relative z-10  flex flex-col lg:flex-row ">
        {/* CONTENT */}
        <div className="w-full lg:w-3/5 xl:w-2/3 space-y-8 lg:space-y-10 lg:pr-10">
          <PackageMeta
            title="Luxury umrah package from Mumbai to Mumbai"
            duration="5 Days, 4 Nights"
            makkahHotel="Makkah Hotel (~500m)"
            madinaHotel="Madina Hotel (~300m)"
            route="Mumbai to Mumbai"
            provider="Iqra Hajj Tours"
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
              icon:
                typeof item.icon === "string" ? item.icon : item.icon.src ?? "",
            }))}
          />
          <Policies {...policiesData} />
          {/* <LocationSection {...locationData} /> */}
        </div>

        <div className="hidden lg:block flex-grow mt-14 lg:mt-0">
          <div className="sticky top-28">{purchaseSummary()}</div>
        </div>
      </main>
    </div>
  );
};

export default AgentDetails;
