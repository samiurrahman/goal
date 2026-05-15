import type { NumericRange } from '@/hooks/filters/useMultiRangeFilter';

function buildRanges(start: number, step: number, count: number): NumericRange[] {
  const out: NumericRange[] = [];
  for (let i = 0; i < count; i++) {
    const min = start + i * step;
    out.push([min, min + step]);
  }
  return out;
}

export const DURATION_RANGES: NumericRange[] = buildRanges(0, 8, 6);

export const PRICE_RANGES: NumericRange[] = buildRanges(50_000, 20_000, 12);

export const DISTANCE_RANGES: NumericRange[] = buildRanges(100, 200, 10);

export function formatDurationRangeLabel([min, max]: NumericRange): string {
  return `${min} - ${max} days`;
}

function formatIndianPrice(val: number) {
  if (val < 100_000) return `${Math.round(val / 1000)}K`;
  const lakhs = Math.floor(val / 100_000);
  const thousands = Math.round((val % 100_000) / 1000);
  return `${lakhs}L${thousands > 0 ? ` ${thousands}K` : ''}`;
}

export function formatPriceRangeLabel([min, max]: NumericRange): string {
  return `₹ ${formatIndianPrice(min)} - ${formatIndianPrice(max)}`;
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

export function formatDistanceRangeLabel([min, max]: NumericRange): string {
  return `${formatMeters(min)} - ${formatMeters(max)}`;
}
