import Link from 'next/link';
import React from 'react';

// Compact copyright strip with the legal/info links required for production
// (privacy, terms, refund, contact, about). Stays a single horizontal strip on
// md+, stacks on mobile. The big multi-column footer was intentionally dropped
// earlier — this is the authoritative footer.
const legalLinks: { href: string; label: string }[] = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund-policy', label: 'Refunds' },
];

const SiteFooter: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <div className="container py-6 md:py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 text-[13px] text-neutral-500 dark:text-neutral-400">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>© {year} Searchumrah</span>
          <span className="hidden md:inline text-neutral-300 dark:text-neutral-700">·</span>
          {legalLinks.map((link, idx) => (
            <React.Fragment key={link.href}>
              <Link
                href={link.href}
                className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
              >
                {link.label}
              </Link>
              {idx < legalLinks.length - 1 && (
                <span className="text-neutral-300 dark:text-neutral-700">·</span>
              )}
            </React.Fragment>
          ))}
        </div>
        <span>Bangalore, India</span>
      </div>
    </footer>
  );
};

export default SiteFooter;
