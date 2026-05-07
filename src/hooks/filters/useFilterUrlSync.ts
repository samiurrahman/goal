'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Shared helper for committing filter changes to the URL.
 * All filter hooks call this so URL writes flow through one place.
 */
export function useFilterUrlSync() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const replaceParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      const query = params.toString();
      router.replace(window.location.pathname + (query ? `?${query}` : ''));
    },
    [router, searchParams]
  );

  return { searchParams, replaceParams };
}
