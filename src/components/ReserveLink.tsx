'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';

interface ReserveLinkProps {
  checkoutUrl: string;
  className?: string;
  children: React.ReactNode;
}

// Routes Reserve clicks straight to /checkout when the user is logged in.
// Previously the link always went through /login?redirect=…, and the login
// page client-side-bounced authenticated users — which produced the visible
// "login page → checkout" flash. Deciding the href here keeps the parent
// page ISR-cacheable (no cookies() call) and skips the bounce entirely.
const ReserveLink = ({ checkoutUrl, className, children }: ReserveLinkProps) => {
  const { isLoggedIn, isAuthReady } = useSupabaseIsLoggedIn();
  const [cookieLoggedIn, setCookieLoggedIn] = useState(false);

  // useSupabaseIsLoggedIn waits for supabase.auth.getSession() to resolve
  // before isAuthReady flips. That's an async round-trip, and if the user
  // taps Reserve during that window we'd send a logged-in user to /login.
  // The access_token cookie is set synchronously on login and is what the
  // middleware itself reads, so peeking at it gives us a reliable
  // optimistic signal until the supabase check confirms.
  useEffect(() => {
    setCookieLoggedIn(!!Cookies.get('access_token'));
  }, []);

  const loggedIn = isAuthReady ? isLoggedIn : cookieLoggedIn;
  const href = loggedIn
    ? checkoutUrl
    : `/login?redirect=${encodeURIComponent(checkoutUrl)}`;

  return (
    <Link href={href} className={className} prefetch={false}>
      {children}
    </Link>
  );
};

export default ReserveLink;
