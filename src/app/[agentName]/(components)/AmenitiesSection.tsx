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
  // Drop URLs / asset paths — only Line Awesome class names are supported here.
  if (!value || value.startsWith('/') || value.startsWith('http') || value.includes('.'))
    return 'las la-check';
  if (/^(las|lar|lab)\s/.test(value)) return value;
  return `las ${value}`;
};

const InclusionRow: FC<{ item: InclusionItem; isFirst: boolean }> = ({ item, isFirst }) => {
  const excluded = Boolean(item.excluded);

  return (
    <div
      className={`flex items-center gap-3.5 py-3.5 ${
        isFirst ? '' : 'border-t border-neutral-200 dark:border-neutral-700'
      }`}
    >
      <span
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
          excluded
            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
            : 'bg-primary-50 text-primary-700'
        }`}
      >
        <i className={`${iconClassFor(item.icon)} text-[20px] leading-none`} aria-hidden />
      </span>
      <div className="min-w-0">
        <p
          className={`text-[15px] font-medium leading-snug ${
            excluded
              ? 'text-neutral-500 line-through decoration-neutral-300'
              : 'text-neutral-800 dark:text-neutral-100'
          }`}
        >
          {item.name}
        </p>
        {item.description ? (
          <p className="mt-0.5 text-[13px] text-neutral-500 dark:text-neutral-400 leading-snug no-underline">
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
    <div className="listingSection__wrap !space-y-0 !p-0 overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <div className="px-6 pt-6 pb-2 sm:px-8 sm:pt-8">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.10em] text-neutral-500 dark:text-neutral-400">
          Inclusions
        </h3>
      </div>
      <div className="px-6 pb-6 sm:px-8 sm:pb-8">
        {items.length === 0 ? (
          <p className="py-2 text-sm text-neutral-500 dark:text-neutral-400">
            No inclusions added yet.
          </p>
        ) : (
          items.map((item, idx) => (
            <InclusionRow key={`${item.name}-${idx}`} item={item} isFirst={idx === 0} />
          ))
        )}
      </div>
    </div>
  );
};

export default AmenitiesSection;
