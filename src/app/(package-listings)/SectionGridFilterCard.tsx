'use client';
import React, { FC, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import Breadcrumb from '@/components/Breadcrumb';
import TabFilters from './TabFilters';
import ButtonPrimary from '@/shared/ButtonPrimary';
import { supabase } from '@/utils/supabaseClient';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Package } from '@/data/types';
import PackageCard from '@/components/package';
import PropertyCardH from '@/components/PropertyCardH';

export interface SectionGridFilterCardProps {
  className?: string;
}

const PAGE_SIZE = 20;

const SectionGridFilterCard: FC<SectionGridFilterCardProps> = ({ className = '' }) => {
  const searchParams = useSearchParams();
  // Read params and create payload
  // Support multiple locations as comma-separated
  const locationParam = searchParams.get('location') || '';
  const locationList = locationParam ? locationParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
  // Month filter logic
  const monthParam = searchParams.get('month') || '';
  const monthList = monthParam ? monthParam.split(',').map((s) => s.trim()).filter(Boolean) : [];
  // Map month names to numbers (Jan=1, Feb=2, ...)
  const monthNameToNumber: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
    Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12
  };
  const selectedMonthNumbers = monthList.map((m) => monthNameToNumber[m]).filter(Boolean);
  const currentYear = new Date().getFullYear();

  // Price filter
  const priceParam = searchParams.get('price') || '';
  const price = priceParam ? Number(priceParam) : 40000;

  // Hotel distance filters
  const makkahHotelDistanceParam = searchParams.get('makkah_hotel_distance_m');
  const madinahHotelDistanceParam = searchParams.get('madinah_hotel_distance_m');
  const makkahHotelDistance = makkahHotelDistanceParam ? Number(makkahHotelDistanceParam) : undefined;
  const madinahHotelDistance = madinahHotelDistanceParam ? Number(madinahHotelDistanceParam) : undefined;

  // Agent name filter
  const agentNameParam = searchParams.get('agent_name') || '';
  const agentNameList = agentNameParam ? agentNameParam.split(',').map((s) => s.trim()).filter(Boolean) : [];

  const payload = {
    location: locationList,
    datestart: searchParams.get('datestart') || '',
    dateend: searchParams.get('dateend') || '',
    total_duration_days: searchParams.get('total_duration_days') || '',
    months: selectedMonthNumbers,
    year: currentYear,
    price,
    makkahHotelDistance,
    madinahHotelDistance,
    agentNameList,
  };

  const { data, error, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<Package[], Error>({
      queryKey: ['packages', payload],
      queryFn: async ({ pageParam = 0 }) => {
        const page = typeof pageParam === 'number' ? pageParam : 0;
        let query = supabase.from('packages').select('*');
        if (payload.location && payload.location.length > 0) {
          // Use .in for multiple cities, .ilike for single
          if (payload.location.length === 1) {
            query = query.ilike('package_location', `%${payload.location[0]}%`);
          } else {
            query = query.in('package_location', payload.location);
          }
        }
        // Month filter: filter by departure_date in selected months of current year
        if (payload.months && payload.months.length > 0) {
          // Build an array of date ranges for each selected month
          const monthRanges = payload.months.map((monthNum: number) => {
            const start = `${payload.year}-${monthNum.toString().padStart(2, '0')}-01`;
            // Get last day of month
            const endDate = new Date(payload.year, monthNum, 0).getDate();
            const end = `${payload.year}-${monthNum.toString().padStart(2, '0')}-${endDate}`;
            return { start, end };
          });
          // For one or more months, use .or to combine ranges
          const orFilters = monthRanges.map(({ start, end }) => `and(departure_date.gte.${start},departure_date.lte.${end})`);
          query = query.or(orFilters.join(','));
        }
        if (payload.datestart) {
          query = query.gte('departure_date', payload.datestart);
        }
        if (payload.dateend) {
          query = query.lte('arrival_date', payload.dateend);
        }
        if (payload.total_duration_days) {
          query = query.lte('total_duration_days', payload.total_duration_days);
        }
        // Price filter: only show packages with price <= selected price
        if (payload.price) {
          query = query.lte('price_per_person', payload.price);
        }
        // Hotel distance filters (range: less than or equal to selected value)
        if (payload.makkahHotelDistance !== undefined) {
          query = query.lte('makkah_hotel_distance_m', payload.makkahHotelDistance);
        }
        if (payload.madinahHotelDistance !== undefined) {
          query = query.lte('madinah_hotel_distance_m', payload.madinahHotelDistance);
        }
        // Agent name filter
        if (payload.agentNameList && payload.agentNameList.length > 0) {
          if (payload.agentNameList.length === 1) {
            query = query.eq('agent_name', payload.agentNameList[0]);
          } else {
            query = query.in('agent_name', payload.agentNameList);
          }
        }
        // Add more filters here as needed, e.g. .eq, .gt, .lt, .like, .in, etc.
        const { data, error } = await query.range(page, page + PAGE_SIZE - 1);
        if (error) throw error;
        return data as Package[];
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

  const packages = useMemo(
    () => data?.pages.flatMap((page) => page as Package[]) || [],
    [data?.pages]
  );

  return (
    <div className={`nc-SectionGridFilterCard ${className}`} data-nc-id="SectionGridFilterCard">
      <Breadcrumb
        items={[{ label: 'https://www.hajjscanner.com', href: '/' }, { label: 'Packages' }]}
        className="mt-4"
      />
      <div className="mb-4 lg:mb-6 mt-4">
        <TabFilters />
      </div>
      <div className="lg:p-10 lg:bg-neutral-50 lg:dark:bg-black/20 grid grid-cols-1 gap-6 rounded-3xl">
        {error && (
          <div className="flex justify-center items-center py-12 text-red-500">
            Error: {error.message}
          </div>
        )}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <ButtonPrimary loading>Loading Packages</ButtonPrimary>
          </div>
        ) : (
          <>
            {packages.map((item, index) => (
              // <PackageCard key={item.id || index} data={item} />
              <PropertyCardH key={item.id || index} data={item} />
            ))}
            <div ref={loaderRef} className="flex mt-12 justify-center items-center">
              {isFetchingNextPage && <ButtonPrimary loading>Loading more Packages</ButtonPrimary>}
              {!hasNextPage && <span>No more Packages to load.</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SectionGridFilterCard;
