'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';
import { Package } from '@/data/types';
import Packages from '@/app/packages/components/packages';
import { useFavoriteIds } from '@/hooks/useFavorites';
import ButtonPrimary from '@/shared/ButtonPrimary';

const LOADER_CARD_COUNT = 4;

// Columns mirror what `Packages` reads — keep in sync with src/app/packages/components/packages.tsx.
const PACKAGE_COLUMNS = `
  id, slug, type, title, total_duration_days, makkah_days, madinah_days,
  price_per_person, currency, departure_city, arrival_city, departure_date, arrival_date,
  thumbnail_url, thumbnail_blur, makkah_hotel_name, makkah_hotel_distance_m,
  madinah_hotel_name, madinah_hotel_distance_m, agent_name, agent_known_as,
  agent_profile_image, agent_rating_avg, agent_rating_total, sharing_rate,
  default_pricing, package_location, package_admin1_name, agent_state, agent_country, tags
`;

const FavoritesPage = () => {
  const { data: favoriteIds, isLoading: idsLoading, isFetching: idsFetching } = useFavoriteIds();
  const [packages, setPackages] = useState<Package[]>([]);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);

  const idList = useMemo(() => Array.from(favoriteIds ?? []), [favoriteIds]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      // Wait for the favorites query to settle before deciding the list is empty.
      if (idsLoading) return;

      if (idList.length === 0) {
        if (isMounted) {
          setPackages([]);
          setIsLoadingPackages(false);
        }
        return;
      }

      setIsLoadingPackages(true);

      const { data, error } = await supabase
        .from('packages')
        .select(PACKAGE_COLUMNS)
        .in('id', idList);

      if (!isMounted) return;

      if (error) {
        console.error('Failed to load favorited packages:', error.message);
        setPackages([]);
      } else {
        // Preserve the order from the favorites set (insertion order =
        // newest-added first, since fetchFavoriteIds reads ordered by
        // created_at via the index).
        const positionById = new Map(idList.map((id, idx) => [id, idx]));
        const sorted = ((data as unknown) as Package[]).slice().sort((a, b) => {
          const aPos = positionById.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER;
          const bPos = positionById.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER;
          return aPos - bPos;
        });
        setPackages(sorted);
      }
      setIsLoadingPackages(false);
    };

    void load();

    return () => {
      isMounted = false;
    };
    // We intentionally depend on the JSON-stringified id list so the effect
    // doesn't loop on a freshly-allocated Set with identical contents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idList.join(','), idsLoading]);

  // Re-check that the displayed cards still match the live favorites set —
  // when the user unhearts one from this page, the React Query cache updates
  // optimistically and we drop the card immediately without a refetch.
  const visiblePackages = useMemo(
    () => packages.filter((pkg) => favoriteIds?.has(String(pkg.id))),
    [packages, favoriteIds]
  );

  const showSkeletons = idsLoading || isLoadingPackages || idsFetching;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-semibold">Your favorites</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Packages you&apos;ve saved. Tap the heart again to remove one.
        </p>
      </div>

      {showSkeletons ? (
        <div className="space-y-4">
          {Array.from({ length: LOADER_CARD_COUNT }).map((_, index) => (
            <div
              key={`favorite-skeleton-${index}`}
              className="rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5 animate-pulse"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-72 aspect-[16/10] sm:aspect-auto sm:self-stretch bg-neutral-200 dark:bg-neutral-700 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <div className="h-4 w-1/2 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <div className="h-10 w-32 bg-neutral-200 dark:bg-neutral-700 rounded mt-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : visiblePackages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center mb-4">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-rose-500"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold">No favorites yet</h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Tap the heart on any package to save it for later.
          </p>
          <div className="mt-5">
            <Link href="/packages">
              <ButtonPrimary>Browse packages</ButtonPrimary>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {visiblePackages.map((pkg) => (
            <Packages
              key={pkg.id}
              data={pkg}
              agentProfileImage={pkg.agent_profile_image || undefined}
              agentDisplayName={pkg.agent_known_as || undefined}
              agentSlug={pkg.agent_name || undefined}
              agentRatingPoint={Number(pkg.agent_rating_avg ?? 0)}
              agentReviewCount={Number(pkg.agent_rating_total ?? 0)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FavoritesPage;
