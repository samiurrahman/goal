'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  clearUserLocation,
  dismissBanner as dismissBannerStorage,
  isBannerDismissed,
  readUserLocation,
  writeUserLocation,
  type UserLocation,
} from '@/utils/userLocation';

export type GeoStatus =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'error';

type UseUserLocationResult = {
  location: UserLocation | null;
  status: GeoStatus;
  errorMessage: string | null;
  bannerDismissed: boolean;
  request: () => Promise<UserLocation | null>;
  dismiss: () => void;
  clear: () => void;
};

const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<Pick<UserLocation, 'city' | 'state' | 'country' | 'countryCode'>> => {
  const res = await fetch(
    `/api/geocode/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`
  );
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || 'Reverse geocoding failed');
  }
  const data = (await res.json()) as Pick<
    UserLocation,
    'city' | 'state' | 'country' | 'countryCode'
  >;
  return data;
};

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    setLocation(readUserLocation());
    setBannerDismissed(isBannerDismissed());

    const handleUpdate = () => {
      setLocation(readUserLocation());
    };
    window.addEventListener('app:user-location-updated', handleUpdate);
    return () => {
      window.removeEventListener('app:user-location-updated', handleUpdate);
    };
  }, []);

  const request = useCallback(async (): Promise<UserLocation | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable');
      setErrorMessage('Your browser does not support geolocation.');
      return null;
    }

    // iOS Safari/Chrome silently fail on http:// — geolocation requires a
    // secure context. Surface this clearly instead of timing out.
    if (
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setStatus('unavailable');
      setErrorMessage('Location requires HTTPS. Please reload over a secure connection.');
      return null;
    }

    setStatus('requesting');
    setErrorMessage(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const geocoded = await reverseGeocode(
              position.coords.latitude,
              position.coords.longitude
            );
            const detected: UserLocation = {
              ...geocoded,
              detectedAt: Date.now(),
            };
            writeUserLocation(detected);
            setLocation(detected);
            setStatus('granted');
            resolve(detected);
          } catch (err) {
            const message =
              err instanceof Error ? err.message : 'Reverse geocoding failed';
            setStatus('error');
            setErrorMessage(message);
            resolve(null);
          }
        },
        (err) => {
          // iOS frequently returns POSITION_UNAVAILABLE (code 2) when GPS is
          // off or indoors, and TIMEOUT (code 3) when location services are
          // slow. Distinguish them so the toast is actionable.
          if (err.code === err.PERMISSION_DENIED) {
            setStatus('denied');
            setErrorMessage(
              'Location permission was denied. Allow location access in your browser settings.'
            );
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            setStatus('error');
            setErrorMessage(
              'Could not determine your location. Make sure location services are enabled on your device.'
            );
          } else if (err.code === err.TIMEOUT) {
            setStatus('error');
            setErrorMessage('Location request timed out. Please try again.');
          } else {
            setStatus('error');
            setErrorMessage(err.message || 'Could not get your location.');
          }
          resolve(null);
        },
        // Longer timeout for iOS: GPS lock indoors can take 15+ seconds.
        // maximumAge accepts a cached fix up to 10 minutes old.
        { enableHighAccuracy: false, timeout: 20000, maximumAge: 1000 * 60 * 10 }
      );
    });
  }, []);

  const dismiss = useCallback(() => {
    dismissBannerStorage();
    setBannerDismissed(true);
  }, []);

  const clear = useCallback(() => {
    clearUserLocation();
    setLocation(null);
    setStatus('idle');
  }, []);

  return {
    location,
    status,
    errorMessage,
    bannerDismissed,
    request,
    dismiss,
    clear,
  };
}
