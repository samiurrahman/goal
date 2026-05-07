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

  const apply = useCallback(() => {
    replaceParams((params) => {
      if (selected.length > 0) params.set(paramKey, selected.join(','));
      else params.delete(paramKey);
    });
  }, [paramKey, replaceParams, selected]);

  const clear = useCallback(() => {
    setSelected([]);
    replaceParams((params) => params.delete(paramKey));
  }, [paramKey, replaceParams]);

  return {
    selected,
    setSelected,
    toggle,
    apply,
    clear,
    isActive: selected.length > 0,
    count: selected.length,
  };
}
