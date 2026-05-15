import React from 'react';
import {
  HOTEL_AMENITY_OPTIONS,
  getHotelAmenityOption,
  type HotelAmenityKey,
} from '@/constants/hotelAmenities';

interface HotelInfo {
  side: 'makkah' | 'madinah';
  name?: string | null;
  distanceM?: number | null;
  stars?: number | null;
  amenities?: HotelAmenityKey[];
}

interface PackageInfoProps {
  data: { title: string; details: string[]; contentHtml?: string };
  hotels?: HotelInfo[];
}

const sanitizeMarkup = (markup: string) => {
  if (!markup) return '';
  return markup
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+=("[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '');
};

const formatDistance = (meters?: number | null) => {
  if (!meters || meters <= 0) return null;
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`;
};

const HotelCard: React.FC<{ hotel: HotelInfo }> = ({ hotel }) => {
  const isMakkah = hotel.side === 'makkah';
  const distance = formatDistance(hotel.distanceM);
  const locLabel = isMakkah
    ? `Makkah${distance ? ` · ${distance} to Haram` : ''}`
    : `Madinah${distance ? ` · ${distance} to Masjid Nabawi` : ''}`;
  const stars =
    hotel.stars && hotel.stars >= 1 && hotel.stars <= 5 ? Math.round(hotel.stars) : null;
  const amenityOptions = (hotel.amenities || [])
    .map((key) => getHotelAmenityOption(key))
    .filter((opt): opt is NonNullable<typeof opt> => Boolean(opt));

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <div
        className="relative aspect-[16/10] overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgb(199 210 254) 0%, rgb(204 251 241) 100%)',
        }}
      >
        <div
          className="absolute inset-0 flex items-end justify-center text-primary-700"
          style={{ opacity: 0.5 }}
          aria-hidden
        >
          <svg
            viewBox="0 0 200 130"
            preserveAspectRatio="xMidYMax meet"
            className="w-4/5 h-[70%]"
          >
            <g fill="currentColor">
              <rect x={isMakkah ? 50 : 40} y={isMakkah ? 40 : 30} width={isMakkah ? 100 : 120} height={isMakkah ? 90 : 100} />
              <rect x="62" y="56" width="10" height="14" />
              <rect x="86" y="56" width="10" height="14" />
              <rect x="110" y="56" width="10" height="14" />
              <rect x="62" y="80" width="10" height="14" />
              <rect x="86" y="80" width="10" height="14" />
              <rect x="110" y="80" width="10" height="14" />
              <rect x="62" y="104" width="76" height="20" />
            </g>
          </svg>
        </div>
        {stars ? (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/95 dark:bg-neutral-900/95 px-2.5 py-1 text-[11.5px] font-semibold text-neutral-800 dark:text-neutral-100 shadow-sm">
            <span className="text-amber-400 leading-none">★</span>
            {stars}-star
          </span>
        ) : null}
      </div>
      <div className="p-3.5">
        <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary-700 dark:text-primary-400">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-3 h-3"
          >
            <path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0z" />
          </svg>
          {locLabel}
        </div>
        <h3 className="mt-1 text-[17px] font-semibold leading-snug text-neutral-900 dark:text-neutral-100">
          {hotel.name || (isMakkah ? 'Makkah hotel' : 'Madinah hotel')}
        </h3>
        {amenityOptions.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {amenityOptions.map((opt) => (
              <span
                key={opt.key}
                className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300"
              >
                <i
                  className={`las ${opt.icon} text-[12px] leading-none text-primary-700 dark:text-primary-400`}
                  aria-hidden
                />
                {opt.label}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const PackageInfo: React.FC<PackageInfoProps> = ({ data, hotels }) => {
  const visibleHotels = (hotels || []).filter((h) => h.name && h.name.trim().length > 0);

  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 sm:p-8 space-y-5">
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-primary-700 dark:text-primary-400">
          Where you&rsquo;ll stay
        </p>
        <h2 className="mt-2 text-[20px] sm:text-[22px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-100">
          {data.title || 'Hotels close to the Haramain'}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
          Both hotels are within walking distance of the Haram and Masjid Nabawi &mdash; chosen for
          ease of access during prayer times.
        </p>
      </div>

      {visibleHotels.length > 0 ? (
        <div className="grid gap-3 sm:gap-3.5 md:grid-cols-2">
          {visibleHotels.map((hotel) => (
            <HotelCard key={hotel.side} hotel={hotel} />
          ))}
        </div>
      ) : null}

      {data.contentHtml ? (
        <div
          className="prose prose-sm max-w-none text-neutral-700 dark:prose-invert dark:text-neutral-300 prose-headings:mb-2 prose-headings:mt-3 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1"
          dangerouslySetInnerHTML={{ __html: sanitizeMarkup(data.contentHtml) }}
        />
      ) : data.details && data.details.length > 0 ? (
        <ul className="space-y-2">
          {data.details.map((text, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[13.5px] text-neutral-700 dark:text-neutral-300">
              <i className="las la-check-circle text-base text-primary-700 mt-[1px]" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      ) : visibleHotels.length === 0 ? (
        <p className="text-[13.5px] text-neutral-500 dark:text-neutral-400">
          No stay information available.
        </p>
      ) : null}
    </div>
  );
};

export default PackageInfo;
