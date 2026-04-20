import React, { FC } from 'react';

interface PoliciesProps {
  data: {
    cancellation: string;
    checkIn: string;
    checkOut: string;
    notes: string[];
  }
}

const Policies: FC<PoliciesProps> = ({ data }) => (
  <div className="listingSection__wrap !space-y-4">
    {/* HEADING */}
    <h2 className="text-xl font-normal text-gray-900">Things to know</h2>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />

    {/* Cancellation policy */}
    <div>
      <h4 className="text-md font-extralight">Cancellation policy</h4>
      <span className="block mt-3 text-neutral-500 dark:text-neutral-400 text-sm">{data.cancellation}</span>
    </div>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />

    {/* Check-in time */}
    <div>
      <h4 className="text-md font-extralight">Check-in time</h4>
      <div className="mt-3 text-neutral-500 dark:text-neutral-400 max-w-md text-sm sm:text-base">
        <div className="flex space-x-10 justify-between p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm">
          <span>Check-in</span>
          <span>{data.checkIn}</span>
        </div>
        <div className="flex space-x-10 justify-between p-3 text-sm">
          <span>Check-out</span>
          <span>{data.checkOut}</span>
        </div>
      </div>    
    </div>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />

    {/* Special Note */}
    <div>
      <h4 className="text-lg font-extralight">Special Note</h4>
      <div className="prose sm:prose ">
        <ul className="mt-3 text-neutral-500 dark:text-neutral-400 space-y-2 text-sm">
          {data.notes.map((note, idx) => (
            <li key={idx}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

export default Policies;
