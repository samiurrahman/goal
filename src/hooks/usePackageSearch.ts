import { useState, useCallback, useMemo } from 'react';
import { useCities } from './useCities';

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

  const { data: cities, isLoading: citiesLoading } = useCities();

  const filteredCities = useMemo(() => {
    if (!cities) return [];
    if (!locationValue) return cities as CityItem[];
    const query = locationValue.toLowerCase();
    return (cities as CityItem[]).filter((item) =>
      formatCityLabel(item).toLowerCase().includes(query)
    );
  }, [cities, locationValue]);

  const handleSelectLocation = useCallback((city: CityItem) => {
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
  };
}
