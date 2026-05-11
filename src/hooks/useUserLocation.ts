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
          if (err.code === err.PERMISSION_DENIED) {
            setStatus('denied');
            setErrorMessage('Location permission was denied.');
          } else {
            setStatus('error');
            setErrorMessage(err.message || 'Could not get your location.');
          }
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 1000 * 60 * 60 }
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
