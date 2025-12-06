"use client";

import React, { FC } from "react";
import TabFilters from "./TabFilters";
import CarCardH from "@/components/CarCardH";
import { supabase } from "@/utils/supabaseClient";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useRef, useEffect } from "react";
import { CarDataType } from "@/data/types";

export interface SectionGridHasMapProps {}

const PAGE_SIZE = 20;

const SectionGridHasMap: FC<SectionGridHasMapProps> = () => {
  const {
    data,
    error,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<CarDataType[], Error>({
    queryKey: ["packages"],
    queryFn: async ({ pageParam = 0 }) => {
      const page = typeof pageParam === "number" ? pageParam : 0;
      const { data: sample, error } = await supabase
        .from("packages")
        .select("*")
        .range(page, page + PAGE_SIZE - 1);
      if (error) throw error;
      return sample as CarDataType[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
    initialPageParam: 0,
  });

  // Infinite scroll observer
  const loaderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchNextPage();
      }
    });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sampleListings: CarDataType[] =
    data?.pages.flatMap((page) => page as CarDataType[]) || [];

  return (
    <div>
      <div className="relative flex min-h-screen">
        {/* CARDSSSS */}
        <div className="min-h-screen w-full flex-shrink-0 px-4 sm:px-6 md:px-8 ">
          {/* <Heading2
            heading="Cars in Tokyo"
            subHeading={
              <span className="block text-neutral-500 dark:text-neutral-400 mt-3">
                {sampleListings.length} cars
                <span className="mx-2">·</span>
                Aug 12 - 18
              </span>
            }
          /> */}
          <div className="mb-8 lg:mb-11 mt-6">
            <TabFilters />
          </div>
          <div className="grid grid-cols-1 gap-8">
            {sampleListings.map((item) => (
              <CarCardH data={item} key={item.id} />
            ))}
          </div>
          <div
            ref={loaderRef}
            className="flex mt-8 justify-center items-center"
          >
            {isFetchingNextPage && <span>Loading more...</span>}
            {!hasNextPage && <span>No more cars to load.</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SectionGridHasMap;
