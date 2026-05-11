/**
 * Persists the user's detected location across sessions so we don't have to
 * re-prompt the browser on every visit. Stores city/state only — never raw
 * lat/lng.
 */
const LOCATION_KEY = 'app:userLocation:v1';
const BANNER_DISMISSED_KEY = 'app:locationBannerDismissed:v1';
const APPLIED_FLAG_KEY = 'app:locationFilterApplied:v1';

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
    window.localStorage.removeItem(APPLIED_FLAG_KEY);
    window.dispatchEvent(new CustomEvent('app:user-location-updated'));
  } catch {
    // Ignore.
  }
};

export const isBannerDismissed = (): boolean => {
  if (!isBrowser()) return false;
  return window.localStorage.getItem(BANNER_DISMISSED_KEY) === '1';
};

export const dismissBanner = (): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(BANNER_DISMISSED_KEY, '1');
  } catch {
    // Ignore.
  }
};

/**
 * One-shot per session: returns true the first time it's called in this
 * session, false thereafter. Used to auto-apply the cached location filter
 * once per browsing session without overriding manual user changes.
 */
export const claimAutoApplyOnce = (): boolean => {
  if (!isBrowser()) return false;
  try {
    if (window.sessionStorage.getItem(APPLIED_FLAG_KEY) === '1') return false;
    window.sessionStorage.setItem(APPLIED_FLAG_KEY, '1');
    return true;
  } catch {
    return false;
  }
};
