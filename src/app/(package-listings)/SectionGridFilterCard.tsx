"use client";
import React, { FC, useRef, useEffect } from "react";
import TabFilters from "./TabFilters";
import FlightCard, { FlightCardProps } from "@/components/FlightCard";
import ButtonPrimary from "@/shared/ButtonPrimary";
import { supabase } from "@/utils/supabaseClient";
import { useInfiniteQuery } from "@tanstack/react-query";

export interface SectionGridFilterCardProps {
  className?: string;
}

const PAGE_SIZE = 20;

const SectionGridFilterCard: FC<SectionGridFilterCardProps> = ({
  className = "",
}) => {
  const {
    data,
    error,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<FlightCardProps["data"][], Error>({
    queryKey: ["flights"],
    queryFn: async ({ pageParam = 0 }) => {
      const page = typeof pageParam === "number" ? pageParam : 0;
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .range(page, page + PAGE_SIZE - 1);
      if (error) throw error;
      return data as FlightCardProps["data"][];
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

  const flightListings: FlightCardProps["data"][] =
    data?.pages.flatMap((page) => page as FlightCardProps["data"][]) || [];

  return (
    <div
      className={`nc-SectionGridFilterCard ${className}`}
      data-nc-id="SectionGridFilterCard"
    >
      <div className="mb-4 lg:mb-6 mt-6">
        <TabFilters />
      </div>
      <div className="lg:p-10 lg:bg-neutral-50 lg:dark:bg-black/20 grid grid-cols-1 gap-6  rounded-3xl">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <ButtonPrimary loading>Loading Packages</ButtonPrimary>
          </div>
        ) : (
          <>
            {flightListings.map((item, index) => (
              <FlightCard key={item.id || index} data={item} />
            ))}
            <div
              ref={loaderRef}
              className="flex mt-12 justify-center items-center"
            >
              {isFetchingNextPage && (
                <ButtonPrimary loading>Loading more Packages</ButtonPrimary>
              )}
              {!hasNextPage && <span>No more flights to load.</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SectionGridFilterCard;
