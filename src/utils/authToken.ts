import Cookies from "js-cookie";

/**
 * Stores the access token in a secure cookie.
 * @param {string} token - The access token to store.
 */
export function storeAccessToken(token: string) {
  if (!token) return;
  Cookies.set("access_token", token, {
    secure: true,
    sameSite: "strict",
    path: "/",
  });
}
