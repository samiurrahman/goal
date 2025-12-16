"use client";
import React, { FC, useState, useRef } from "react";
import LocationInput from "../LocationInput";
import GuestsInput from "../GuestsInput";
import StayDatesRangeInput from "./StayDatesRangeInput";

const StaySearchForm: FC<{}> = ({}) => {
  const [dropOffLocationType, setDropOffLocationType] = useState<
    "Umrah" | "Hajj"
  >("Umrah");
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const dateRangeRef = useRef<HTMLButtonElement>(null);

  const handleLocationSelect = (value: any) => {
    setSelectedLocation(value);
    // Focus the StayDatesRangeInput when location is selected
    if (dateRangeRef.current) {
      dateRangeRef.current.focus();
    }
  };

  const renderRadioBtn = () => {
    return (
      <div className=" py-5 [ nc-hero-field-padding ] flex items-center flex-wrap flex-row border-b border-neutral-100 dark:border-neutral-700">
        <div
          className={`py-1.5 px-4 flex items-center rounded-full font-medium text-xs cursor-pointer mr-2 my-1 sm:mr-3 ${
            dropOffLocationType === "Umrah"
              ? "bg-black text-white shadow-black/10 shadow-lg"
              : "border border-neutral-300 dark:border-neutral-700"
          }`}
          onClick={(e) => setDropOffLocationType("Umrah")}
        >
          Umrah
        </div>
        <div
          className={`py-1.5 px-4 flex items-center rounded-full font-medium text-xs cursor-pointer mr-2 my-1 sm:mr-3 ${
            dropOffLocationType === "Hajj"
              ? "bg-black text-white shadow-black/10 shadow-lg"
              : "border border-neutral-300 dark:border-neutral-700"
          }`}
          onClick={(e) => setDropOffLocationType("Hajj")}
        >
          Hajj
        </div>
      </div>
    );
  };

  const renderForm = () => {
    return (
      <form className="w-full relative rounded-[40px] xl:rounded-[49px] rounded-t-2xl xl:rounded-t-3xl shadow-xl dark:shadow-2xl bg-white dark:bg-neutral-800 ">
        {renderRadioBtn()}
        <div className={`relative flex flex-row`}>
          <LocationInput
            className="flex-[1.5]"
            onLocationSelect={handleLocationSelect}
          />
          <div className="self-center border-r border-slate-200 dark:border-slate-700 h-8"></div>
          <StayDatesRangeInput className="flex-1" />
          <div className="self-center border-r border-slate-200 dark:border-slate-700 h-8"></div>
          <GuestsInput className="flex-1" />
        </div>
      </form>
    );
  };

  return renderForm();
};

export default StaySearchForm;
