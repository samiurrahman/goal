'use client';

import { supabase } from '@/utils/supabaseClient';
import { Route } from '@/routers/types';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

type NavItem = {
  href: Route;
  label: string;
};

export const Nav = () => {
  const pathname = usePathname();
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
      <div className="flex space-x-8 md:space-x-14 overflow-x-auto hiddenScrollbar">
        {(isResolved
          ? listNav
          : [{ href: '/account-settings' as Route, label: 'Account settings' }]
        ).map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block py-5 md:py-8 border-b-2 flex-shrink-0 capitalize ${
                isActive ? 'border-primary-500 font-medium' : 'border-transparent'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};
