"use client";

import { MapPinIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import React, { useState, useEffect, useRef, FC } from "react";
import { useCities } from "@/hooks/useCities";

interface Props {
  onClick?: () => void;
  onChange?: (value: string) => void;
  className?: string;
  defaultValue?: string;
  headingText?: string;
}

const LocationInput: FC<Props> = ({
  onChange = () => {},
  className = "",
  defaultValue = "United States",
  headingText = "Where to?",
}) => {
  const [value, setValue] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const { data: cities, error, isLoading } = useCities();

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const handleSelectLocation = (item: string) => {
    // DO NOT REMOVE SETTIMEOUT FUNC
    setTimeout(() => {
      setValue(item);
      onChange && onChange(item);
    }, 0);
  };

  // Render filtered cities based on input value
  const renderSearchValues = ({ heading }: { heading: string }) => {
    // Filter cities based on input value
    const filteredCities = value
      ? cities?.filter((item: any) =>
          (item.name + (item.state ? ", " + item.state : ""))
            .toLowerCase()
            .includes(value.toLowerCase())
        )
      : cities;
    return (
      <>
        <p className="block font-semibold text-base">
          {heading || "Destinations"}
        </p>
        <div className="mt-3" style={{ maxHeight: "30vh", overflowY: "auto" }}>
          {filteredCities?.map((item: any) => (
            <div
              className="py-2 mb-1 flex items-center space-x-3 text-sm"
              onClick={() =>
                handleSelectLocation(
                  item.name + (item.state ? ", " + item.state : "")
                )
              }
              key={item.id}
            >
              <MapPinIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              <span className="">
                {item.name}
                {item.state ? ", " + item.state : ""}
              </span>
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className={`${className}`} ref={containerRef}>
      <div className="p-5">
        <span className="block font-semibold text-xl sm:text-2xl">
          {headingText}
        </span>
        <div className="relative mt-5">
          <input
            className={`block w-full bg-transparent border px-4 py-3 pr-12 border-neutral-900 dark:border-neutral-200 rounded-xl focus:ring-0 focus:outline-none text-base leading-none placeholder-neutral-500 dark:placeholder-neutral-300 truncate font-bold placeholder:truncate`}
            placeholder={"Search location"}
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            ref={inputRef}
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <MagnifyingGlassIcon className="w-5 h-5 text-neutral-700 dark:text-neutral-400" />
          </span>
        </div>
        <div className="mt-7">
          {renderSearchValues({
            heading: value ? "Locations" : "Popular destinations",
          })}
        </div>
      </div>
    </div>
  );
};

export default LocationInput;
