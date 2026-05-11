import type { UserLocation } from './userLocation';

type City = { id: string; name: string; state?: string | null };

const norm = (value: string | null | undefined) => (value || '').trim().toLowerCase();

/**
 * Given a detected user location and the cities catalog, return the list of
 * city names from the catalog that should be applied as a filter.
 *
 * Rules:
 * 1. If the detected city matches a catalog city by name → return that one.
 * 2. Otherwise, if the detected state matches catalog cities → return all
 *    cities in that state.
 * 3. Otherwise → empty.
 *
 * The returned strings preserve the catalog's casing (so they slot directly
 * into the `?location=...` URL param and the `defaultChecked` lookup in
 * LocationFilter, which both use exact-match comparison).
 */
export function matchUserLocationCities(
  location: Pick<UserLocation, 'city' | 'state'> | null,
  cities: City[] | undefined | null
): string[] {
  if (!location || !cities || cities.length === 0) return [];

  const detectedCity = norm(location.city);
  if (detectedCity) {
    const cityMatch = cities.find((c) => norm(c.name) === detectedCity);
    if (cityMatch) return [cityMatch.name];
  }

  const detectedState = norm(location.state);
  if (detectedState) {
    const stateMatches = cities
      .filter((c) => norm(c.state) === detectedState)
      .map((c) => c.name);
    if (stateMatches.length > 0) return stateMatches;
  }

  return [];
}
