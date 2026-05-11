const STORAGE_KEY = 'app:headerProfileCache:v1';

export type HeaderProfileCache = {
  loggedIn: boolean;
  displayName: string;
  userType: string | null;
  city: string | null;
  state: string | null;
  profileUrl: string | null;
  agentSlug: string | null;
};

const isBrowser = () => typeof window !== 'undefined';

export const readHeaderCache = (): HeaderProfileCache | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HeaderProfileCache;
    if (typeof parsed?.loggedIn !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeHeaderCache = (cache: HeaderProfileCache) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Quota / privacy mode — silently ignore.
  }
};

export const clearHeaderCache = () => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore.
  }
};
