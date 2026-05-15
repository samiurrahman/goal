'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFilterUrlSync } from './useFilterUrlSync';
import { rangeId, type NumericRange } from './useMultiRangeFilter';

function parseFirstRange(raw: string | null | undefined): NumericRange | null {
  if (!raw) return null;
  const token = raw.split(',').map((s) => s.trim()).filter(Boolean)[0];
  if (!token) return null;
  const [a, b] = token.split('-');
  const min = Number(a);
  const max = Number(b);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return [min, max] as NumericRange;
}

/**
 * Single-range filter — stores ONE `min-max` token in a single URL param.
 * Replaces the checkbox-style multi-range filter; clicking a pill replaces
 * the current selection rather than appending. Backward-compatible with
 * older multi-bucket URLs (parses the first token only).
 */
export function useSingleRangeFilter(paramKey: string) {
  const { searchParams, replaceParams } = useFilterUrlSync();
  const urlValue = searchParams.get(paramKey);

  const [selected, setSelected] = useState<NumericRange | null>(() => parseFirstRange(urlValue));

  useEffect(() => {
    setSelected(parseFirstRange(urlValue));
  }, [urlValue]);

  const isSelected = useCallback(
    (range: NumericRange) => (selected ? rangeId(selected) === rangeId(range) : false),
    [selected]
  );

  const select = useCallback((range: NumericRange | null) => {
    setSelected(range);
  }, []);

  const mutate = useCallback(
    (params: URLSearchParams) => {
      if (selected) params.set(paramKey, rangeId(selected));
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
    setSelected(null);
    replaceParams(mutateClear);
  }, [replaceParams, mutateClear]);

  return {
    selected,
    setSelected,
    isSelected,
    select,
    apply,
    mutate,
    mutateClear,
    clear,
    isActive: selected !== null,
    count: selected ? 1 : 0,
  };
}
