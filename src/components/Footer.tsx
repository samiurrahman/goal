'use client';

import Logo from '@/shared/Logo';
import SocialsList1 from '@/shared/SocialsList1';
import { CustomLink } from '@/data/types';
import React from 'react';
import FooterNav from './FooterNav';

export interface WidgetFooterMenu {
  id: string;
  title: string;
  menus: CustomLink[];
}

const widgetMenus: WidgetFooterMenu[] = [
  {
    id: '1',
    title: 'Explore',
    menus: [
      { href: '/packages', label: 'Browse packages' },
      { href: '/', label: 'Search by city' },
      { href: '/signup?userType=agent', label: 'List as an agent' },
      { href: '/signup', label: 'Create an account' },
    ],
  },
  {
    id: '2',
    title: 'Company',
    menus: [
      { href: '/about', label: 'About us' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    id: '3',
    title: 'Legal',
    menus: [
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
      { href: '/refund-policy', label: 'Refund & Cancellation' },
    ],
  },
  {
    id: '4',
    title: 'Support',
    menus: [
      { href: 'mailto:support@searchumrah.com', label: 'support@searchumrah.com' },
      { href: 'mailto:security@searchumrah.com', label: 'Report a security issue' },
    ],
  },
];

const Footer: React.FC = () => {
  const renderWidgetMenuItem = (menu: WidgetFooterMenu, index: number) => {
    return (
      <div key={index} className="text-sm">
        <h2 className="font-semibold text-neutral-700 dark:text-neutral-200">{menu.title}</h2>
        <ul className="mt-5 space-y-4">
          {menu.menus.map((item, idx) => (
            <li key={idx}>
              <a
                className="text-neutral-6000 dark:text-neutral-300 hover:text-black dark:hover:text-white"
                href={item.href}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const year = new Date().getFullYear();

  return (
    <>
      <FooterNav />

      <div className="nc-Footer relative py-24 lg:py-28 border-t border-neutral-200 dark:border-neutral-700">
        <div className="container grid grid-cols-2 gap-y-10 gap-x-5 sm:gap-x-8 md:grid-cols-4 lg:grid-cols-5 lg:gap-x-10 ">
          <div className="grid grid-cols-4 gap-5 col-span-2 md:col-span-4 lg:md:col-span-1 lg:flex lg:flex-col">
            <div className="col-span-2 md:col-span-1">
              <Logo />
            </div>
            <div className="col-span-2 flex items-center md:col-span-3">
              <SocialsList1 className="flex items-center space-x-3 lg:space-x-0 lg:flex-col lg:space-y-2.5 lg:items-start" />
            </div>
          </div>
          {widgetMenus.map(renderWidgetMenuItem)}
        </div>

        <div className="container mt-16 pt-8 border-t border-neutral-200 dark:border-neutral-700 text-xs text-neutral-500 dark:text-neutral-400 flex flex-col md:flex-row md:justify-between gap-2">
          <p>© {year} Searchumrah. All rights reserved.</p>
          <p>Operated from Bangalore, India.</p>
        </div>
      </div>
    </>
  );
};

export default Footer;
