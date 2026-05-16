export const PROTECTED_PATHS = [
  '/account',
  '/profile',
  '/interested-users',
  '/listed-packages',
  '/my-bookings',
  '/bookings',
  '/favorites',
  '/account-settings',
  '/account-billing',
  '/listing',
  '/page-content',
] as const;

/**
 * Paths that don't gate behind login (so they aren't in PROTECTED_PATHS),
 * but are part of an authenticated flow — being on them after logout
 * leaves the user in an inconsistent state. Logout handlers should
 * redirect home from these.
 */
export const AUTH_CONTEXT_PATHS = ['/checkout', '/booking-success'] as const;

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
}

export function shouldRedirectHomeOnLogout(pathname: string): boolean {
  if (isProtectedRoute(pathname)) return true;
  // `pathname` from useRouter / usePathname has no query string, so a
  // simple equality / startsWith check is enough.
  return AUTH_CONTEXT_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
}
