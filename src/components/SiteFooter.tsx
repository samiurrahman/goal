import React from 'react';

// Minimal copyright strip — matches the `.footer-base` row from the design
// system (the big footer with link columns was intentionally dropped earlier).
// Stacks vertically on mobile, splits left/right from md+.
const SiteFooter: React.FC = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <div className="container py-6 md:py-7 flex flex-col md:flex-row items-center md:justify-between gap-2 md:gap-4 text-[13px] text-neutral-500 dark:text-neutral-400">
        <span>© {year} HajjScanner. All rights reserved.</span>
        <span>Bangalore, India</span>
      </div>
    </footer>
  );
};

export default SiteFooter;
