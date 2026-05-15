import type { NumericRange } from '@/hooks/filters/useMultiRangeFilter';

function buildRanges(start: number, step: number, count: number): NumericRange[] {
  const out: NumericRange[] = [];
  for (let i = 0; i < count; i++) {
    const min = start + i * step;
    out.push([min, min + step]);
  }
  return out;
}

// Bucket boundaries are aligned to natural Hajj/Umrah package tiers (5/7/10/
// 14/21/28+ nights are the durations agencies actually sell), not arbitrary
// 8-day chunks. Picking "12-15 days" lands the most common 14-day Umrah;
// "30+ days" captures Hajj packages without the user having to scroll past
// half a dozen narrow buckets they'll never pick.
export const DURATION_RANGES: NumericRange[] = [
  [1, 8],
  [8, 12],
  [12, 16],
  [16, 22],
  [22, 30],
  [30, 60],
];

export const PRICE_RANGES: NumericRange[] = buildRanges(50_000, 20_000, 12);

export const DISTANCE_RANGES: NumericRange[] = buildRanges(100, 200, 10);

// Half-open `[min, max)` semantics in SQL — labels render "min – (max-1)"
// so the displayed day count matches what actually filters. The largest
// bucket renders as "30+ days" since "30-59" looks oddly precise for
// the long-Hajj catch-all.
export function formatDurationRangeLabel([min, max]: NumericRange): string {
  if (max >= 60) return `${min}+ days`;
  if (min <= 1) return `Up to ${max - 1} days`;
  return `${min} - ${max - 1} days`;
}

function formatIndianPrice(val: number) {
  if (val < 100_000) return `${Math.round(val / 1000)}K`;
  const lakhs = Math.floor(val / 100_000);
  const thousands = Math.round((val % 100_000) / 1000);
  return `${lakhs}L${thousands > 0 ? ` ${thousands}K` : ''}`;
}

// Price picker is a CEILING filter — picking the "₹50K – ₹70K" bucket means
// "show me anything under ₹70K", because pilgrims search by budget ceiling
// and an under-budget package is always a welcome match.
export function formatPriceRangeLabel([, max]: NumericRange): string {
  return `≤ ₹ ${formatIndianPrice(max)}`;
}

function formatMeters(v: number): string {
  if (v >= 1000) {
    const km = v / 1000;
    // Keep one decimal for non-integer km (1100 m → "1.1 km"); strip ".0" for
    // exact thousands so "2 km" doesn't render as "2.0 km".
    const rounded = Math.round(km * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded} km` : `${rounded.toFixed(1)} km`;
  }
  return `${v} m`;
}

// Distance picker is a CEILING filter — picking the "300m – 500m" bucket
// means "≤ 500m from Haram", because nobody books a hotel for being FAR
// from the masjid. Show only the upper bound to make that intent obvious.
export function formatDistanceRangeLabel([, max]: NumericRange): string {
  return `≤ ${formatMeters(max)}`;
}
