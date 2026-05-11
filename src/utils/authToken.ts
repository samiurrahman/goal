import Cookies from 'js-cookie';

// Persist for 7 days so the cookie outlives a tab close on mobile browsers
// (especially iOS Safari, which is aggressive about clearing session cookies
// while Supabase keeps the localStorage session alive). The middleware only
// checks for presence — Supabase remains the source of truth on token validity.
const ACCESS_TOKEN_TTL_DAYS = 7;

// Only require `secure` over HTTPS. On http://localhost, `secure: true` makes
// browsers (Safari especially) silently drop the cookie — js-cookie returns
// fine but document.cookie is never updated, so the middleware never sees
// the user as authenticated and bounces every protected-route navigation.
const isSecureContext = (): boolean => {
  if (typeof window === 'undefined') return true;
  return window.location.protocol === 'https:';
};

/**
 * Stores the access token in a cookie. Marked secure on HTTPS only so
 * the same code path works on localhost dev (http) without silent drops.
 */
export function storeAccessToken(token: string) {
  if (!token) return;
  Cookies.set('access_token', token, {
    secure: isSecureContext(),
    sameSite: 'lax',
    path: '/',
    expires: ACCESS_TOKEN_TTL_DAYS,
  });
}

/**
 * Removes the access token cookie.
 */
export function removeAccessToken() {
  Cookies.remove('access_token', { path: '/' });
}
