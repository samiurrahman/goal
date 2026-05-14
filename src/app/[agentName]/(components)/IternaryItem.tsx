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

// A fixed flight block — rendered at the start (departure) and end (return) of
// every itinerary. `position` decides the plane icon direction and timeline
// accent colour.
export interface FlightTimelineItem {
  kind: 'flight';
  position: 'start' | 'end';
  dayLabel: string;
  subtitle: string;
  departureCity: string;
  stops: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  flightInfo: string;
}

// A day block — added between the two flight blocks. `description` is rich-text
// HTML produced by the wizard's editor.
export interface DayTimelineItem {
  kind: 'day';
  dayLabel: string;
  subtitle: string;
  title: string;
  description: string;
  icon?: IternaryIconId | '';
}

export type IternaryItemProps = FlightTimelineItem | DayTimelineItem;

interface TimelineItemRenderProps {
  item: IternaryItemProps;
  isLast?: boolean;
}

// Strip script tags and inline event handlers from agent-authored HTML before
// it is injected into the page. Mirrors the helper used in PackageInfo.
const sanitizeMarkup = (markup: string): string => {
  if (!markup) return '';
  return markup
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+=("[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '');
};

const hasHtmlContent = (markup: string): boolean =>
  !!markup &&
  markup
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, '')
    .trim().length > 0;

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

// Shared header: blue uppercase day label with the subtitle sitting beside it
// in plain black. Used by both flight and day rows.
const RowHeading: React.FC<{ dayLabel: string; subtitle: string }> = ({ dayLabel, subtitle }) => {
  const label = (dayLabel || '').trim();
  const sub = (subtitle || '').trim();
  if (!label && !sub) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 leading-6">
      {label ? (
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-primary-700 dark:text-primary-300">
          {label}
        </span>
      ) : null}
      {sub ? (
        <span className="text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">
          {sub}
        </span>
      ) : null}
    </div>
  );
};

const FlightRow: React.FC<{ item: FlightTimelineItem }> = ({ item }) => {
  const isStart = item.position !== 'end';
  const accent: 'primary' | 'secondary' = isStart ? 'primary' : 'secondary';
  const iconId: IternaryIconId = isStart ? 'plane-departure' : 'plane-arrival';

  const departureCity = (item.departureCity || '').trim();
  const arrivalCity = (item.arrivalCity || '').trim();
  const hasRoute = Boolean(departureCity || arrivalCity);

  const stops = (item.stops || '').trim();
  const showStops = Boolean(stops) && stops.toLowerCase() !== 'no stop';

  const flightParts = [item.departureTime, item.arrivalTime, item.flightInfo]
    .map((value) => (value || '').trim())
    .filter(Boolean);

  return (
    <li className="relative pt-1 pb-6 last:pb-0">
      <TimelineMarker icon={iconId} accent={accent} />
      <RowHeading dayLabel={item.dayLabel} subtitle={item.subtitle} />
      {hasRoute ? (
        <div className="mt-2 flex items-center gap-2.5 text-[15px] font-medium text-neutral-800 dark:text-neutral-100">
          <span>{departureCity || '—'}</span>
          {/* Wider connector arrow; any stop count rides on top of the line. */}
          <span className="relative flex min-w-[72px] flex-1 max-w-[200px] items-center" aria-hidden>
            <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-600" />
            <span className="-ml-px border-y-4 border-y-transparent border-l-[7px] border-l-neutral-400 dark:border-l-neutral-500" />
            {showStops ? (
              <span className="absolute left-1/2 -top-[9px] -translate-x-1/2 whitespace-nowrap rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {stops}
              </span>
            ) : null}
          </span>
          <span>{arrivalCity || '—'}</span>
        </div>
      ) : null}
      {flightParts.length > 0 ? (
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-50 text-primary-700 px-3 py-1 text-[12px] font-semibold leading-none tabular-nums dark:bg-primary-900/30 dark:text-primary-300">
          <FlightIcon />
          {flightParts.join(' · ')}
        </span>
      ) : null}
    </li>
  );
};

const DayRow: React.FC<{ item: DayTimelineItem }> = ({ item }) => {
  const title = (item.title || '').trim();
  const description = item.description || '';

  return (
    <li className="relative pt-1 pb-6 last:pb-0">
      <TimelineMarker icon={item.icon} accent="primary" />
      <RowHeading dayLabel={item.dayLabel} subtitle={item.subtitle} />
      {title ? (
        <div className="mt-1 text-[16px] font-normal text-neutral-900 dark:text-neutral-100">
          {title}
        </div>
      ) : null}
      {hasHtmlContent(description) ? (
        <div
          className="mt-1 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300 prose prose-sm max-w-none dark:prose-invert prose-headings:mb-1 prose-headings:mt-2 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5"
          dangerouslySetInnerHTML={{ __html: sanitizeMarkup(description) }}
        />
      ) : null}
    </li>
  );
};

const IternaryItem: React.FC<TimelineItemRenderProps> = ({ item }) => {
  if (item.kind === 'flight') {
    return <FlightRow item={item} />;
  }
  return <DayRow item={item} />;
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
        className={`absolute -left-[30px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white dark:border-neutral-900 ring-2 ${wrapperColor}`}
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
