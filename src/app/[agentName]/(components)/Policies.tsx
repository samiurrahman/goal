import React, { FC } from 'react';

interface PoliciesProps {
  cancellation: string;
  checkIn: string;
  checkOut: string;
  notes: string[];
}

const Policies: FC<PoliciesProps> = ({ cancellation, checkIn, checkOut, notes }) => (
  <div className="listingSection__wrap">
    {/* HEADING */}
    <h2 className="text-2xl font-semibold">Things to know</h2>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />

    {/* Cancellation policy */}
    <div>
      <h4 className="text-lg font-semibold">Cancellation policy</h4>
      <span className="block mt-3 text-neutral-500 dark:text-neutral-400">{cancellation}</span>
    </div>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />

    {/* Check-in time */}
    <div>
      <h4 className="text-lg font-semibold">Check-in time</h4>
      <div className="mt-3 text-neutral-500 dark:text-neutral-400 max-w-md text-sm sm:text-base">
        <div className="flex space-x-10 justify-between p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <span>Check-in</span>
          <span>{checkIn}</span>
        </div>
        <div className="flex space-x-10 justify-between p-3">
          <span>Check-out</span>
          <span>{checkOut}</span>
        </div>
      </div>
    </div>
    <div className="w-14 border-b border-neutral-200 dark:border-neutral-700" />

    {/* Special Note */}
    <div>
      <h4 className="text-lg font-semibold">Special Note</h4>
      <div className="prose sm:prose">
        <ul className="mt-3 text-neutral-500 dark:text-neutral-400 space-y-2">
          {notes.map((note, idx) => (
            <li key={idx}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

export default Policies;
