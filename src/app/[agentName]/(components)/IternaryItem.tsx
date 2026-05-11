import React from 'react';

export interface IternaryItemProps {
  fromDate: string;
  fromLocation: string;
  toDate: string;
  toLocation: string;
  tripTime: string;
  flightInfo: string;
  nextLegLabel?: string;
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
  isLast = false,
}) => {
  const dayLabel = (fromDate || toDate || '').trim();
  const title =
    fromLocation && toLocation
      ? `${fromLocation} → ${toLocation}`
      : fromLocation || toLocation || 'Trip leg';
  const detail = (nextLegLabel || '').trim();
  const flightParts = [tripTime, flightInfo].map((value) => (value || '').trim()).filter(Boolean);

  const dotColor = isLast
    ? 'bg-secondary-500 ring-secondary-200'
    : 'bg-primary-700 ring-primary-200';
  const dayColor = isLast ? 'text-secondary-700' : 'text-primary-700';

  return (
    <li className="relative pt-1 pb-6 last:pb-0">
      <span
        className={`absolute -left-[24px] top-[10px] block w-3 h-3 rounded-full border-[3px] border-white dark:border-neutral-900 ring-2 ${dotColor}`}
        aria-hidden
      />
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

export default IternaryItem;
