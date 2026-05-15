'use client';
import React, { FC, useRef, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import Breadcrumb from '@/components/Breadcrumb';
import TabFilters from './TabFilters';
import SortByFilter from './SortByFilter';
import RelaxedSearchBanner from './RelaxedSearchBanner';
import ButtonPrimary from '@/shared/ButtonPrimary';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Package } from '@/data/types';
import Packages from './packages';
import {
  fetchPackages,
  fetchPackagesExact,
  fetchPackagesRelaxedOnly,
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

  // Snapshot the URL on first render — this is the URL the server rendered
  // initialData against. Once the user changes any filter, the URL diverges
  // and we must NOT seed initialData into the new queryKey (otherwise React
  // Query treats stale SSR packages as fresh and isLoading flips false,
  // leaving the user staring at the old list while a refetch runs in the
  // background).
  const initialUrlRef = useRef<string | null>(null);
  if (initialUrlRef.current === null) {
    initialUrlRef.current = searchParams.toString();
  }
  const isAtInitialUrl = initialUrlRef.current === searchParams.toString();
  const canUseInitial = !!initialData && !skipRelaxation && isAtInitialUrl;

  // Phase 1: exact-match query. Always runs, hits the DB exactly once for
  // the first page. This is the query that drives the visible UI most of
  // the time — when the user changes filters, this returns in ~100ms and
  // the page repaints immediately. Pagination beyond page 0 also goes
  // through this query (we just re-use the resolved payload).
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<PageResult, Error>({
      queryKey,
      queryFn: async ({ pageParam }) => {
        if (typeof pageParam === 'number' && pageParam === 0) {
          const r = await fetchPackagesExact({
            payload,
            pageSize: PAGE_SIZE,
            sort: sortValue,
          });
          return { packages: r.packages, relaxedFilters: [], effectivePayload: r.effectivePayload };
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
                  // Server-rendered initial banner is for the FIRST paint only;
                  // it's safe to keep here because the relaxation query below
                  // owns the runtime version. If initialData came from the
                  // server's own relaxation pass, we honour it on first paint.
                  relaxedFilters: initialRelaxedFilters ?? [],
                  effectivePayload: initialEffectivePayload ?? payload,
                },
              ],
              pageParams: [0],
            }
          : undefined,
    });

  const exactFirstPage = data?.pages?.[0];
  const exactPackages = exactFirstPage?.packages ?? [];
  const exactEmpty = !isLoading && exactPackages.length === 0;

  // Phase 2: lazy relaxation. Only runs when the exact query has confirmed
  // zero results and the user hasn't asked for exact-only mode. This is
  // the expensive cascade (combinations × ladder steps × fetchPackages) —
  // running it in a separate query means the UI doesn't block on it.
  // The user sees the empty-state for exact instantly and a small "looking
  // for nearby alternatives…" banner while this resolves.
  const { data: relaxedData, isFetching: relaxedFetching } = useQuery<
    {
      packages: Package[];
      relaxedFilters: RelaxedFilter[];
      effectivePayload: PackagesFilterPayload;
    },
    Error
  >({
    queryKey: ['packages', 'relaxed', payload, sortValue],
    queryFn: () =>
      fetchPackagesRelaxedOnly({ payload, pageSize: PAGE_SIZE, sort: sortValue }),
    enabled: exactEmpty && !skipRelaxation,
    staleTime: 30_000,
  });

  // What actually renders: relaxed results when exact was empty AND
  // relaxation found something; otherwise the exact-match list (which may
  // itself be empty → caller renders the "no packages" empty state).
  const useRelaxed = exactEmpty && !skipRelaxation && (relaxedData?.packages.length ?? 0) > 0;
  const relaxedFilters = useRelaxed ? relaxedData!.relaxedFilters : (exactFirstPage?.relaxedFilters ?? []);
  const showRelaxationLoadingBanner =
    exactEmpty && !skipRelaxation && relaxedFetching && !relaxedData;

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

  // Exact-match accumulation across infinite-scroll pages.
  const exactAllPages = useMemo(
    () => data?.pages.flatMap((page) => page.packages) || [],
    [data?.pages]
  );

  // What we actually show: relaxed first-page when exact was empty AND
  // relaxation found something; otherwise the exact list. Pagination only
  // applies to the exact list — relaxed is single-page by design (the user
  // shouldn't infinite-scroll into "even more relaxed" territory without
  // explicit intent).
  const packages = useRelaxed ? relaxedData!.packages : exactAllPages;
  const showEmptyState =
    !isLoading && exactEmpty && !relaxedFetching && (relaxedData?.packages.length ?? 0) === 0;

  return (
    <div className={`nc-SectionGridFilterCard ${className}`} data-nc-id="SectionGridFilterCard">
      <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Packages' }]} />
      <div className="relative z-30 mb-4 lg:mb-6 mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-grow">
          <TabFilters />
        </div>
        <SortByFilter />
      </div>
      {showRelaxationLoadingBanner && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-primary-100 dark:border-primary-900 bg-primary-50/60 dark:bg-primary-900/20 px-4 py-3 text-sm text-primary-800 dark:text-primary-100">
          <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-primary-400 border-t-transparent animate-spin" />
          <span>No exact matches — looking for nearby alternatives…</span>
        </div>
      )}
      {!isLoading && relaxedFilters.length > 0 && packages.length > 0 && (
        <RelaxedSearchBanner
          relaxedFilters={relaxedFilters}
          resultCount={packages.length}
          onShowExactOnly={() => setSkipRelaxation(true)}
        />
      )}
      {showEmptyState && (
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
            {/* Pagination is exact-list only. Relaxed results are a single
                first-page snapshot; the user can broaden filters manually if
                they want more — we don't want to infinite-scroll into looser
                and looser approximations. */}
            {!useRelaxed && packages.length > 0 && (
              <div ref={loaderRef} className="flex mt-12 justify-center items-center">
                {isFetchingNextPage && <ButtonPrimary loading>Loading more Packages</ButtonPrimary>}
                {!hasNextPage && <span>No more Packages to load.</span>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SectionGridFilterCard;
