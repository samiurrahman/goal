'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface MobileBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /**
   * Tailwind responsive helper. By default the sheet is mobile-only
   * (`md:hidden`); pass a custom override if a caller wants the sheet on
   * more breakpoints.
   */
  hideOnBreakpoint?: string;
  children: React.ReactNode;
}

// Mobile-only slide-up sheet. Rendered through a React portal into
// `document.body` so it isn't trapped by ancestors that establish containing
// blocks for fixed positioning (e.g. the header uses `backdrop-filter`,
// which would otherwise anchor `position: fixed` to the header instead of
// the viewport — making the sheet appear at the top of the page).
//
// Animation matches the old FooterNav pattern: the sheet is always mounted
// and `translate-y-full ↔ translate-y-0` drives the slide via CSS transform.
const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  open,
  onClose,
  title,
  hideOnBreakpoint = 'md:hidden',
  children,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') return null;

  return createPortal(
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${hideOnBreakpoint}`}
        />
      ) : null}

      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${hideOnBreakpoint} ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        aria-hidden={!open}
      >
        <div className="rounded-t-3xl bg-white dark:bg-neutral-900 shadow-2xl">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {title}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1 text-neutral-500 hover:text-neutral-700 dark:text-neutral-300"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="max-h-[78vh] overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default MobileBottomSheet;
