'use client';

import { useEffect, useState, useCallback } from 'react';
import { useFilterUrlSync } from './useFilterUrlSync';

/**
 * Generic hook for multi-select filters that store a CSV in a URL param.
 * Used by Location, Agent, Month, etc.
 */
export function useMultiSelectFilter(paramKey: string) {
  const { searchParams, replaceParams } = useFilterUrlSync();
  const urlValue = searchParams.get(paramKey);

  const [selected, setSelected] = useState<string[]>(() =>
    urlValue ? urlValue.split(',').filter(Boolean) : []
  );

  // Re-sync when the URL changes externally (e.g. browser back, programmatic nav)
  useEffect(() => {
    setSelected(urlValue ? urlValue.split(',').filter(Boolean) : []);
  }, [urlValue]);

  const toggle = useCallback((checked: boolean, name: string) => {
    setSelected((prev) =>
      checked ? (prev.includes(name) ? prev : [...prev, name]) : prev.filter((i) => i !== name)
    );
  }, []);

  // Writes the current staged state to a URLSearchParams instance without
  // touching the router. Use this to batch multiple filter commits into a
  // single router.replace call (the mobile "Apply filters" button calls
  // every filter's mutate inside one replaceParams) — otherwise each
  // sequential .apply() races on a stale searchParams snapshot and all but
  // the last write get silently dropped.
  const mutate = useCallback(
    (params: URLSearchParams) => {
      if (selected.length > 0) params.set(paramKey, selected.join(','));
      else params.delete(paramKey);
    },
    [paramKey, selected]
  );

  const apply = useCallback(() => {
    replaceParams(mutate);
  }, [replaceParams, mutate]);

  const clear = useCallback(() => {
    setSelected([]);
    replaceParams((params) => params.delete(paramKey));
  }, [paramKey, replaceParams]);

  return {
    selected,
    setSelected,
    toggle,
    apply,
    mutate,
    clear,
    isActive: selected.length > 0,
    count: selected.length,
  };
}
