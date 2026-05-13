'use client';

import { useCallback, useEffect, useState } from 'react';
import { useFilterUrlSync } from './useFilterUrlSync';

/**
 * Hook for a single-value numeric filter (e.g. Price, Package Duration)
 * that uses one URL param.
 *
 * `defaultValue` represents "no filter" — equal to it means active=false,
 * and clearing/resetting goes back to it.
 */
export function useSingleValueFilter(paramKey: string, defaultValue: number) {
  const { searchParams, replaceParams } = useFilterUrlSync();
  const urlValue = searchParams.get(paramKey);
  const isActive = !!urlValue;

  const [value, setValue] = useState<number>(() => (urlValue ? Number(urlValue) : defaultValue));

  useEffect(() => {
    setValue(urlValue ? Number(urlValue) : defaultValue);
  }, [urlValue, defaultValue]);

  // See useMultiSelectFilter.mutate — same batching contract.
  const mutate = useCallback(
    (params: URLSearchParams) => {
      params.set(paramKey, String(value));
    },
    [paramKey, value]
  );

  // Same intent as mutate() but for the "no filter applied" case — drop the
  // key entirely so the URL stays clean.
  const mutateClear = useCallback(
    (params: URLSearchParams) => {
      params.delete(paramKey);
    },
    [paramKey]
  );

  const apply = useCallback(() => {
    replaceParams(mutate);
  }, [replaceParams, mutate]);

  const clear = useCallback(() => {
    setValue(defaultValue);
    replaceParams(mutateClear);
  }, [replaceParams, mutateClear, defaultValue]);

  return { value, setValue, apply, mutate, mutateClear, clear, isActive };
}
