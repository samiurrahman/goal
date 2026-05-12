'use client';
import React, { FC, useRef, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import Breadcrumb from '@/components/Breadcrumb';
import TabFilters from './TabFilters';
import SortByFilter from './SortByFilter';
import RelaxedSearchBanner from './RelaxedSearchBanner';
import ButtonPrimary from '@/shared/ButtonPrimary';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Package } from '@/data/types';
import Packages from './packages';
import {
  fetchPackages,
  fetchPackagesWithRelaxation,
  buildPackagesQueryArgs,
  PackagesFilterPayload,
  RelaxedFilter,
} from '@/lib/queries/packages';

export interface SectionGridFilterCardProps {
  className?: string;
  initialData?: Package[];
  initialRelaxedFilters?: RelaxedFilter[];
  initialEffectivePayload?: PackagesFilterPayload;
}

type PageResult = {
  packages: Package[];
  relaxedFilters: RelaxedFilter[];
  effectivePayload: PackagesFilterPayload;
};

const PAGE_SIZE = 20;
const INITIAL_SKELETON_COUNT = 8;

const SectionGridFilterCard: FC<SectionGridFilterCardProps> = ({
  className = '',
  initialData,
  initialRelaxedFilters,
  initialEffectivePayload,
}) => {
  const searchParams = useSearchParams();

  const { payload, sort: sortValue } = useMemo(
    () => buildPackagesQueryArgs((key) => searchParams.get(key)),
    [searchParams]
  );

  // "Show only exact matches" toggle — when true, we skip the relaxation
  // step entirely and just render the (possibly empty) exact result set.
  const [skipRelaxation, setSkipRelaxation] = useState(false);

  // Reset the "exact only" toggle whenever the user changes filters so the
  // forgiving behavior is the default on each new search.
  useEffect(() => {
    setSkipRelaxation(false);
  }, [searchParams]);

  // Cache key includes skipRelaxation so toggling re-runs the query.
  const queryKey = ['packages', payload, sortValue, skipRelaxation] as const;

  // Only reuse the server-rendered initial data when the client URL matches
  // what the server saw AND the user hasn't toggled exact-only mode. After
  // any filter change or toggle, we drop the initial cache and refetch.
  const canUseInitial =
    !!initialData &&
    !skipRelaxation &&
    // crude check: if there are no relaxed filters in URL terms, this is the
    // same query the server ran. (The server's effective payload only differs
    // from the URL payload if filters were dropped, which is captured in
    // initialRelaxedFilters.length > 0 — both cases are still the server's
    // response to the current URL.)
    true;

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<PageResult, Error>({
      queryKey,
      queryFn: async ({ pageParam }) => {
        // pageParam is either `0` (first call) or
        // `{ page, effectivePayload }` (subsequent calls). For page 0 we run
        // the relaxation flow; for page N>0 we re-use the effective payload
        // determined by page 0 so pagination stays consistent.
        if (typeof pageParam === 'number' && pageParam === 0) {
          const r = await fetchPackagesWithRelaxation({
            payload,
            pageSize: PAGE_SIZE,
            sort: sortValue,
            skipRelaxation,
          });
          return r;
        }
        const { page, effectivePayload } = pageParam as {
          page: number;
          effectivePayload: PackagesFilterPayload;
        };
        const packages = await fetchPackages({
          payload: effectivePayload,
          page,
          pageSize: PAGE_SIZE,
          sort: sortValue,
        });
        // Subsequent pages inherit the page-0 relaxedFilters; we only need
        // them on the first page for banner rendering. Keep an empty array
        // here to avoid duplicating banner state across pages.
        return { packages, relaxedFilters: [], effectivePayload };
      },
      getNextPageParam: (lastPage, allPages) => {
        if (!lastPage || lastPage.packages.length < PAGE_SIZE) return undefined;
        return { page: allPages.length, effectivePayload: lastPage.effectivePayload };
      },
      initialPageParam: 0,
      initialData:
        canUseInitial && initialData
          ? {
              pages: [
                {
                  packages: initialData,
                  relaxedFilters: initialRelaxedFilters ?? [],
                  effectivePayload: initialEffectivePayload ?? payload,
                },
              ],
              pageParams: [0],
            }
          : undefined,
    });

  const firstPage = data?.pages?.[0];
  const relaxedFilters = firstPage?.relaxedFilters ?? [];

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
    () => data?.pages.flatMap((page) => page.packages) || [],
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
      {!isLoading && relaxedFilters.length > 0 && packages.length > 0 && (
        <RelaxedSearchBanner
          relaxedFilters={relaxedFilters}
          resultCount={packages.length}
          onShowExactOnly={() => setSkipRelaxation(true)}
        />
      )}
      {!isLoading && packages.length === 0 && (
        <div className="mb-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-5 py-6 text-center">
          <h3 className="text-base font-semibold">No packages match your search</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Try removing a filter or two — we couldn&apos;t find any packages, even after
            relaxing the most flexible ones.
          </p>
        </div>
      )}
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
