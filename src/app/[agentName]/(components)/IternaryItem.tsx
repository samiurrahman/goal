import React from "react";
import Image from "next/image";
import carUtilities8 from "@/images/HIW1.png";

export interface IternaryItemProps {
  fromDate: string;
  fromLocation: string;
  toDate: string;
  toLocation: string;
  tripTime: string;
  flightInfo: string;
  // Optionally allow icon and image as props in future
}

const IternaryItem: React.FC<IternaryItemProps> = ({
  fromDate,
  fromLocation,
  toDate,
  toLocation,
  tripTime,
  flightInfo,
}) => {
  return (
    <div>
      <div className="flex flex-col md:flex-row ">
        <div className="w-24 md:w-20 lg:w-24 flex-shrink-0 md:pt-7">
          <Image
            src={carUtilities8}
            className="w-10"
            alt=""
            sizes="40px"
            width={40}
            height={40}
          />
        </div>
        <div className="flex my-5 md:my-0">
          <div className="flex-shrink-0 flex flex-col items-center py-2">
            <span className="block w-6 h-6 rounded-full border border-neutral-400"></span>
            <span className="block flex-grow border-l border-neutral-400 border-dashed my-1"></span>
            <span className="block w-6 h-6 rounded-full border border-neutral-400"></span>
          </div>
          <div className="ml-4 space-y-10 text-sm">
            <div className="flex flex-col space-y-1">
              <span className=" text-neutral-500 dark:text-neutral-400">
                {fromDate}
              </span>
              <span className=" font-semibold">{fromLocation}</span>
            </div>
            <div className="flex flex-col space-y-1">
              <span className=" text-neutral-500 dark:text-neutral-400">
                {toDate}
              </span>
              <span className=" font-semibold">{toLocation}</span>
            </div>
          </div>
        </div>
        <div className="border-l border-neutral-200 dark:border-neutral-700 md:mx-6 lg:mx-10"></div>
        <ul className="text-sm text-neutral-500 dark:text-neutral-400 space-y-1 md:space-y-2">
          <li>Trip time: {tripTime}</li>
          <li>{flightInfo}</li>
        </ul>
      </div>
    </div>
  );
};

export default IternaryItem;
