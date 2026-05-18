'use client';

import React, { useMemo } from 'react';

// Same shape the checkout pages already use locally — kept loose so a row
// from purchase_summary, sharing_rate, or default_pricing can be passed in
// without an explicit cast.
type SharingRate = { value: string | number; people: number; default?: boolean };

interface SharingPillSelectorProps {
  rates: SharingRate[];
  value: number;
  onChange: (next: number) => void;
  label?: string;
  desc?: string;
}

// Replaces the previous +/- NcInputNumber for sharing on the checkout page.
// The +/- model assumed contiguous tiers (2 → 3 → 4 → 5); now that agents
// can offer any subset (e.g. just 2 and 5), a pill list is the only honest
// UI — we render exactly what's purchasable and nothing else.
const SharingPillSelector: React.FC<SharingPillSelectorProps> = ({
  rates,
  value,
  onChange,
  label = 'Sharing',
  desc = 'Per-room occupancy',
}) => {
  const tiers = useMemo(
    () =>
      [...rates]
        .map((r) => Number(r.people))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b),
    [rates]
  );

  return (
    <div className="flex flex-col gap-2">
      <div>
        <div className="font-medium text-neutral-800 dark:text-neutral-200">{label}</div>
        {desc ? (
          <div className="text-xs text-neutral-500 dark:text-neutral-400">{desc}</div>
        ) : null}
      </div>
      {tiers.length === 0 ? (
        <span className="text-xs text-neutral-500">No sharing options listed.</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tiers.map((people) => {
            const active = people === value;
            return (
              <button
                key={people}
                type="button"
                onClick={() => onChange(people)}
                aria-pressed={active}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-primary-6000 bg-primary-6000 text-white shadow-sm'
                    : 'border-neutral-300 text-neutral-700 hover:border-primary-400 dark:border-neutral-600 dark:text-neutral-300'
                }`}
              >
                {people}-sharing
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SharingPillSelector;
