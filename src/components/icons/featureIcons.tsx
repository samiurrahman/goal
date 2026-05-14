import React, { ReactNode } from 'react';

// Shared icon set for agent "What We Provide" feature cards.
//
// Each entry is the inner SVG content for a `viewBox="0 0 24 24"` stroke icon
// (fill none, stroke currentColor) — matching the design language used on the
// public agent profile. Agents pick one of these per feature in their profile
// editor; the chosen key is stored on `AgentInfoFeature.icon` (a plain string,
// persisted inside the `info_features` JSON column — no migration needed).
//
// Keep the keys stable: changing a key orphans every saved feature that used it.

export interface FeatureIconOption {
  key: string;
  label: string;
}

const ICON_PATHS: Record<string, ReactNode> = {
  'shield-check': (
    <>
      <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  'price-tag': (
    <>
      <path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  plane: (
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  ),
  bed: (
    <>
      <path d="M2 4v16" />
      <path d="M2 8h18a2 2 0 0 1 2 2v10" />
      <path d="M2 17h20" />
      <path d="M6 8v9" />
    </>
  ),
  meals: (
    <>
      <path d="M3 2v7c0 1.1.9 2 2 2s2-.9 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
    </>
  ),
  transport: (
    <>
      <path d="M4 17V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11" />
      <path d="M3 12h18" />
      <path d="M7 4v8M17 4v8" />
      <path d="M3 17h18v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1M8 19v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2" />
    </>
  ),
  kaaba: (
    <>
      <path d="m12 2 9 5v10l-9 5-9-5V7z" />
      <path d="M3 7l9 5 9-5M12 22V12" />
      <path d="M3 10l9 5 9-5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  support: (
    <>
      <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
      <path d="M18 14h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1z" />
      <path d="M6 14H4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1z" />
      <path d="M21 17v1a3 3 0 0 1-3 3h-3" />
    </>
  ),
  passport: (
    <>
      <path d="M4 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <circle cx="12" cy="10" r="3" />
      <path d="M8.5 17h7" />
    </>
  ),
  group: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  star: (
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  ),
  location: (
    <>
      <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  phone: (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
};

// Order shown in the picker. Curated travel / Hajj-Umrah relevant set.
export const FEATURE_ICON_OPTIONS: FeatureIconOption[] = [
  { key: 'shield-check', label: 'Verified / Trusted' },
  { key: 'price-tag', label: 'Transparent pricing' },
  { key: 'lock', label: 'Secure booking' },
  { key: 'plane', label: 'Flights' },
  { key: 'bed', label: 'Hotels / Stay' },
  { key: 'meals', label: 'Meals' },
  { key: 'transport', label: 'Transport' },
  { key: 'kaaba', label: 'Hajj / Umrah' },
  { key: 'calendar', label: 'Scheduling' },
  { key: 'support', label: 'Support' },
  { key: 'passport', label: 'Visa / Passport' },
  { key: 'group', label: 'Group / Family' },
  { key: 'star', label: 'Quality' },
  { key: 'location', label: 'Locations' },
  { key: 'phone', label: 'Contact' },
];

export const DEFAULT_FEATURE_ICON = 'shield-check';

// Resolves an icon key to its SVG content, falling back to a sensible default
// so older features (saved before icons existed) still render something.
export const getFeatureIconContent = (key?: string): ReactNode =>
  (key && ICON_PATHS[key]) || ICON_PATHS[DEFAULT_FEATURE_ICON];

export interface FeatureIconProps {
  iconKey?: string;
  className?: string;
}

// Renders a feature icon as a complete <svg>. `className` controls sizing.
export const FeatureIcon: React.FC<FeatureIconProps> = ({
  iconKey,
  className = 'h-[22px] w-[22px]',
}) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {getFeatureIconContent(iconKey)}
  </svg>
);
