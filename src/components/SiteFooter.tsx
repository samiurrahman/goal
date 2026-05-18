import Link from 'next/link';
import React from 'react';
import { SEO_CITIES } from '@/lib/seo/cities';
import { SEO_FACETS, type SeoFacet } from '@/lib/seo/facets';

// Compact copyright strip with the legal/info links required for production
// (privacy, terms, refund, contact, about). Stays a single horizontal strip on
// md+, stacks on mobile. The big multi-column footer was intentionally dropped
// earlier — this is the authoritative footer.
const legalLinks: { href: string; label: string }[] = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund-policy', label: 'Refunds' },
];

// Pull a small curated subset of the SEO landing pages into the footer. Two
// reasons: (1) gives Google internal links from EVERY page to the
// programmatic SEO surface — without these, the city/facet pages have no
// PageRank flow from the home or any package detail page; (2) gives pilgrims
// an obvious "explore" surface without us hand-curating a giant footer.
//
// Capped at ~8 per column so this stays a compact discovery block, not the
// "footer hellscape" the existing comment above warned against.
const FOOTER_CITY_COUNT = 8;
const FOOTER_FACETS_PER_CATEGORY = 4;

function pickFooterFacets(): { duration: SeoFacet[]; season: SeoFacet[]; budget: SeoFacet[] } {
  const grouped = {
    duration: SEO_FACETS.filter((f) => f.category === 'duration'),
    season: SEO_FACETS.filter((f) => f.category === 'season'),
    budget: SEO_FACETS.filter((f) => f.category === 'budget'),
  };
  return {
    duration: grouped.duration.slice(0, FOOTER_FACETS_PER_CATEGORY),
    season: grouped.season.slice(0, FOOTER_FACETS_PER_CATEGORY),
    budget: grouped.budget.slice(0, FOOTER_FACETS_PER_CATEGORY),
  };
}

const SiteFooter: React.FC = () => {
  const year = new Date().getFullYear();
  const footerCities = SEO_CITIES.slice(0, FOOTER_CITY_COUNT);
  const footerFacets = pickFooterFacets();

  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      {/* ============== EXPLORE / SEO DISCOVERY ============== */}
      <section className="container py-10 lg:py-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8 text-[13px]">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400 mb-3">
            Umrah from your city
          </h3>
          <ul className="space-y-2">
            {footerCities.map((c) => (
              <li key={c.urlSlug}>
                <Link
                  href={`/umrah-packages-from-${c.urlSlug}`}
                  className="text-neutral-700 dark:text-neutral-300 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  Umrah from {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/agencies"
                className="text-neutral-700 dark:text-neutral-300 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                All verified agencies
              </Link>
            </li>
            <li>
              <Link
                href="/blog"
                className="text-neutral-700 dark:text-neutral-300 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                Umrah travel guide
              </Link>
            </li>
            <li>
              <Link
                href="/packages"
                className="text-primary-700 dark:text-primary-300 font-medium hover:underline"
              >
                All cities →
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400 mb-3">
            Browse by duration
          </h3>
          <ul className="space-y-2">
            {footerFacets.duration.map((f) => (
              <li key={f.urlSlug}>
                <Link
                  href={`/${f.urlSlug}`}
                  className="text-neutral-700 dark:text-neutral-300 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  {f.relatedCardTitle}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400 mb-3">
            Browse by season
          </h3>
          <ul className="space-y-2">
            {footerFacets.season.map((f) => (
              <li key={f.urlSlug}>
                <Link
                  href={`/${f.urlSlug}`}
                  className="text-neutral-700 dark:text-neutral-300 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  {f.relatedCardTitle}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400 mb-3">
            Browse by budget
          </h3>
          <ul className="space-y-2">
            {footerFacets.budget.map((f) => (
              <li key={f.urlSlug}>
                <Link
                  href={`/${f.urlSlug}`}
                  className="text-neutral-700 dark:text-neutral-300 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  {f.relatedCardTitle}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/umrah-packages-near-haram"
                className="text-neutral-700 dark:text-neutral-300 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                Hotels near the Haram
              </Link>
            </li>
          </ul>
        </div>
      </section>

      {/* ============== LEGAL / COPYRIGHT STRIP ============== */}
      <div className="border-t border-neutral-200 dark:border-neutral-700">
        <div className="container py-6 md:py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 text-[13px] text-neutral-500 dark:text-neutral-400">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>© {year} Searchumrah</span>
            <span className="hidden md:inline text-neutral-300 dark:text-neutral-700">·</span>
            {legalLinks.map((link, idx) => (
              <React.Fragment key={link.href}>
                <Link
                  href={link.href}
                  className="hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors"
                >
                  {link.label}
                </Link>
                {idx < legalLinks.length - 1 && (
                  <span className="text-neutral-300 dark:text-neutral-700">·</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <span>Bangalore, India</span>
        </div>
      </div>
    </footer>
  );
};

export default SiteFooter;
