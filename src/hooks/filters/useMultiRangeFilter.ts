'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFilterUrlSync } from './useFilterUrlSync';

export type NumericRange = readonly [number, number];

export function rangeId(range: NumericRange): string {
  return `${range[0]}-${range[1]}`;
}

export function parseRangeIds(raw: string | null | undefined): NumericRange[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const [a, b] = token.split('-');
      const min = Number(a);
      const max = Number(b);
      if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
      return [min, max] as NumericRange;
    })
    .filter((r): r is NumericRange => r !== null);
}

export function serializeRanges(ranges: NumericRange[]): string {
  return ranges.map(rangeId).join(',');
}

/**
 * Multi-range filter — stores a CSV of `min-max` tokens in a single URL param.
 * Used by checkbox-style range filters (duration, price, hotel distance).
 */
export function useMultiRangeFilter(paramKey: string) {
  const { searchParams, replaceParams } = useFilterUrlSync();
  const urlValue = searchParams.get(paramKey);

  const [selected, setSelected] = useState<NumericRange[]>(() => parseRangeIds(urlValue));

  useEffect(() => {
    setSelected(parseRangeIds(urlValue));
  }, [urlValue]);

  const selectedIds = useMemo(() => new Set(selected.map(rangeId)), [selected]);

  const toggle = useCallback((checked: boolean, range: NumericRange) => {
    setSelected((prev) => {
      const id = rangeId(range);
      const has = prev.some((r) => rangeId(r) === id);
      if (checked) return has ? prev : [...prev, range];
      return prev.filter((r) => rangeId(r) !== id);
    });
  }, []);

  const mutate = useCallback(
    (params: URLSearchParams) => {
      if (selected.length > 0) params.set(paramKey, serializeRanges(selected));
      else params.delete(paramKey);
    },
    [paramKey, selected]
  );

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
    setSelected([]);
    replaceParams(mutateClear);
  }, [replaceParams, mutateClear]);

  const isSelected = useCallback(
    (range: NumericRange) => selectedIds.has(rangeId(range)),
    [selectedIds]
  );

  return {
    selected,
    setSelected,
    isSelected,
    toggle,
    apply,
    mutate,
    mutateClear,
    clear,
    isActive: selected.length > 0,
    count: selected.length,
  };
}
