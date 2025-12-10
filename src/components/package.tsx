"use client";

import { Amenities_demos } from "@/app/(listing-detail)/listing-car-detail/constant";
import Badge from "@/shared/Badge";
import Image from "next/image";
import React, { FC, useState } from "react";
import LikeSaveBtns from "./LikeSaveBtns";
import StartRating from "./StartRating";
import Avatar from "@/shared/Avatar";
import SaleOffBadge from "./SaleOffBadge";
import { Package } from "@/data/types";
import { formatPrice } from "@/utils/formatPrice";

export interface PackageCardProps {
  className?: string;
  data: Package;
}

const PackageCard: FC<PackageCardProps> = ({
  className = "",
  data = {} as Package,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    title,
    price_per_person,
    total_duration_days,
    currency,
    location,
    thumbnail_url,
  } = data as Package;

  // const renderDetailTop = () => {
  //   return (
  //     <div>
  //       <div className="flex flex-col md:flex-row ">
  //         {/* <div className="w-24 md:w-20 lg:w-24 flex-shrink-0 md:pt-7">
  //           <Image
  //             src="https://iqrahajjumrahtours.co.in/wp-content/uploads/2025/04/Screenshot-2025-04-15-105745.png"
  //             className="w-20"
  //             alt=""
  //             sizes="40px"
  //             width={100}
  //             height={100}
  //           />
  //         </div> */}
  //         <div className="flex my-5 md:my-0">
  //           <div className="flex-shrink-0 flex flex-col items-center py-2">
  //             <span className="block w-6 h-6 rounded-full border border-neutral-400"></span>
  //             <span className="block flex-grow border-l border-neutral-400 border-dashed my-1"></span>
  //             <span className="block w-6 h-6 rounded-full border border-neutral-400"></span>
  //           </div>
  //           <div className="ml-4 space-y-10 text-sm">
  //             <div className="flex flex-col space-y-1">
  //               <span className=" text-neutral-500 dark:text-neutral-400">
  //                 Monday, August 12 · 10:00
  <span className="text-xl font-semibold text-secondary-6000">
    {formatPrice(price_per_person)} {currency}
  </span>;
  //             </div>
  //             <div className="flex flex-col space-y-1">
  //               <span className=" text-neutral-500 dark:text-neutral-400">
  //                 Monday, August 16 · 10:00
  //               </span>
  //               <span className=" font-semibold">
  //                 Jeddhah International Airport (JED)
  //               </span>
  //             </div>
  //           </div>
  //         </div>
  //         <div className="border-l border-neutral-200 dark:border-neutral-700 md:mx-6 lg:mx-10"></div>
  //         <ul className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1 md:space-y-2">
  //           <li>Trip time: 7 hours 45 minutes</li>
  //           <li>ANA · Business class · Boeing 787 · NH 847</li>
  //         </ul>
  //       </div>
  //     </div>
  //   );
  // };

  const renderDetail = () => {
    if (!isOpen) return null;
    return (
      <div className="p-4 md:p-8 border border-neutral-200 dark:border-neutral-700 rounded-2xl ">
        {/* {renderDetailTop()}
        <div className="my-7 md:my-10 space-y-5">
          <div className="border-t border-neutral-200 dark:border-neutral-700" />
          <div className="text-neutral-700 dark:text-neutral-300 text-sm md:text-base">
            15 days in Saudi Arabia, visiting Makkah and Madinah.
          </div>
          <div className="border-t border-neutral-200 dark:border-neutral-700" />
        </div>
        {renderDetailTop()}*/}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-y-6 gap-x-10 text-sm text-neutral-700 dark:text-neutral-300 ">
          {Amenities_demos.map((item, index) => (
            <div key={index} className="flex items-center space-x-4 ">
              <div className="w-10 flex-shrink-0">
                <Image src={item.icon} alt="" />
              </div>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSection1 = () => {
    return (
      <div className="listingPackages__wrap  flex-grow">
        {/* 2 */}
        <h1 className="font-medium text-lg">{title}</h1>

        {/* 3 */}
        <div className="flex items-center space-x-4 text-neutral-700 dark:text-neutral-300 -ml-2">
          <span>
            <Badge name="Verified Agent" color="green" />
          </span>
          {/* <span>·</span> */}

          <span className="flex items-center">
            {/* <i className="las la-map-marker-alt"></i> */}
            <i className="las la-calendar-week text-2xl"></i>
            <span className="ml-1 text-sm"> {total_duration_days} Days</span>
          </span>

          {/* <span className="flex items-center">
            <i className="las la-map-marker-alt text-1xl"></i>
            <span className="ml-1 text-sm"> {location}</span>
          </span> */}
          <span className="flex items-center">
            <i className="las la-map-marker-alt text-1xl"></i>
            <span className="ml-1 text-sm"> Madina Hotel (~300m)</span>
          </span>
          <span className="flex items-center">
            <i className="las la-map-marker-alt text-1xl"></i>
            <span className="ml-1 text-sm"> Makkah Hotel (~500m)</span>
          </span>

          <StartRating />
          <div className="flex-[4] items-center whitespace-nowrap sm:text-right">
            <div>
              <span className="text-xl font-semibold text-secondary-6000">
                {currency}
                {formatPrice(price_per_person)}
              </span>
            </div>
            <div className="text-xs sm:text-sm text-neutral-500 font-normal mt-0.5">
              per person
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`nc-FlightCardgroup p-4 sm:p-6 relative bg-white dark:bg-neutral-900 border border-neutral-100
     dark:border-neutral-800 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow space-y-6 ${className}`}
    >
      <div className={` sm:pr-20 relative  ${className}`}>
        {/*  eslint-disable-next-line jsx-a11y/anchor-has-content */}
        <a href="##" className="absolute inset-0" />

        <span
          className={`absolute right-0 bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 w-10 h-10 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center cursor-pointer ${
            isOpen ? "transform -rotate-180" : ""
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          <i className="text-xl las la-angle-down"></i>
        </span>

        <div className="flex  flex-col sm:flex-row sm:items-center space-y-6 sm:space-y-0">
          {/* LOGO IMG */}
          <div className="w-20 lg:w-24 flex-shrink-0">
            <Image
              src={thumbnail_url || "/default-image.png"}
              width={100}
              height={100}
              className="w-20"
              alt="air-logo"
              sizes="40px"
            />
          </div>
          {/* FOR MOBILE RESPONSIVE */}
          <div className="block lg:hidden space-y-1">
            <div className="flex font-semibold">
              <div>
                <span>11:00</span>
                <span className="flex items-center text-sm text-neutral-500 font-normal mt-0.5">
                  HND
                </span>
              </div>
              <span className="w-12 flex justify-center">
                <i className=" text-2xl las la-long-arrow-alt-right"></i>
              </span>
              <div>
                <span>20:00</span>
                <span className="flex items-center text-sm text-neutral-500 font-normal mt-0.5">
                  SIN
                </span>
              </div>
            </div>

            <div className="text-sm text-neutral-500 font-normal mt-0.5">
              <span className="VG3hNb">Nonstop</span>
              <span className="mx-2">·</span>
              <span>7h 45m</span>
              <span className="mx-2">·</span>
              <span>HAN</span>
            </div>
          </div>
          {/* TIME - NAME */}
          {renderSection1()}
        </div>
      </div>

      {/* DETAIL */}
      {renderDetail()}
    </div>
  );
};

export default PackageCard;
