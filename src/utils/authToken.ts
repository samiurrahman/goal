import Cookies from 'js-cookie';

// Persist for 7 days so the cookie outlives a tab close on mobile browsers
// (especially iOS Safari, which is aggressive about clearing session cookies
// while Supabase keeps the localStorage session alive). The middleware only
// checks for presence — Supabase remains the source of truth on token validity.
const ACCESS_TOKEN_TTL_DAYS = 7;

/**
 * Stores the access token in a secure cookie.
 * @param {string} token - The access token to store.
 */
export function storeAccessToken(token: string) {
  if (!token) return;
  Cookies.set('access_token', token, {
    secure: true,
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
