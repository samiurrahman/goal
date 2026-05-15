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

// Ceiling buckets in 20K steps up to ≤ ₹1.9L; the final "₹2L+" bucket is
// a FLOOR that captures everything from premium to luxury packages.
export const PRICE_RANGES: NumericRange[] = [
  [0, 70_000],
  [0, 90_000],
  [0, 110_000],
  [0, 130_000],
  [0, 150_000],
  [0, 170_000],
  [0, 190_000],
  [200_000, Infinity],
];

// Same shape as price: ceiling buckets ≤ X meters, then a "1.5km+" floor
// for hotels that aren't right next to Haram/Masjid Nabawi.
export const DISTANCE_RANGES: NumericRange[] = [
  [0, 300],
  [0, 500],
  [0, 700],
  [0, 900],
  [0, 1100],
  [0, 1300],
  [0, 1500],
  [1500, Infinity],
];

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

// Most price buckets are CEILINGS ("≤ ₹X") because pilgrims search by budget
// ceiling. The final bucket is a FLOOR ("₹X+") for the premium tier — when
// max is Infinity, render the lower bound with a "+" suffix instead.
export function formatPriceRangeLabel([min, max]: NumericRange): string {
  if (!Number.isFinite(max)) return `₹ ${formatIndianPrice(min)}+`;
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

// Distance picker mirrors price: most buckets are CEILINGS ("≤ Xm from
// Haram"). The final "1.5km+" bucket is a FLOOR for hotels in the outer
// ring; when max is Infinity, render "min+" instead.
export function formatDistanceRangeLabel([min, max]: NumericRange): string {
  if (!Number.isFinite(max)) return `${formatMeters(min)}+`;
  return `≤ ${formatMeters(max)}`;
}
