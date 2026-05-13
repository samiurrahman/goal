'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';
import { supabase } from '@/utils/supabaseClient';

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
//
// When the logged-in user has an agents row, they're a seller — sellers
// can't book their (or anyone else's) packages, so we render a disabled
// look-alike with an inline note instead of a clickable link. The /checkout
// page also blocks Book Now for agents; this gate just stops them earlier.
const ReserveLink = ({ checkoutUrl, className, children }: ReserveLinkProps) => {
  const { isLoggedIn, isAuthReady } = useSupabaseIsLoggedIn();
  const [cookieLoggedIn, setCookieLoggedIn] = useState(false);
  const [isAgent, setIsAgent] = useState(false);

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

  // Only run the agent lookup once we know the user is logged in. Logged-out
  // viewers aren't agents (nothing to look up) and we don't want to fire a
  // pointless supabase query on every package-detail render.
  useEffect(() => {
    if (!loggedIn) {
      setIsAgent(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      const { data, error } = await supabase
        .from('agents')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('Failed to check agent status:', error.message);
        return;
      }
      if (data?.id) setIsAgent(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [loggedIn]);

  if (isAgent) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled
          className={`${className ?? ''} cursor-not-allowed opacity-60`}
        >
          {children}
        </button>
        <p className="text-xs text-amber-700 dark:text-amber-300">
          Agents sell packages on the platform and can&apos;t book them. Sign in with a pilgrim
          account to send an enquiry.
        </p>
      </div>
    );
  }

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
