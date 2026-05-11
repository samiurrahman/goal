import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useCities } from './useCities';
import { useUserLocation } from './useUserLocation';
import { matchUserLocationCities } from '@/utils/matchUserLocationCities';

export type CityItem = {
  id: number | string;
  name: string;
  state?: string;
};

export function formatCityLabel(city: CityItem): string {
  return city.name + (city.state ? ', ' + city.state : '');
}

export function buildPackagesUrl(location: string, months: string[]): string {
  const params = new URLSearchParams();
  if (location) params.append('location', location);
  const filtered = months.filter((m) => m !== 'Any');
  if (filtered.length > 0) params.append('month', filtered.join(','));
  return params.toString() ? `/packages?${params.toString()}` : '/packages';
}

export function usePackageSearch() {
  const [locationValue, setLocationValue] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<CityItem | null>(null);
  const [monthStates, setMonthStates] = useState<string[]>([]);
  const userInteractedRef = useRef(false);
  const autoPrefilledRef = useRef(false);

  const { data: cities, isLoading: citiesLoading } = useCities();
  const { location: userLocation } = useUserLocation();

  // Auto-prefill the location field from a previously detected user location.
  // Runs once per hook instance, only if the user hasn't already interacted.
  useEffect(() => {
    if (autoPrefilledRef.current || userInteractedRef.current) return;
    if (!userLocation || !cities || cities.length === 0) return;

    const matched = matchUserLocationCities(userLocation, cities);
    if (matched.length === 0) return;

    const cityRow = (cities as CityItem[]).find((c) => c.name === matched[0]);
    if (!cityRow) return;

    autoPrefilledRef.current = true;
    setLocationValue(formatCityLabel(cityRow));
    setSelectedLocation(cityRow);
  }, [userLocation, cities]);

  const filteredCities = useMemo(() => {
    if (!cities) return [];
    if (!locationValue) return cities as CityItem[];
    const query = locationValue.toLowerCase();
    return (cities as CityItem[]).filter((item) =>
      formatCityLabel(item).toLowerCase().includes(query)
    );
  }, [cities, locationValue]);

  const handleSelectLocation = useCallback((city: CityItem) => {
    userInteractedRef.current = true;
    setLocationValue(formatCityLabel(city));
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
    setLocationValue('');
    setSelectedLocation(null);
  }, []);

  const clearAll = useCallback(() => {
    userInteractedRef.current = true;
    setLocationValue('');
    setSelectedLocation(null);
    setMonthStates([]);
  }, []);

  const packagesUrl = useMemo(() => {
    const location = selectedLocation
      ? selectedLocation.name || ''
      : locationValue;
    return buildPackagesUrl(location, monthStates);
  }, [selectedLocation, locationValue, monthStates]);

  const monthLabel = useMemo(() => {
    return monthStates.length > 0 ? monthStates.join(', ') : '';
  }, [monthStates]);

  return {
    locationValue,
    setLocationValue,
    selectedLocation,
    handleSelectLocation,
    monthStates,
    handleChangeMonth,
    filteredCities,
    citiesLoading,
    packagesUrl,
    monthLabel,
    clearMonths,
    clearLocation,
    clearAll,
  };
}
