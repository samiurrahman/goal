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

  const apply = useCallback(() => {
    replaceParams((params) => {
      params.set(MAKKAH_KEY, String(makkah));
      params.set(MADINAH_KEY, String(madinah));
    });
  }, [makkah, madinah, replaceParams]);

  const clear = useCallback(() => {
    setMakkah(defaultMax);
    setMadinah(defaultMax);
    replaceParams((params) => {
      params.delete(MAKKAH_KEY);
      params.delete(MADINAH_KEY);
    });
  }, [replaceParams, defaultMax]);

  return { makkah, setMakkah, madinah, setMadinah, apply, clear, isActive };
}
