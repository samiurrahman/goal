'use client';

import React, { FC, MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useFavoriteIds, useIsLoggedIn, useToggleFavorite } from '@/hooks/useFavorites';

export interface FavoriteButtonProps {
  // packages.id is a uuid at runtime even though Package.id is typed as
  // `number` — accept both, coerce to string before using.
  packageId: string | number | null | undefined;
  className?: string;
  // Cards stack the heart over their image, where a transparent white-on-dark
  // pill reads best. The favorites page surfaces it on a white background, so
  // it needs a darker neutral variant — both are covered by `variant`.
  variant?: 'overlay' | 'solid';
  size?: 'sm' | 'md';
}

const FavoriteButton: FC<FavoriteButtonProps> = ({
  packageId,
  className = '',
  variant = 'overlay',
  size = 'md',
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isAuthReady } = useIsLoggedIn();
  const { data: favoriteIds } = useFavoriteIds();
  const toggle = useToggleFavorite();

  const id =
    packageId === null || packageId === undefined || packageId === ''
      ? null
      : String(packageId);
  const isFavorited = id !== null && favoriteIds?.has(id) === true;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    // Cards wrap the whole tile in a <Link>; tapping the heart must NOT
    // navigate to the package page.
    event.preventDefault();
    event.stopPropagation();

    if (id === null) return;

    if (!isAuthReady) return;

    if (!isLoggedIn) {
      toast('Please log in to save favorites.', { icon: '🔒' });
      const redirect = pathname || '/';
      router.push(`/login?redirect=${encodeURIComponent(redirect)}`);
      return;
    }

    toggle.mutate(
      { packageId: id, currentlyFavorited: isFavorited },
      {
        onError: (err) => {
          toast.error(err.message || 'Could not update favorite');
        },
      }
    );
  };

  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const iconClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  const baseClass =
    variant === 'overlay'
      ? 'bg-white/90 dark:bg-neutral-900/80 backdrop-blur-sm shadow-sm hover:bg-white dark:hover:bg-neutral-900'
      : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700';

  const heartColor = isFavorited
    ? 'text-rose-500'
    : 'text-neutral-700 dark:text-neutral-200';

  return (
    <button
      type="button"
      aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
      aria-pressed={isFavorited}
      onClick={handleClick}
      className={`relative z-20 inline-flex items-center justify-center rounded-full transition ${sizeClass} ${baseClass} ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconClass} ${heartColor}`}
        viewBox="0 0 24 24"
        fill={isFavorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
};

export default FavoriteButton;
