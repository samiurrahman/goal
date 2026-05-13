import { useState, useCallback, useMemo, useRef } from 'react';

// CityItem is the historical shape the hero search forms were written
// against. Adding `slug` so callers that build URLs can use the structured
// ?city= form (skips an extra RPC round-trip on the listing page).
export type CityItem = {
  id: number | string;
  name: string;
  state?: string;
  slug?: string;
};

export function formatCityLabel(city: CityItem): string {
  return city.name + (city.state ? ', ' + city.state : '');
}

export function buildPackagesUrl(
  location: string,
  months: string[],
  slug?: string
): string {
  const params = new URLSearchParams();
  // Prefer the slug-based URL when available — the listing page reads
  // ?city= directly and skips resolvePackagesPayload (an extra RPC).
  if (slug) params.append('city', slug);
  else if (location) params.append('location', location);
  const filtered = months.filter((m) => m !== 'Any');
  if (filtered.length > 0) params.append('month', filtered.join(','));
  return params.toString() ? `/packages?${params.toString()}` : '/packages';
}

/**
 * State for the home page hero search forms.
 *
 * Used to bundle a city catalog from useCities() and do in-memory filtering;
 * that loaded ~10K rows on every hero render. The catalog is gone now — each
 * hero component owns its own query string and hits the cities API directly
 * via useCitySearch. This hook just tracks the committed pick and the months,
 * and builds the resulting /packages URL.
 */
export function usePackageSearch() {
  const [selectedLocation, setSelectedLocation] = useState<CityItem | null>(null);
  const [monthStates, setMonthStates] = useState<string[]>([]);
  const userInteractedRef = useRef(false);

  // Display value for the location field — either the committed pick's
  // label or empty. Heroes that want a free-text fallback (rare) can read
  // back their own query state.
  const locationValue = useMemo(
    () => (selectedLocation ? formatCityLabel(selectedLocation) : ''),
    [selectedLocation]
  );

  const handleSelectLocation = useCallback((city: CityItem) => {
    userInteractedRef.current = true;
    setSelectedLocation(city);
  }, []);

  const handleChangeMonth = useCallback((checked: boolean, name: string) => {
    setMonthStates((prev) => {
      if (checked) {
        if (name === 'Any') return ['Any'];
        const withoutAny = prev.filter((m) => m !== 'Any');
        return withoutAny.includes(name) ? withoutAny : [...withoutAny, name];
      }
      return prev.filter((m) => m !== name);
    });
  }, []);

  const clearMonths = useCallback(() => setMonthStates([]), []);

  const clearLocation = useCallback(() => {
    userInteractedRef.current = true;
    setSelectedLocation(null);
  }, []);

  const clearAll = useCallback(() => {
    userInteractedRef.current = true;
    setSelectedLocation(null);
    setMonthStates([]);
  }, []);

  const packagesUrl = useMemo(() => {
    const slug = selectedLocation?.slug;
    const location = selectedLocation?.name ?? '';
    return buildPackagesUrl(location, monthStates, slug);
  }, [selectedLocation, monthStates]);

  const monthLabel = useMemo(
    () => (monthStates.length > 0 ? monthStates.join(', ') : ''),
    [monthStates]
  );

  return {
    locationValue,
    selectedLocation,
    handleSelectLocation,
    monthStates,
    handleChangeMonth,
    packagesUrl,
    monthLabel,
    clearMonths,
    clearLocation,
    clearAll,
  };
}
