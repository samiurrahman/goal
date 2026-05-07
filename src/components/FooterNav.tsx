'use client';

import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  BellIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Avatar from '@/shared/Avatar';
import SwitchDarkMode2 from '@/shared/SwitchDarkMode2';
import { supabase } from '@/utils/supabaseClient';
import { removeAccessToken } from '@/utils/authToken';
import { shouldRedirectHomeOnLogout } from '@/constants/protectedRoutes';
import { useSupabaseIsLoggedIn } from '@/hooks/useSupabaseIsLoggedIn';
import isInViewport from '@/utils/isInViewport';

let WIN_PREV_POSITION = 0;
if (typeof window !== 'undefined') {
  WIN_PREV_POSITION = window.pageYOffset;
}

type NotifyItem = {
  id: string;
  bookingId: number;
  name: string;
  description: string;
  time: string;
  href: string;
  avatar?: string | null;
  target: 'agent' | 'user';
  isRead: boolean;
};

const formatTimeAgo = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const FooterNav = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, isAuthReady } = useSupabaseIsLoggedIn();

  const [userType, setUserType] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [notifications, setNotifications] = useState<NotifyItem[]>([]);

  const hasUnread = useMemo(() => notifications.some((n) => !n.isRead), [notifications]);

  const profileHref = userType === 'agent' ? '/profile' : '/account';

  // Scroll hide/show
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const handleScroll = () => {
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame(showHideFooter);
    }
  };

  const showHideFooter = () => {
    if (!containerRef.current) return;
    if (window.visualViewport && window.visualViewport.scale !== 1) {
      containerRef.current.classList.remove('FooterNav--hide');
      return;
    }
    let currentScrollPos = window.pageYOffset;
    if (currentScrollPos > WIN_PREV_POSITION) {
      if (isInViewport(containerRef.current) && currentScrollPos - WIN_PREV_POSITION < 80) return;
      containerRef.current.classList.add('FooterNav--hide');
    } else {
      if (!isInViewport(containerRef.current) && WIN_PREV_POSITION - currentScrollPos < 80) return;
      containerRef.current.classList.remove('FooterNav--hide');
    }
    WIN_PREV_POSITION = currentScrollPos;
  };

  // Lock body scroll when sheet is open
  useEffect(() => {
    const isOpen = notifyOpen || menuOpen;
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [notifyOpen, menuOpen]);

  // Load user details
  useEffect(() => {
    if (!isLoggedIn || !isAuthReady) {
      setUserType(null);
      setAvatarUrl(null);
      return;
    }

    let isMounted = true;

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMounted || !user) return;

      const { data: ud } = await supabase
        .from('user_details')
        .select('user_type, profile_image')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      const resolvedType = ud?.user_type || 'user';
      setUserType(resolvedType);

      if (resolvedType === 'agent') {
        const { data: agentData } = await supabase
          .from('agents')
          .select('profile_image')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (isMounted) {
          setAvatarUrl(agentData?.profile_image || ud?.profile_image || null);
        }
      } else {
        setAvatarUrl(ud?.profile_image || null);
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [isLoggedIn, isAuthReady]);

  // Load notifications
  useEffect(() => {
    if (!isLoggedIn || !isAuthReady) {
      setNotifications([]);
      return;
    }

    let isMounted = true;
    let cleanup: (() => void) | undefined;

    const loadNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMounted || !user) return;

      const { data: ud } = await supabase
        .from('user_details')
        .select('user_type')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const { data: agentByAuth } = await supabase
        .from('agents')
        .select('id, auth_user_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      const isAgent = ud?.user_type === 'agent' || !!agentByAuth;

      if (isAgent) {
        const { data: rows } = await supabase
          .from('bookings')
          .select('id, auth_user_id, agent_id, agent_name, status, created_at, readByAgent')
          .eq('agent_id', user.id)
          .eq('readByAgent', false)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!isMounted) return;

        const mapped = ((rows || []) as any[]).map((item) => ({
          id: `agent-${item.id}-${item.created_at}`,
          bookingId: item.id,
          name: item.agent_name || 'A traveler',
          description: 'New booking received.',
          time: formatTimeAgo(item.created_at),
          href: '/bookings',
          avatar: null,
          target: 'agent' as const,
          isRead: !!item.readByAgent,
        }));
        setNotifications(mapped);

        const channel = supabase
          .channel(`mobile-notify-agent-${user.id}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'bookings', filter: `agent_id=eq.${user.id}` },
            (payload) => {
              const booking = payload.new as any;
              setNotifications((prev) => {
                const item: NotifyItem = {
                  id: `agent-${booking.id}-${booking.created_at}`,
                  bookingId: booking.id,
                  name: booking.agent_name || 'A traveler',
                  description: 'New booking received.',
                  time: 'Just now',
                  href: '/bookings',
                  avatar: null,
                  target: 'agent',
                  isRead: false,
                };
                return [item, ...prev.filter((n) => n.id !== item.id)].slice(0, 20);
              });
            }
          )
          .subscribe();

        cleanup = () => supabase.removeChannel(channel);
      } else {
        const { data: rows } = await supabase
          .from('bookings')
          .select('id, auth_user_id, agent_id, agent_name, status, created_at, readByUser')
          .eq('auth_user_id', user.id)
          .eq('status', 'confirmed')
          .eq('readByUser', false)
          .order('created_at', { ascending: false })
          .limit(20);

        if (!isMounted) return;

        const mapped = ((rows || []) as any[]).map((item) => ({
          id: `user-${item.id}-${item.created_at}`,
          bookingId: item.id,
          name: item.agent_name || 'Your agent',
          description: 'Your booking is confirmed!',
          time: formatTimeAgo(item.created_at),
          href: '/my-bookings',
          avatar: null,
          target: 'user' as const,
          isRead: !!item.readByUser,
        }));
        setNotifications(mapped);

        const channel = supabase
          .channel(`mobile-notify-user-${user.id}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `auth_user_id=eq.${user.id}` },
            (payload) => {
              const current = payload.new as any;
              const previous = payload.old as any;
              if ((current.status || '').toLowerCase() !== 'confirmed') return;
              if ((previous.status || '').toLowerCase() === 'confirmed') return;

              setNotifications((prev) => {
                const item: NotifyItem = {
                  id: `user-${current.id}-${current.created_at}`,
                  bookingId: current.id,
                  name: current.agent_name || 'Your agent',
                  description: 'Your booking is confirmed!',
                  time: 'Just now',
                  href: '/my-bookings',
                  avatar: null,
                  target: 'user',
                  isRead: false,
                };
                return [item, ...prev.filter((n) => n.id !== item.id)].slice(0, 20);
              });
            }
          )
          .subscribe();

        cleanup = () => supabase.removeChannel(channel);
      }
    };

    void loadNotifications();

    return () => {
      isMounted = false;
      if (cleanup) cleanup();
    };
  }, [isLoggedIn, isAuthReady]);

  const handleNotificationClick = async (item: NotifyItem) => {
    if (item.isRead) return;
    setNotifications((prev) => prev.filter((n) => n.id !== item.id));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      await fetch('/api/bookings/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bookingId: item.bookingId, target: item.target }),
        keepalive: true,
      });
    } catch {}
  };

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    const finalize = () => {
      removeAccessToken();
      if (typeof window !== 'undefined') {
        for (const storage of [localStorage, sessionStorage]) {
          const keys = Object.keys(storage);
          keys.forEach((k) => {
            if (k.startsWith('sb-') && (k.endsWith('-auth-token') || k.endsWith('-auth-token-code-verifier'))) {
              storage.removeItem(k);
            }
          });
        }
        window.dispatchEvent(new Event('app:force-logout'));
      }
      setMenuOpen(false);
      setIsSigningOut(false);

      if (shouldRedirectHomeOnLogout(pathname)) {
        router.push('/');
      }
    };

    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (!error) {
      finalize();
      return;
    }

    await supabase.auth.signOut({ scope: 'local' });
    finalize();
  };

  const tabClass = (active: boolean) =>
    `flex flex-col items-center justify-between text-neutral-500 dark:text-neutral-300/90 ${active ? 'text-neutral-900 dark:text-neutral-100' : ''}`;

  const iconClass = (active: boolean) => `w-6 h-6 ${active ? 'text-primary-6000' : ''}`;
  const labelClass = (active: boolean) => `text-[11px] leading-none mt-1 ${active ? 'text-primary-6000' : ''}`;

  const menuLinks = useMemo(() => {
    if (userType === 'agent') {
      return [
        { label: 'Profile', href: '/profile', icon: 'la-user' },
        { label: 'Bookings', href: '/bookings', icon: 'la-clipboard-list' },
        { label: 'Packages', href: '/listed-packages', icon: 'la-box' },
        { label: 'Account Settings', href: '/account-settings', icon: 'la-cog' },
      ];
    }
    return [
      { label: 'Profile', href: '/account', icon: 'la-user' },
      { label: 'My Bookings', href: '/my-bookings', icon: 'la-clipboard-list' },
      { label: 'Account Settings', href: '/account-settings', icon: 'la-cog' },
    ];
  }, [userType]);

  return (
    <>
      {/* Notification bottom sheet */}
      {notifyOpen && (
        <button
          type="button"
          aria-label="Close notifications"
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setNotifyOpen(false)}
        />
      )}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
          notifyOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-full rounded-t-3xl bg-white dark:bg-neutral-900 shadow-2xl">
          <div className="max-h-[78vh] overflow-y-auto py-5 px-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">Notifications</h3>
              <button type="button" onClick={() => setNotifyOpen(false)} className="p-1">
                <XMarkIcon className="w-5 h-5 text-neutral-500" />
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No new notifications.</p>
            ) : (
              <div className="space-y-2">
                {notifications.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={async (e) => {
                      e.preventDefault();
                      await handleNotificationClick(item);
                      setNotifyOpen(false);
                      router.push(item.href);
                    }}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 relative"
                  >
                    <Avatar imgUrl={item.avatar || undefined} sizeClass="w-9 h-9" userName={item.name} />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-200">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                      <p className="text-xs text-gray-400">{item.time}</p>
                    </div>
                    {!item.isRead && (
                      <span className="absolute right-3 top-4 w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account menu bottom sheet */}
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
          menuOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-full rounded-t-3xl bg-white dark:bg-neutral-900 shadow-2xl">
          <div className="py-5 px-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Avatar imgUrl={avatarUrl || undefined} sizeClass="w-10 h-10" />
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {userType === 'agent' ? 'Agent' : 'My Account'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setMenuOpen(false)} className="p-1">
                <XMarkIcon className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <div className="space-y-1">
              {menuLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition ${
                    pathname === link.href
                      ? 'bg-neutral-100 dark:bg-neutral-800 text-primary-6000'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <i className={`las ${link.icon} text-xl`} />
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700 space-y-1">
              <div className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800">
                <div className="flex items-center gap-3 text-neutral-700 dark:text-neutral-300">
                  <i className="las la-moon text-xl" />
                  <span className="text-sm font-medium">Dark theme</span>
                </div>
                <SwitchDarkMode2 />
              </div>

              <button
                type="button"
                disabled={isSigningOut}
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              >
                <i className="las la-sign-out-alt text-xl" />
                <span className="text-sm font-medium">
                  {isSigningOut ? 'Logging out...' : 'Log out'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer nav bar */}
      <div
        ref={containerRef}
        className="FooterNav block md:!hidden p-2 bg-white dark:bg-neutral-800 fixed top-auto bottom-0 inset-x-0 z-30 border-t border-neutral-300 dark:border-neutral-700 transition-transform duration-300 ease-in-out"
      >
        <div className="w-full max-w-lg flex justify-around mx-auto text-sm text-center">
          {/* Explore */}
          <Link href="/" className={tabClass(pathname === '/')}>
            <MagnifyingGlassIcon className={iconClass(pathname === '/')} />
            <span className={labelClass(pathname === '/')}>Explore</span>
          </Link>

          {isAuthReady && isLoggedIn ? (
            <>
              {/* Notifications */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setNotifyOpen(true);
                }}
                className={tabClass(false)}
              >
                <span className="relative">
                  <BellIcon className="w-6 h-6" />
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                </span>
                <span className="text-[11px] leading-none mt-1">Alerts</span>
              </button>

              {/* Avatar / Profile */}
              <Link href={profileHref} className={tabClass(pathname === profileHref)}>
                <Avatar imgUrl={avatarUrl || undefined} sizeClass="w-6 h-6" />
                <span className={labelClass(pathname === profileHref)}>Profile</span>
              </Link>

              {/* Menu (account) */}
              <button
                type="button"
                onClick={() => {
                  setNotifyOpen(false);
                  setMenuOpen(true);
                }}
                className={tabClass(false)}
              >
                <Bars3Icon className="w-6 h-6" />
                <span className="text-[11px] leading-none mt-1">Menu</span>
              </button>
            </>
          ) : (
            <Link href="/login" className={tabClass(pathname === '/login')}>
              <UserCircleIcon className={iconClass(pathname === '/login')} />
              <span className={labelClass(pathname === '/login')}>Log in</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
};

export default FooterNav;
