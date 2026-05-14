import React from 'react';

export type IternaryIconId =
  | 'plane'
  | 'plane-departure'
  | 'plane-arrival'
  | 'mosque'
  | 'kaaba'
  | 'praying-hands'
  | 'walking'
  | 'hotel'
  | 'bed'
  | 'bus'
  | 'car'
  | 'mountain'
  | 'moon'
  | 'map-marker-alt'
  | 'star'
  | 'suitcase'
  | 'home'
  | 'flag-checkered';

export interface IternaryItemProps {
  fromDate: string;
  fromLocation: string;
  toDate: string;
  toLocation: string;
  tripTime: string;
  flightInfo: string;
  nextLegLabel?: string;
  icon?: IternaryIconId | '';
}

interface TimelineItemRenderProps extends IternaryItemProps {
  isLast?: boolean;
}

const FlightIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-3 h-3"
    aria-hidden
  >
    <path d="M2 14l9-3 4 8 2-1-3-9 8-3-2-2-9 3-4-3-2 1 3 4-6 5z" />
  </svg>
);

const IternaryItem: React.FC<TimelineItemRenderProps> = ({
  fromDate,
  fromLocation,
  toDate,
  toLocation,
  tripTime,
  flightInfo,
  nextLegLabel,
  icon,
  isLast = false,
}) => {
  const dayLabel = (fromDate || toDate || '').trim();
  const title =
    fromLocation && toLocation
      ? `${fromLocation} → ${toLocation}`
      : fromLocation || toLocation || 'Trip leg';
  const detail = (nextLegLabel || '').trim();
  const flightParts = [tripTime, flightInfo].map((value) => (value || '').trim()).filter(Boolean);

  const accentColor = isLast ? 'secondary' : 'primary';
  const dayColor = isLast ? 'text-secondary-700' : 'text-primary-700';

  return (
    <li className="relative pt-1 pb-6 last:pb-0">
      <TimelineMarker icon={icon} accent={accentColor} />
      {dayLabel ? (
        <div
          className={`text-[12px] font-semibold uppercase tracking-[0.08em] ${dayColor}`}
        >
          {dayLabel}
        </div>
      ) : null}
      <div className="mt-1 text-[16px] font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
        {title}
      </div>
      {detail ? (
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
          {detail}
        </p>
      ) : null}
      {flightParts.length > 0 ? (
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-50 text-primary-700 px-3 py-1 text-[12px] font-semibold leading-none tabular-nums">
          <FlightIcon />
          {flightParts.join(' · ')}
        </span>
      ) : null}
    </li>
  );
};

export const ITERNARY_ICON_OPTIONS: { id: IternaryIconId; label: string; className: string }[] = [
  { id: 'plane', label: 'Flight', className: 'las la-plane' },
  { id: 'plane-departure', label: 'Departure', className: 'las la-plane-departure' },
  { id: 'plane-arrival', label: 'Arrival', className: 'las la-plane-arrival' },
  { id: 'mosque', label: 'Mosque', className: 'las la-mosque' },
  { id: 'kaaba', label: 'Kaaba', className: 'las la-kaaba' },
  { id: 'praying-hands', label: 'Prayer', className: 'las la-praying-hands' },
  { id: 'walking', label: 'Tawaf / walk', className: 'las la-walking' },
  { id: 'hotel', label: 'Hotel', className: 'las la-hotel' },
  { id: 'bed', label: 'Stay', className: 'las la-bed' },
  { id: 'bus', label: 'Coach', className: 'las la-bus' },
  { id: 'car', label: 'Transfer', className: 'las la-car' },
  { id: 'mountain', label: 'Arafat', className: 'las la-mountain' },
  { id: 'moon', label: 'Muzdalifah', className: 'las la-moon' },
  { id: 'map-marker-alt', label: 'Place', className: 'las la-map-marker-alt' },
  { id: 'star', label: 'Highlight', className: 'las la-star' },
  { id: 'suitcase', label: 'Departure', className: 'las la-suitcase' },
  { id: 'home', label: 'Return home', className: 'las la-home' },
  { id: 'flag-checkered', label: 'Finish', className: 'las la-flag-checkered' },
];

const ICON_LOOKUP: Record<IternaryIconId, string> = ITERNARY_ICON_OPTIONS.reduce(
  (acc, option) => {
    acc[option.id] = option.className;
    return acc;
  },
  {} as Record<IternaryIconId, string>
);

export const getIternaryIconClass = (id?: IternaryIconId | '' | null): string | null => {
  if (!id) return null;
  return ICON_LOOKUP[id as IternaryIconId] || null;
};

interface TimelineMarkerProps {
  icon?: IternaryIconId | '';
  accent: 'primary' | 'secondary';
}

const TimelineMarker: React.FC<TimelineMarkerProps> = ({ icon, accent }) => {
  const iconClass = getIternaryIconClass(icon);

  if (iconClass) {
    const wrapperColor =
      accent === 'secondary'
        ? 'bg-secondary-50 text-secondary-700 ring-secondary-200 dark:bg-secondary-900/30 dark:text-secondary-300'
        : 'bg-primary-50 text-primary-700 ring-primary-200 dark:bg-primary-900/30 dark:text-primary-300';
    return (
      <span
        className={`absolute -left-[30px] top-[2px] flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-neutral-900 ring-2 ${wrapperColor}`}
        aria-hidden
      >
        <i className={`${iconClass} text-[13px] leading-none`} />
      </span>
    );
  }

  const dotColor =
    accent === 'secondary'
      ? 'bg-secondary-500 ring-secondary-200'
      : 'bg-primary-700 ring-primary-200';
  return (
    <span
      className={`absolute -left-[24px] top-[10px] block w-3 h-3 rounded-full border-[3px] border-white dark:border-neutral-900 ring-2 ${dotColor}`}
      aria-hidden
    />
  );
};

export default IternaryItem;
