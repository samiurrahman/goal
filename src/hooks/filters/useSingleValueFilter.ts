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

  const apply = useCallback(() => {
    replaceParams((params) => {
      params.set(paramKey, String(value));
    });
  }, [paramKey, replaceParams, value]);

  const clear = useCallback(() => {
    setValue(defaultValue);
    replaceParams((params) => params.delete(paramKey));
  }, [paramKey, replaceParams, defaultValue]);

  return { value, setValue, apply, clear, isActive };
}
