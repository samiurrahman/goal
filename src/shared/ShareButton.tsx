'use client';

import { ShareIcon } from '@heroicons/react/24/outline';
import { FC, useCallback } from 'react';
import toast from 'react-hot-toast';

export interface ShareButtonProps {
  url: string;
  title?: string;
  text?: string;
  className?: string;
  iconOnly?: boolean;
  label?: string;
  ariaLabel?: string;
}

const ShareButton: FC<ShareButtonProps> = ({
  url,
  title,
  text,
  className = '',
  iconOnly = false,
  label = 'Share',
  ariaLabel,
}) => {
  const handleClick = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const absoluteUrl = (() => {
        if (/^https?:\/\//i.test(url)) return url;
        if (typeof window === 'undefined') return url;
        try {
          return new URL(url, window.location.origin).toString();
        } catch {
          return url;
        }
      })();

      const shareData: ShareData = {
        url: absoluteUrl,
        ...(title ? { title } : {}),
        ...(text ? { text } : {}),
      };

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share(shareData);
          return;
        } catch (err) {
          if ((err as DOMException)?.name === 'AbortError') return;
        }
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(absoluteUrl);
          toast.success('Link copied to clipboard');
          return;
        } catch {
          // Fall through to prompt fallback below.
        }
      }

      if (typeof window !== 'undefined') {
        window.prompt('Copy link:', absoluteUrl);
      }
    },
    [url, title, text]
  );

  const baseClass = iconOnly
    ? 'inline-flex items-center justify-center rounded-md p-1.5 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:text-neutral-100 dark:hover:bg-neutral-800'
    : 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel || label}
      title={label}
      className={`${baseClass} ${className}`.trim()}
    >
      <ShareIcon className={iconOnly ? 'w-5 h-5' : 'w-4 h-4'} />
      {iconOnly ? null : <span>{label}</span>}
    </button>
  );
};

export default ShareButton;
