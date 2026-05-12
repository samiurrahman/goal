/**
 * Persists the user's detected location across sessions so we don't have to
 * re-prompt the browser on every visit. Stores city/state only — never raw
 * lat/lng.
 */
const LOCATION_KEY = 'app:userLocation:v1';

export type UserLocation = {
  city: string | null;
  state: string | null;
  country: string | null;
  countryCode: string | null;
  detectedAt: number;
};

const isBrowser = () => typeof window !== 'undefined';

export const readUserLocation = (): UserLocation | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserLocation;
    if (!parsed.city && !parsed.state) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeUserLocation = (location: UserLocation): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
    window.dispatchEvent(new CustomEvent('app:user-location-updated'));
  } catch {
    // Ignore quota / privacy mode.
  }
};

export const clearUserLocation = (): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(LOCATION_KEY);
    window.dispatchEvent(new CustomEvent('app:user-location-updated'));
  } catch {
    // Ignore.
  }
};
