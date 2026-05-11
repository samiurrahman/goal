'use client';

import { MapPinIcon } from '@heroicons/react/24/outline';
import { FC, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useUserLocation } from '@/hooks/useUserLocation';

// Compact location indicator for the header. Shows the detected city as a
// pill when we have it, otherwise an inline "Use my location" button that
// triggers the same `useUserLocation.request` flow as the hero banner.
const HeaderLocationPill: FC<{ className?: string }> = ({ className = '' }) => {
  const { status, location, bannerDismissed, request, errorMessage } = useUserLocation();

  const handleClick = useCallback(async () => {
    const detected = await request();
    if (detected) {
      const label = detected.city || detected.state || 'your area';
      toast.success(`Showing packages near ${label}`);
    } else if (errorMessage) {
      toast.error(errorMessage);
    }
  }, [request, errorMessage]);

  // Already-detected location → show as a static pill.
  if (location) {
    const label = location.city || location.state || 'Your area';
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200 px-3 py-1.5 text-xs font-medium border border-primary-100 dark:border-primary-900 ${className}`}
      >
        <MapPinIcon className="w-3.5 h-3.5" />
        <span className="truncate max-w-[140px]">{label}</span>
      </span>
    );
  }

  if (bannerDismissed || status === 'denied' || status === 'unavailable') {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={status === 'requesting'}
      className={`inline-flex items-center gap-1.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200 px-3 py-1.5 text-xs font-medium border border-primary-100 dark:border-primary-900 hover:bg-primary-100 dark:hover:bg-primary-900/50 disabled:opacity-60 transition ${className}`}
    >
      <MapPinIcon className="w-3.5 h-3.5" />
      {status === 'requesting' ? 'Detecting…' : 'Use my location'}
    </button>
  );
};

export default HeaderLocationPill;
