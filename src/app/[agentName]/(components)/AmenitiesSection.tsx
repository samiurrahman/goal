import React, { FC } from 'react';

interface InclusionItem {
  name: string;
  icon?: string;
  description?: string;
  excluded?: boolean;
}

interface AmenitiesSectionProps {
  amenities: InclusionItem[];
}

const iconClassFor = (raw?: string) => {
  const value = (raw || '').trim();
  if (!value || value.startsWith('/') || value.startsWith('http') || value.includes('.'))
    return 'las la-check';
  if (/^(las|lar|lab)\s/.test(value)) return value;
  return `las ${value}`;
};

const InclusionTile: FC<{ item: InclusionItem }> = ({ item }) => {
  const excluded = Boolean(item.excluded);

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 p-3.5">
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${
          excluded
            ? 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-400'
            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-primary-700 dark:text-primary-400'
        }`}
      >
        <i className={`${iconClassFor(item.icon)} text-[18px] leading-none`} aria-hidden />
      </span>
      <div className="min-w-0">
        <p
          className={`text-[13.5px] font-semibold leading-snug ${
            excluded
              ? 'text-neutral-500 line-through decoration-neutral-300'
              : 'text-neutral-900 dark:text-neutral-100'
          }`}
        >
          {item.name}
        </p>
        {item.description ? (
          <p className="mt-0.5 text-[12px] leading-snug text-neutral-500 dark:text-neutral-400 no-underline">
            {item.description}
          </p>
        ) : null}
      </div>
    </div>
  );
};

const AmenitiesSection: FC<AmenitiesSectionProps> = ({ amenities }) => {
  const items = (amenities || []).filter((item) => item && item.name);

  return (
    <div className="rounded-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 sm:p-8">
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-primary-700 dark:text-primary-400">
        What&rsquo;s included
      </p>
      <h2 className="mt-2 text-[20px] sm:text-[22px] font-semibold leading-tight tracking-tight text-neutral-900 dark:text-neutral-100">
        Everything in your package
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-neutral-600 dark:text-neutral-400">
        No hidden costs. Visa, ihram, ground transport, and meals at the hotel are covered.
      </p>

      {items.length === 0 ? (
        <p className="mt-5 text-[13.5px] text-neutral-500 dark:text-neutral-400">
          No inclusions added yet.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {items.map((item, idx) => (
            <InclusionTile key={`${item.name}-${idx}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AmenitiesSection;
