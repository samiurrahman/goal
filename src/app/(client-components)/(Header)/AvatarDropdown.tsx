'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Avatar from '@/shared/Avatar';
import SwitchDarkMode2 from '@/shared/SwitchDarkMode2';
import Link from 'next/link';
import { supabase } from '@/utils/supabaseClient';
import { removeAccessToken } from '@/utils/authToken';
import { resolvePublicImageUrl } from '@/utils/supabaseStorageHelper';
import useOutsideAlerter from '@/hooks/useOutsideAlerter';
import type { User } from '@supabase/supabase-js';
interface Props {
  className?: string;
}

interface ResolvedUserDetails {
  displayName: string;
  userType: string | null;
  city: string | null;
  state: string | null;
  profileUrl: string | null;
  agentSlug: string | null;
}

const DEFAULT_DISPLAY_NAME = 'Guest';

export default function AvatarDropdown({ className = '' }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>(DEFAULT_DISPLAY_NAME);
  const [userType, setUserType] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [profileUrl, setProfileUrl] = useState<string | null>(null);
  const [agentSlug, setAgentSlug] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useOutsideAlerter(containerRef, () => setOpen(false));

  const resetDetails = () => {
    setDisplayName(DEFAULT_DISPLAY_NAME);
    setUserType(null);
    setCity(null);
    setState(null);
    setProfileUrl(null);
    setAgentSlug(null);
  };

  const loadUserDetails = async (userId: string): Promise<ResolvedUserDetails> => {
    const fallback: ResolvedUserDetails = {
      displayName: DEFAULT_DISPLAY_NAME,
      userType: null,
      city: null,
      state: null,
      profileUrl: null,
      agentSlug: null,
    };

    const { data: userDetailsData } = await supabase
      .from('user_details')
      .select('user_type, first_name, last_name, city, state, profile_image')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (!userDetailsData) return fallback;

    const resolvedUserType = userDetailsData.user_type || null;
    const baseCity = (userDetailsData.city || '').trim() || null;
    const baseState = (userDetailsData.state || '').trim() || null;

    if (resolvedUserType !== 'agent') {
      const firstName = (userDetailsData.first_name || '').trim();
      const lastName = (userDetailsData.last_name || '').trim();
      const fullName = [firstName, lastName].filter(Boolean).join(' ');

      return {
        displayName: fullName || DEFAULT_DISPLAY_NAME,
        userType: resolvedUserType,
        city: baseCity,
        state: baseState,
        profileUrl: (userDetailsData.profile_image || '').trim() || null,
        agentSlug: null,
      };
    }

    const { data: agentData } = await supabase
      .from('agents')
      .select('known_as, city, state, slug, profile_image')
      .eq('auth_user_id', userId)
      .maybeSingle();

    const knownAs = (agentData?.known_as || '').trim();
    return {
      displayName: knownAs || DEFAULT_DISPLAY_NAME,
      userType: resolvedUserType,
      city: (agentData?.city || '').trim() || baseCity,
      state: (agentData?.state || '').trim() || baseState,
      profileUrl:
        (agentData?.profile_image || '').trim() ||
        (userDetailsData.profile_image || '').trim() ||
        null,
      agentSlug: (agentData?.slug || '').trim() || null,
    };
  };

  useEffect(() => {
    let isMounted = true;
    let currentRequest = 0;

    const applyUserState = async (nextUser: User | null) => {
      const requestId = ++currentRequest;

      if (!isMounted) return;

      setUser(nextUser);

      if (!nextUser) {
        setOpen(false);
        resetDetails();
        setIsAuthReady(true);
        return;
      }

      const metadataFullName =
        (nextUser.user_metadata?.full_name as string | undefined)?.trim() || DEFAULT_DISPLAY_NAME;
      setDisplayName(metadataFullName);

      const details = await loadUserDetails(nextUser.id);

      if (!isMounted || requestId !== currentRequest) return;

      setDisplayName(details.displayName || metadataFullName);
      setUserType(details.userType);
      setCity(details.city);
      setState(details.state);
      setProfileUrl(details.profileUrl);
      setAgentSlug(details.agentSlug);

      const metadataAvatar =
        (nextUser.user_metadata?.avatar_url as string | undefined) ||
        (nextUser.user_metadata?.picture as string | undefined) ||
        '';

      if (!details.profileUrl && metadataAvatar) {
        const { error: upsertError } = await supabase.from('user_details').upsert(
          {
            auth_user_id: nextUser.id,
            profile_image: metadataAvatar,
            user_type: details.userType || 'user',
          },
          { onConflict: 'auth_user_id' }
        );

        if (!upsertError) {
          setProfileUrl(metadataAvatar);
        }
      }

      setIsAuthReady(true);
    };

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await applyUserState(session?.user ?? null);
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyUserState(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const avatarUrl =
    resolvePublicImageUrl(profileUrl) ||
    resolvePublicImageUrl(user?.user_metadata?.avatar_url as string | undefined) ||
    resolvePublicImageUrl(user?.user_metadata?.picture as string | undefined);

  const myAccountHref = userType === 'agent' ? '/profile' : '/account';

  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    const finalizeLocalLogout = () => {
      removeAccessToken();

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('app_forced_logged_out', '1');

        const authStorageKeys = Object.keys(localStorage).filter(
          (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
        );
        authStorageKeys.forEach((key) => localStorage.removeItem(key));

        const sessionAuthStorageKeys = Object.keys(sessionStorage).filter(
          (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
        );
        sessionAuthStorageKeys.forEach((key) => sessionStorage.removeItem(key));

        window.dispatchEvent(new Event('app:force-logout'));
      }

      setUser(null);
      resetDetails();
      setOpen(false);
      setIsAuthReady(true);
      setIsSigningOut(false);

      // Redirect to home if not on allowed pages (/packages, /agentName, or /agentName/slug)
      const allowedPages = ['/packages'];
      const pathParts = pathname.split('/').filter(Boolean); // Remove empty parts
      const isAgentOrSlugPage = pathParts.length === 1 || pathParts.length === 2; // /agentName or /agentName/slug
      const shouldStayOnCurrentPage = allowedPages.includes(pathname) || isAgentOrSlugPage;

      if (!shouldStayOnCurrentPage) {
        router.push('/');
      }
    };

    const { error } = await supabase.auth.signOut({ scope: 'global' });

    if (!error) {
      finalizeLocalLogout();
      return;
    }

    const isForbidden = error.status === 403;
    const isMissingServerSession =
      !!error.message &&
      error.message.includes('Session from session_id claim in JWT does not exist');

    if (isForbidden || isMissingServerSession) {
      const { error: localSignOutError } = await supabase.auth.signOut({ scope: 'local' });
      if (localSignOutError) {
        console.error(
          'Failed to clear local session:',
          localSignOutError.message || 'Unknown error'
        );
      }

      finalizeLocalLogout();
      return;
    }

    if (error) {
      console.error('Failed to sign out:', error.message || 'Unknown error');
      setIsSigningOut(false);
      return;
    }

    setOpen(false);
    setIsSigningOut(false);
  };

  return (
    <div ref={containerRef} className={`AvatarDropdown relative flex ${className}`}>
      <button
        type="button"
        onClick={() => {
          if (!isAuthReady) return;
          setOpen((v) => !v);
        }}
        aria-busy={!isAuthReady}
        className="self-center w-10 h-10 sm:w-12 sm:h-12 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none flex items-center justify-center"
      >
        <Avatar sizeClass="w-8 h-8 sm:w-9 sm:h-9" imgUrl={avatarUrl} />
      </button>
      {open && (
        <div className="absolute z-50 w-screen max-w-[260px] px-4 top-full -right-10 sm:right-0 sm:px-0">
          <div className="overflow-hidden rounded-3xl shadow-lg ring-1 ring-black ring-opacity-5">
            <div className="relative grid grid-cols-1 gap-6 bg-white dark:bg-neutral-800 py-7 px-6">
              {userType === 'agent' && agentSlug ? (
                <Link
                  href={`/${agentSlug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center space-x-3 group"
                >
                  <Avatar sizeClass="w-12 h-12" imgUrl={avatarUrl} />
                  <div className="flex-grow">
                    <h4 className="font-semibold group-hover:text-primary-6000 transition-colors">
                      {displayName}
                    </h4>
                    {(city || state) && (
                      <p className="text-xs mt-0.5">
                        {[city, state].filter(Boolean).join(', ')}
                      </p>
                    )}
                    <p className="text-[11px] mt-1 inline-flex rounded-full border border-emerald-300 px-2 py-0.5 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                      Agent
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex items-center space-x-3">
                  <Avatar sizeClass="w-12 h-12" imgUrl={avatarUrl} />
                  <div className="flex-grow">
                    <h4 className="font-semibold">{displayName}</h4>
                    {(city || state) && (
                      <p className="text-xs mt-0.5">
                        {[city, state].filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />

              {/* ------------------ 1 --------------------- */}
              <Link
                href={myAccountHref}
                className="flex items-center p-2 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
                onClick={() => setOpen(false)}
              >
                <div className="flex items-center justify-center flex-shrink-0 text-neutral-500 dark:text-neutral-300">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12.1601 10.87C12.0601 10.86 11.9401 10.86 11.8301 10.87C9.45006 10.79 7.56006 8.84 7.56006 6.44C7.56006 3.99 9.54006 2 12.0001 2C14.4501 2 16.4401 3.99 16.4401 6.44C16.4301 8.84 14.5401 10.79 12.1601 10.87Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M7.15997 14.56C4.73997 16.18 4.73997 18.82 7.15997 20.43C9.90997 22.27 14.42 22.27 17.17 20.43C19.59 18.81 19.59 16.17 17.17 14.56C14.43 12.73 9.91997 12.73 7.15997 14.56Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium ">{'Profile'}</p>
                </div>
              </Link>

              {/* ------------------ 2 --------------------- */}
              {userType !== 'agent' && (
                <Link
                  href={'/my-bookings'}
                  className="flex items-center p-2 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-center justify-center flex-shrink-0 text-neutral-500 dark:text-neutral-300">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M8 12.2H15"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 16.2H12.38"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10 6H14C16 6 16 5 16 4C16 2 15 2 14 2H10C9 2 8 2 8 4C8 6 9 6 10 6Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 4.02002C19.33 4.20002 21 5.43002 21 10V16C21 20 20 22 15 22H9C4 22 3 20 3 16V10C3 5.44002 4.67 4.20002 8 4.02002"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium ">{'My bookings'}</p>
                  </div>
                </Link>
              )}

              {userType === 'agent' && (
                <Link
                  href="/bookings"
                  className="flex items-center p-2 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-center justify-center flex-shrink-0 text-neutral-500 dark:text-neutral-300">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M8 12.2H15"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 16.2H12.38"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M10 6H14C16 6 16 5 16 4C16 2 15 2 14 2H10C9 2 8 2 8 4C8 6 9 6 10 6Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 4.02002C19.33 4.20002 21 5.43002 21 10V16C21 20 20 22 15 22H9C4 22 3 20 3 16V10C3 5.44002 4.67 4.20002 8 4.02002"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeMiterlimit="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium ">{'Bookings'}</p>
                  </div>
                </Link>
              )}

              {/* ------------------ 2 --------------------- */}
              {userType === 'agent' && (
                <Link
                  href={'/listed-packages'}
                  className="flex items-center p-2 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
                  onClick={() => setOpen(false)}
                >
                  <div className="flex items-center justify-center flex-shrink-0 text-neutral-500 dark:text-neutral-300">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12.62 20.81C12.28 20.93 11.72 20.93 11.38 20.81C8.48 19.82 2 15.69 2 8.68998C2 5.59998 4.49 3.09998 7.56 3.09998C9.38 3.09998 10.99 3.97998 12 5.33998C13.01 3.97998 14.63 3.09998 16.44 3.09998C19.51 3.09998 22 5.59998 22 8.68998C22 15.69 15.52 19.82 12.62 20.81Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium ">{'Packages'}</p>
                  </div>
                </Link>
              )}

              <Link
                href={'/account-settings'}
                className="flex items-center p-2 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
                onClick={() => setOpen(false)}
              >
                <div className="flex items-center justify-center flex-shrink-0 text-neutral-500 dark:text-neutral-300">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 15.5C13.93 15.5 15.5 13.93 15.5 12C15.5 10.07 13.93 8.5 12 8.5C10.07 8.5 8.5 10.07 8.5 12C8.5 13.93 10.07 15.5 12 15.5Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M4 12.88V11.12C4 10.62 4.41 10.2 4.92 10.18L6.06 10.12C6.26 9.55 6.56 9.03 6.93 8.57L6.36 7.6C6.11 7.16 6.26 6.59 6.69 6.34L8.22 5.46C8.65 5.21 9.21 5.36 9.47 5.79L10.05 6.76C10.66 6.61 11.32 6.61 11.93 6.76L12.51 5.79C12.77 5.36 13.33 5.21 13.76 5.46L15.29 6.34C15.72 6.59 15.87 7.16 15.62 7.6L15.05 8.57C15.42 9.03 15.72 9.55 15.92 10.12L17.06 10.18C17.57 10.2 17.98 10.62 17.98 11.12V12.88C17.98 13.38 17.57 13.8 17.06 13.82L15.92 13.88C15.72 14.45 15.42 14.97 15.05 15.43L15.62 16.4C15.87 16.84 15.72 17.41 15.29 17.66L13.76 18.54C13.33 18.79 12.77 18.64 12.51 18.21L11.93 17.24C11.32 17.39 10.66 17.39 10.05 17.24L9.47 18.21C9.21 18.64 8.65 18.79 8.22 18.54L6.69 17.66C6.26 17.41 6.11 16.84 6.36 16.4L6.93 15.43C6.56 14.97 6.26 14.45 6.06 13.88L4.92 13.82C4.41 13.8 4 13.38 4 12.88Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium ">{'Account settings'}</p>
                </div>
              </Link>

              <div className="w-full border-b border-neutral-200 dark:border-neutral-700" />

              {/* ------------------ 2 --------------------- */}
              <div className="flex items-center justify-between p-2 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50">
                <div className="flex items-center">
                  <div className="flex items-center justify-center flex-shrink-0 text-neutral-500 dark:text-neutral-300">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12.0001 7.88989L10.9301 9.74989C10.6901 10.1599 10.8901 10.4999 11.3601 10.4999H12.6301C13.1101 10.4999 13.3001 10.8399 13.0601 11.2499L12.0001 13.1099"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8.30011 18.0399V16.8799C6.00011 15.4899 4.11011 12.7799 4.11011 9.89993C4.11011 4.94993 8.66011 1.06993 13.8001 2.18993C16.0601 2.68993 18.0401 4.18993 19.0701 6.25993C21.1601 10.4599 18.9601 14.9199 15.7301 16.8699V18.0299C15.7301 18.3199 15.8401 18.9899 14.7701 18.9899H9.26011C8.16011 18.9999 8.30011 18.5699 8.30011 18.0399Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8.5 22C10.79 21.35 13.21 21.35 15.5 22"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium ">{'Dark theme'}</p>
                  </div>
                </div>
                <SwitchDarkMode2 />
              </div>

              {/* ------------------ 2 --------------------- */}
              <button
                type="button"
                disabled={isSigningOut}
                aria-disabled={isSigningOut}
                className="flex items-center w-full p-2 -m-3 transition duration-150 ease-in-out rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none focus-visible:ring focus-visible:ring-orange-500 focus-visible:ring-opacity-50"
                onClick={handleLogout}
              >
                <div className="flex items-center justify-center flex-shrink-0 text-neutral-500 dark:text-neutral-300">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8.90002 7.55999C9.21002 3.95999 11.06 2.48999 15.11 2.48999H15.24C19.71 2.48999 21.5 4.27999 21.5 8.74999V15.27C21.5 19.74 19.71 21.53 15.24 21.53H15.11C11.09 21.53 9.24002 20.08 8.91002 16.54"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15 12H3.62"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5.85 8.6499L2.5 11.9999L5.85 15.3499"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium ">
                    {isSigningOut ? 'Logging out...' : 'Log out'}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
