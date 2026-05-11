// Curated list of chips an agent can attach to a package. Single source of
// truth for the wizard, the card display, and any future filtering.
//
// Keep this in sync with the CHECK constraint in
// `supabase/migrations/20260511010000_add_tags_to_packages.sql` — if you add a
// new tag here, update the migration too (and ship a follow-up).
export const PACKAGE_TAGS = [
  'Ramadan',
  'Direct flight',
  'Popular',
  'Short trip',
  'VIP',
  'Accessible',
  'Budget',
] as const;

export type PackageTag = (typeof PACKAGE_TAGS)[number];

const ALLOWED = new Set<string>(PACKAGE_TAGS);

export const sanitizePackageTags = (raw: unknown): PackageTag[] => {
  if (!Array.isArray(raw)) return [];
  const cleaned: PackageTag[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && ALLOWED.has(item)) {
      cleaned.push(item as PackageTag);
    }
  }
  // Preserve canonical order from PACKAGE_TAGS for stable rendering.
  return PACKAGE_TAGS.filter((tag) => cleaned.includes(tag));
};

// Visual tone per chip — kept tiny and predictable. "popular" is amber
// (matches the design system "popular" badge); the rest use the indigo
// primary-50/700 pill.
const POPULAR_TAGS = new Set<PackageTag>(['Ramadan', 'Popular', 'VIP']);

export const packageTagTone = (tag: PackageTag): 'popular' | 'info' =>
  POPULAR_TAGS.has(tag) ? 'popular' : 'info';
