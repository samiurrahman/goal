'use client';

import { MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { FC, useCallback } from 'react';
import toast from 'react-hot-toast';
import type { UserLocation } from '@/utils/userLocation';
import { useUserLocation } from '@/hooks/useUserLocation';

export interface LocationDetectBannerProps {
  /**
   * Called after the user grants permission and we successfully reverse-geocode
   * their coordinates. Use this to apply the location to filters / inputs.
   */
  onLocationDetected?: (location: UserLocation) => void;
  /** Override the default copy. */
  prompt?: string;
  className?: string;
}

const LocationDetectBanner: FC<LocationDetectBannerProps> = ({
  onLocationDetected,
  prompt = 'Show packages near you?',
  className = '',
}) => {
  const { status, location, bannerDismissed, request, dismiss } = useUserLocation();

  const handleClick = useCallback(async () => {
    const detected = await request();
    if (detected) {
      const label = detected.city || detected.state || 'your area';
      toast.success(`Showing packages near ${label}`);
      onLocationDetected?.(detected);
    } else if (status === 'denied') {
      toast.error('Location permission denied. You can enable it in your browser settings.');
    }
  }, [request, onLocationDetected, status]);

  // Hide the banner once we already have a location, the user dismissed it,
  // or the browser denied permission (showing it again would be annoying).
  if (location || bannerDismissed || status === 'denied' || status === 'unavailable') {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border border-primary-200 bg-primary-50 dark:border-primary-900 dark:bg-primary-900/20 px-4 py-3 ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-neutral-900 text-primary-6000 dark:text-primary-300">
          <MapPinIcon className="w-5 h-5" />
        </span>
        <p className="text-sm text-neutral-800 dark:text-neutral-100 leading-snug">
          {prompt}
          <span className="block text-xs text-neutral-500 dark:text-neutral-400">
            We&apos;ll only use it to filter packages — not stored on our servers.
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={handleClick}
          disabled={status === 'requesting'}
          className="px-4 py-1.5 rounded-full bg-primary-6000 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
        >
          {status === 'requesting' ? 'Detecting…' : 'Use my location'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="inline-flex items-center justify-center rounded-full p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-white/60 dark:text-neutral-300 dark:hover:text-neutral-100 dark:hover:bg-neutral-800/60"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default LocationDetectBanner;
