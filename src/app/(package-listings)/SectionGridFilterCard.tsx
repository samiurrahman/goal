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
  const payload = {
    location: locationList,
    datestart: searchParams.get('datestart') || '',
    dateend: searchParams.get('dateend') || '',
    total_duration_days: searchParams.get('total_duration_days') || '',
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
        if (payload.datestart) {
          query = query.gte('departure_date', payload.datestart);
        }
        if (payload.dateend) {
          query = query.lte('arrival_date', payload.dateend);
        }
        if (payload.total_duration_days) {
          query = query.eq('total_duration_days', payload.total_duration_days);
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
