"use client";

import React, { FC, useState } from "react";
import GoogleMapReact from "google-map-react";
import { DEMO_CAR_LISTINGS } from "@/data/listings";
import ButtonClose from "@/shared/ButtonClose";
import Checkbox from "@/shared/Checkbox";
import Pagination from "@/shared/Pagination";
import TabFilters from "./TabFilters";
import Heading2 from "@/shared/Heading2";
import CarCardH from "@/components/CarCardH";
import AnyReactComponent from "@/components/AnyReactComponent/AnyReactComponent";

const DEMO_CARS = DEMO_CAR_LISTINGS.filter((_, i) => i < 12);

export interface SectionGridHasMapProps {}

const SectionGridHasMap: FC<SectionGridHasMapProps> = () => {
  const [currentHoverID, setCurrentHoverID] = useState<string | number>(-1);
  const [showFullMapFixed, setShowFullMapFixed] = useState(false);

  return (
    <div>
      <div className="relative flex min-h-screen">
        {/* CARDSSSS */}
        <div className="min-h-screen w-full flex-shrink-0 px-4 sm:px-6 md:px-8 ">
          <Heading2
            heading="Cars in Tokyo"
            subHeading={
              <span className="block text-neutral-500 dark:text-neutral-400 mt-3">
                233 cars
                <span className="mx-2">·</span>
                Aug 12 - 18
              </span>
            }
          />
          <div className="mb-8 lg:mb-11">
            <TabFilters />
          </div>
          <div className="grid grid-cols-1 gap-8">
            {DEMO_CARS.map((item) => (
              <div
                key={item.id}
                onMouseEnter={() => setCurrentHoverID((_) => item.id)}
                onMouseLeave={() => setCurrentHoverID((_) => -1)}
              >
                <CarCardH data={item} />
              </div>
            ))}
          </div>
          <div className="flex mt-16 justify-center items-center">
            <Pagination />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionGridHasMap;
