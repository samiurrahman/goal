'use client';
import React, { FC, useRef, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import Breadcrumb from '@/components/Breadcrumb';
import TabFilters from './TabFilters';
import ButtonPrimary from '@/shared/ButtonPrimary';
import { supabase } from '@/utils/supabaseClient';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Package } from '@/data/types';
import Packages from './packages';

export interface SectionGridFilterCardProps {
  className?: string;
}

const PAGE_SIZE = 20;
const INITIAL_SKELETON_COUNT = 8;

const SectionGridFilterCard: FC<SectionGridFilterCardProps> = ({ className = '' }) => {
  const searchParams = useSearchParams();
  // Read params and create payload
  // Support multiple locations as comma-separated
  const locationParam = searchParams.get('location') || '';
  const locationList = locationParam
    ? locationParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  // Month filter logic
  const monthParam = searchParams.get('month') || '';
  const monthList = monthParam
    ? monthParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  // Map month names to numbers (Jan=1, Feb=2, ...)
  const monthNameToNumber: Record<string, number> = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12,
  };
  const selectedMonthNumbers = monthList.map((m) => monthNameToNumber[m]).filter(Boolean);
  const currentYear = new Date().getFullYear();

  // Price filter
  const priceParam = searchParams.get('price') || '';
  const price = priceParam ? Number(priceParam) : '';

  // Hotel distance filters
  const makkahHotelDistanceParam = searchParams.get('makkah_hotel_distance_m');
  const madinahHotelDistanceParam = searchParams.get('madinah_hotel_distance_m');
  const makkahHotelDistance = makkahHotelDistanceParam
    ? Number(makkahHotelDistanceParam)
    : undefined;
  const madinahHotelDistance = madinahHotelDistanceParam
    ? Number(madinahHotelDistanceParam)
    : undefined;

  // Agent name filter
  const agentNameParam = searchParams.get('agent_name') || '';
  const agentNameList = agentNameParam
    ? agentNameParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

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

        const { data, error } = await supabase.functions.invoke('packages', {
          body: {
            payload,
            page,
            pageSize: PAGE_SIZE,
          },
        });

        if (error) throw new Error(error.message || 'Failed to fetch packages');
        return (data?.data ?? []) as Package[];
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
    const loaderElement = loaderRef.current;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchNextPage();
      }
    });
    if (loaderElement) observer.observe(loaderElement);
    return () => {
      if (loaderElement) observer.unobserve(loaderElement);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const packages = useMemo(
    () => data?.pages.flatMap((page) => page as Package[]) || [],
    [data?.pages]
  );

  const [agentMetaBySlug, setAgentMetaBySlug] = useState<
    Record<string, { profileImage?: string; knownAs?: string; slug?: string }>
  >({});

  useEffect(() => {
    const agentSlugs = Array.from(
      new Set(packages.map((item) => item.agent_name).filter(Boolean) as string[])
    );

    if (!agentSlugs.length) {
      setAgentMetaBySlug({});
      return;
    }

    let isCancelled = false;

    const loadAgentImages = async () => {
      const { data: agentsData } = await supabase
        .from('agents')
        .select('slug, known_as, profile_image')
        .in('slug', agentSlugs);

      if (isCancelled) return;

      const nextMap: Record<string, { profileImage?: string; knownAs?: string; slug?: string }> =
        {};
      for (const row of agentsData || []) {
        const slug = (row as { slug?: string | null }).slug;
        const knownAs = (row as { known_as?: string | null }).known_as;
        const profileImage = (row as { profile_image?: string | null }).profile_image;
        if (slug) {
          nextMap[slug] = {
            slug,
            knownAs: knownAs || undefined,
            profileImage: profileImage || undefined,
          };
        }
      }
      setAgentMetaBySlug(nextMap);
    };

    void loadAgentImages();

    return () => {
      isCancelled = true;
    };
  }, [packages]);

  return (
    <div className={`nc-SectionGridFilterCard ${className}`} data-nc-id="SectionGridFilterCard">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Packages' }]} className="mt-4" />
      <div className="mb-4 lg:mb-6 mt-4">
        <TabFilters />
      </div>
      <div className="grid grid-cols-1 gap-6 rounded-3xl">
        {isLoading ? (
          Array.from({ length: INITIAL_SKELETON_COUNT }).map((_, index) => (
            <div
              key={`package-skeleton-${index}`}
              className="lg:px-2 lg:py-1 shadow-sm bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 rounded-3xl overflow-hidden"
            >
              <div className="h-full w-full flex flex-col sm:flex-row sm:items-center animate-pulse">
                <div className="flex-shrink-0 p-3 w-full sm:w-64">
                  <div className="w-full h-44 sm:h-36 rounded-2xl bg-neutral-200 dark:bg-neutral-700" />
                </div>

                <div className="flex-grow p-3 sm:pr-6 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <div className="h-6 w-24 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-6 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-6 w-20 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                  </div>

                  <div className="h-6 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-4 w-full rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="h-5 w-40 rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-6 w-28 rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <>
            {packages.map((item, index) => (
              <Packages
                key={item.id || index}
                data={item}
                agentProfileImage={
                  item.agent_name ? agentMetaBySlug[item.agent_name]?.profileImage : undefined
                }
                agentDisplayName={
                  item.agent_name ? agentMetaBySlug[item.agent_name]?.knownAs : undefined
                }
                agentSlug={item.agent_name ? agentMetaBySlug[item.agent_name]?.slug : undefined}
              />
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
