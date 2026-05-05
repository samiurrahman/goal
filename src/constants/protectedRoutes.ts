export const PROTECTED_PATHS = [
  '/account',
  '/profile',
  '/listed-packages',
  '/my-bookings',
  '/bookings',
  '/account-settings',
  '/account-billing',
  '/listing',
  '/page-content',
] as const;

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
}
