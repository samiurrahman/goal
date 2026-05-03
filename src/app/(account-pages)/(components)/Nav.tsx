'use client';

import { supabase } from '@/utils/supabaseClient';
import { Route } from '@/routers/types';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

type NavItem = {
  href: Route;
  label: string;
};

export const Nav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isAgent, setIsAgent] = useState(false);
  const [isResolved, setIsResolved] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const resolveRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        setIsAgent(false);
        setIsResolved(true);
        return;
      }

      const { data: details } = await supabase
        .from('user_details')
        .select('user_type')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      setIsAgent(details?.user_type === 'agent');
      setIsResolved(true);
    };

    void resolveRole();

    return () => {
      isMounted = false;
    };
  }, []);

  const userTabs: NavItem[] = [
    { href: '/account', label: 'Profile' },
    { href: '/my-bookings', label: 'My bookings' },
    { href: '/account-settings', label: 'Account settings' },
  ];

  const agentTabs: NavItem[] = [
    { href: '/bookings', label: 'Bookings' },
    { href: '/listed-packages', label: 'Packages' },
    { href: '/account-settings', label: 'Account settings' },
  ];

  const listNav = isAgent ? agentTabs : userTabs;

  return (
    <div className="container">
      <ul className="flex space-x-5 sm:space-x-8 lg:space-x-11 overflow-x-auto hiddenScrollbar">
        {(isResolved
          ? listNav
          : [{ href: '/account-settings' as Route, label: 'Account settings' }]
        ).map((item) => {
          const isActive = pathname === item.href;
          return (
            <li
              key={item.href}
              className={`flex-shrink-0 flex items-center py-4 md:py-4 text-sm lg:text-base font-medium capitalize ${
                isActive
                  ? ''
                  : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-400'
              }`}
            >
              <button
                type="button"
                onClick={() => router.push(item.href)}
                className="inline-flex items-center focus:outline-none"
              >
                {isActive ? (
                  <span className="block w-2.5 h-2.5 rounded-full bg-neutral-800 dark:bg-neutral-100 mr-2" />
                ) : null}
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
