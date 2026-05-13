'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFilterUrlSync } from './useFilterUrlSync';

const MAKKAH_KEY = 'makkah_hotel_distance_m';
const MADINAH_KEY = 'madinah_hotel_distance_m';

/**
 * Hotel distance is a special case — two coupled URL params (Makkah + Madinah).
 */
export function useHotelDistanceFilter(defaultMax = 5000) {
  const { searchParams, replaceParams } = useFilterUrlSync();
  const urlMakkah = searchParams.get(MAKKAH_KEY);
  const urlMadinah = searchParams.get(MADINAH_KEY);
  const isActive = !!urlMakkah || !!urlMadinah;

  const [makkah, setMakkah] = useState<number>(() => (urlMakkah ? Number(urlMakkah) : defaultMax));
  const [madinah, setMadinah] = useState<number>(() =>
    urlMadinah ? Number(urlMadinah) : defaultMax
  );

  useEffect(() => {
    setMakkah(urlMakkah ? Number(urlMakkah) : defaultMax);
    setMadinah(urlMadinah ? Number(urlMadinah) : defaultMax);
  }, [urlMakkah, urlMadinah, defaultMax]);

  // See useMultiSelectFilter.mutate — same batching contract.
  const mutate = useCallback(
    (params: URLSearchParams) => {
      params.set(MAKKAH_KEY, String(makkah));
      params.set(MADINAH_KEY, String(madinah));
    },
    [makkah, madinah]
  );

  const mutateClear = useCallback((params: URLSearchParams) => {
    params.delete(MAKKAH_KEY);
    params.delete(MADINAH_KEY);
  }, []);

  const apply = useCallback(() => {
    replaceParams(mutate);
  }, [replaceParams, mutate]);

  const clear = useCallback(() => {
    setMakkah(defaultMax);
    setMadinah(defaultMax);
    replaceParams(mutateClear);
  }, [replaceParams, mutateClear, defaultMax]);

  return {
    makkah,
    setMakkah,
    madinah,
    setMadinah,
    apply,
    mutate,
    mutateClear,
    clear,
    isActive,
  };
}
