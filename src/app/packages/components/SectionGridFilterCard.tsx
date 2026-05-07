'use client';
import React, { FC, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import Breadcrumb from '@/components/Breadcrumb';
import TabFilters from './TabFilters';
import SortByFilter from './SortByFilter';
import ButtonPrimary from '@/shared/ButtonPrimary';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Package } from '@/data/types';
import Packages from './packages';
import { fetchPackages, buildPackagesQueryArgs } from '@/lib/queries/packages';

export interface SectionGridFilterCardProps {
  className?: string;
  initialData?: Package[];
}

const PAGE_SIZE = 20;
const INITIAL_SKELETON_COUNT = 8;

const SectionGridFilterCard: FC<SectionGridFilterCardProps> = ({
  className = '',
  initialData,
}) => {
  const searchParams = useSearchParams();

  const { payload, sort: sortValue } = useMemo(
    () => buildPackagesQueryArgs((key) => searchParams.get(key)),
    [searchParams]
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<Package[], Error>({
      queryKey: ['packages', payload, sortValue],
      queryFn: async ({ pageParam = 0 }) => {
        const page = typeof pageParam === 'number' ? pageParam : 0;
        return fetchPackages({ payload, page, pageSize: PAGE_SIZE, sort: sortValue });
      },
      getNextPageParam: (lastPage, allPages) => {
        if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
        return allPages.length;
      },
      initialPageParam: 0,
      initialData: initialData
        ? { pages: [initialData], pageParams: [0] }
        : undefined,
    });

  // Infinite scroll observer — prefetches before the loader is in view
  const loaderRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    const loaderElement = loaderRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '800px 0px' }
    );
    if (loaderElement) observer.observe(loaderElement);
    return () => {
      if (loaderElement) observer.unobserve(loaderElement);
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const packages = useMemo(
    () => data?.pages.flatMap((page) => page as Package[]) || [],
    [data?.pages]
  );

  return (
    <div className={`nc-SectionGridFilterCard ${className}`} data-nc-id="SectionGridFilterCard">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Packages' }]} className="mt-4" />
      <div className="relative z-30 mb-4 lg:mb-6 mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-grow">
          <TabFilters />
        </div>
        <SortByFilter />
      </div>
      <div className="grid grid-cols-1 gap-6 rounded-3xl">
        {isLoading ? (
          Array.from({ length: INITIAL_SKELETON_COUNT }).map((_, index) => (
            <div
              key={`package-skeleton-${index}`}
              className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700 rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="flex flex-col sm:flex-row animate-pulse">
                <div className="relative w-full aspect-[16/10] sm:aspect-auto sm:w-72 sm:flex-shrink-0 sm:self-stretch bg-neutral-200 dark:bg-neutral-700" />

                <div className="flex flex-grow flex-col gap-3 p-4 sm:p-5 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-5 sm:h-6 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-5 w-12 rounded-full bg-neutral-200 dark:bg-neutral-700 flex-shrink-0" />
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1.5">
                    <div className="h-3 w-16 rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-4 w-28 rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <div className="h-3 w-32 rounded bg-neutral-200 dark:bg-neutral-700" />
                    <div className="h-3 w-36 rounded bg-neutral-200 dark:bg-neutral-700" />
                  </div>

                  <div className="mt-auto pt-3 border-t border-neutral-200 dark:border-neutral-700 flex items-end justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
                        <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-700" />
                      </div>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <div className="h-3 w-10 ml-auto rounded bg-neutral-200 dark:bg-neutral-700" />
                      <div className="h-5 w-28 rounded bg-neutral-200 dark:bg-neutral-700" />
                    </div>
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
                priority={index < 3}
                agentProfileImage={item.agent_profile_image || undefined}
                agentDisplayName={item.agent_known_as || undefined}
                agentSlug={item.agent_name || undefined}
                agentRatingPoint={Number(item.agent_rating_avg ?? 0)}
                agentReviewCount={Number(item.agent_rating_total ?? 0)}
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
