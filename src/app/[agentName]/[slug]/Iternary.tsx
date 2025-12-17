import React from "react";
import IternaryItem, { IternaryItemProps } from "./IternaryItem";

export interface IternaryProps {
  data: IternaryItemProps[];
}

const Iternary: React.FC<IternaryProps> = ({ data }) => {
  return (
    <div className="listingSection__wrap">
      <h2 className="text-2xl font-semibold">Iternary</h2>
      <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
      {/* Render each IternaryItem with data */}
      <IternaryItem {...data[0]} />
      <div className="my-7 md:my-10 space-y-5 md:pl-24">
        <div className="border-t border-neutral-200 dark:border-neutral-700" />
        <div className="text-neutral-700 dark:text-neutral-300 text-sm md:text-base">
          Makkah Stay 7 Days
        </div>
        <div className="border-t border-neutral-200 dark:border-neutral-700" />
      </div>
      <IternaryItem {...data[1]} />
      <div className="my-7 md:my-10 space-y-5 md:pl-24">
        <div className="border-t border-neutral-200 dark:border-neutral-700" />
        <div className="text-neutral-700 dark:text-neutral-300 text-sm md:text-base">
          Madina Stay 7 Day
        </div>
        <div className="border-t border-neutral-200 dark:border-neutral-700" />
      </div>
      <IternaryItem {...data[2]} />
    </div>
  );
};

export default Iternary;
