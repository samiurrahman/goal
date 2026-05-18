import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Packages from '@/app/packages/components/packages';
import { fetchPackages } from '@/lib/queries/packages';
import type { Package } from '@/data/types';
import {
  SEO_FACETS,
  getSeoFacet,
  getRelatedFacets,
  type SeoFacet,
} from '@/lib/seo/facets';

// ISR — facet pages share the same caching profile as city pages: cheap to
// render, low churn, frequently crawled. 1 hour balances cache hit rate
// against freshness when an agent publishes a new matching package.
export const revalidate = 3600;

export function generateStaticParams() {
  return SEO_FACETS.map((f) => ({ facet: f.urlSlug }));
}

// dynamicParams=false → unknown slugs 404 rather than serving an empty page
// that dilutes the SEO surface.
export const dynamicParams = false;

const PAGE_SIZE = 12;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.searchumrah.com';

type PageParams = { params: { facet: string } };

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const facet = getSeoFacet(params.facet);
  if (!facet) return {};

  const canonical = `/${facet.urlSlug}`;
  return {
    title: facet.metaTitle,
    description: facet.metaDescription,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: `${BASE_URL}${canonical}`,
      title: facet.metaTitle,
      description: facet.metaDescription,
      siteName: 'Searchumrah',
      locale: 'en_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title: facet.metaTitle,
      description: facet.metaDescription,
    },
  };
}

// Convert the facet's filter payload to a /packages URL the "View all" link
// can deep-link into. Keeps the listing page as the single source of truth
// for filter URL syntax — if we ever change how price ranges encode in the
// URL, this function follows automatically.
function buildListingHref(facet: SeoFacet): string {
  const sp = new URLSearchParams();
  const p = facet.payload;

  if (p.priceRange) {
    const [min, max] = p.priceRange;
    sp.set('price', `${min}-${Number.isFinite(max) ? max : 'Infinity'}`);
  }
  if (p.durationRange) {
    const [min, max] = p.durationRange;
    sp.set('total_duration_days', `${min}-${max}`);
  }
  if (p.makkahDistanceRange) {
    const [min, max] = p.makkahDistanceRange;
    sp.set('makkah_hotel_distance_m', `${min}-${Number.isFinite(max) ? max : 'Infinity'}`);
  }
  if (p.madinahDistanceRange) {
    const [min, max] = p.madinahDistanceRange;
    sp.set('madinah_hotel_distance_m', `${min}-${Number.isFinite(max) ? max : 'Infinity'}`);
  }
  if (p.months?.length) {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    sp.set('month', p.months.map((m) => MONTHS[m - 1]).filter(Boolean).join(','));
  }
  if (p.tags?.length) {
    sp.set('tag', p.tags.join(','));
  }

  const qs = sp.toString();
  return qs ? `/packages?${qs}` : '/packages';
}

async function loadFacetPackages(
  facet: SeoFacet
): Promise<{ packages: Package[]; usedFallback: boolean }> {
  try {
    const exact = await fetchPackages({
      payload: facet.payload,
      page: 0,
      pageSize: PAGE_SIZE,
      sort: 'rating',
    });
    if (exact.length > 0) return { packages: exact, usedFallback: false };

    const nationwide = await fetchPackages({
      payload: {},
      page: 0,
      pageSize: PAGE_SIZE,
      sort: 'rating',
    });
    return { packages: nationwide, usedFallback: true };
  } catch {
    return { packages: [], usedFallback: false };
  }
}

const CATEGORY_LABELS: Record<SeoFacet['category'], string> = {
  budget: 'Budget',
  duration: 'Duration',
  season: 'Season',
  distance: 'Hotel distance',
  feature: 'Feature',
};

const FacetLandingPage = async ({ params }: PageParams) => {
  const facet = getSeoFacet(params.facet);
  if (!facet) notFound();

  const { packages, usedFallback } = await loadFacetPackages(facet);
  const related = getRelatedFacets(facet.urlSlug, 8);
  const canonicalUrl = `${BASE_URL}/${facet.urlSlug}`;
  const viewAllHref = buildListingHref(facet);

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Umrah Packages', item: `${BASE_URL}/packages` },
      { '@type': 'ListItem', position: 3, name: facet.h1, item: canonicalUrl },
    ],
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: facet.faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  const itemListLd = packages.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: packages.length,
    itemListElement: packages.slice(0, 10).map((p, i) => {
      const agentSlug = (p.agent_name || '').trim();
      const url =
        agentSlug && p.slug
          ? `${BASE_URL}/${encodeURIComponent(agentSlug)}/${encodeURIComponent(p.slug)}`
          : `${BASE_URL}/packages`;
      return {
        '@type': 'ListItem',
        position: i + 1,
        url,
        name: p.title,
      };
    }),
  } : null;

  return (
    <main className="nc-FacetLandingPage relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      {itemListLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
        />
      ) : null}

      {/* ============== HERO ============== */}
      <section
        className="relative text-white"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, rgb(var(--c-primary-700)) 0%, rgb(var(--c-primary-900)) 70%)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)',
              backgroundSize: '36px 36px',
              maskImage: 'radial-gradient(ellipse at top, black 0%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse at top, black 0%, transparent 70%)',
            }}
          />
        </div>

        <div className="container relative z-10 pt-10 pb-10 lg:pt-12 lg:pb-16">
          <nav className="mb-5 text-xs text-primary-200" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li>
                <Link href="/packages" className="hover:text-white">
                  Umrah Packages
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li className="text-white">{CATEGORY_LABELS[facet.category]}</li>
            </ol>
          </nav>

          <span className="inline-block text-[12px] tracking-[0.12em] uppercase font-semibold text-primary-200 mb-3">
            {CATEGORY_LABELS[facet.category]}
          </span>
          <h1 className="font-light tracking-tight leading-[1.05] text-[28px] sm:text-[40px] lg:text-[52px] max-w-[22ch]">
            {facet.h1}
          </h1>
          <p className="mt-4 text-base lg:text-[17px] leading-relaxed text-primary-100 max-w-[60ch]">
            {facet.introLede}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={viewAllHref}
              className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-white text-primary-900 text-sm font-semibold hover:bg-primary-50"
            >
              View all matching packages
            </Link>
            <Link
              href="/packages"
              className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/15"
            >
              Browse all packages
            </Link>
          </div>
        </div>
      </section>

      {/* ============== TRUST BAR ============== */}
      <section className="relative z-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 py-5">
        <div className="container">
          <ul className="flex flex-wrap gap-y-3 gap-x-8 justify-between text-[13px] text-neutral-600 dark:text-neutral-300">
            <li>
              <b className="text-neutral-900 dark:text-neutral-100">KYC-verified</b> agents only
            </li>
            <li>
              <b className="text-neutral-900 dark:text-neutral-100">No payment</b> taken on
              Searchumrah
            </li>
            <li>
              <b className="text-neutral-900 dark:text-neutral-100">Real reviews</b> from past
              pilgrims
            </li>
            <li>
              <b className="text-neutral-900 dark:text-neutral-100">Direct contact</b> with the
              agent
            </li>
          </ul>
        </div>
      </section>

      {/* ============== PACKAGE GRID ============== */}
      <section className="container py-12 lg:py-16">
        <header className="mb-6 lg:mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-thin tracking-tight">
              {usedFallback
                ? `Popular Umrah packages`
                : `Top matching packages`}
            </h2>
            <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
              {usedFallback
                ? `No packages currently match this filter. Showing popular packages nationwide — refine with the filters on the listing page.`
                : `Sorted by agent rating. Use the filters on the full listing page to refine further.`}
            </p>
          </div>
          <Link
            href={viewAllHref}
            className="text-sm font-semibold text-primary-700 dark:text-primary-300 hover:underline"
          >
            View all →
          </Link>
        </header>

        {packages.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-8 text-center text-neutral-600 dark:text-neutral-400">
            <p className="text-sm">
              No matching packages right now.{' '}
              <Link href="/packages" className="text-primary-700 hover:underline">
                Browse all Umrah packages
              </Link>{' '}
              or contact a verified agent directly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
            {packages.map((pkg, i) => (
              <Packages
                key={pkg.id}
                data={pkg}
                agentSlug={pkg.agent_name || undefined}
                agentDisplayName={pkg.agent_known_as || pkg.agent_name || undefined}
                agentProfileImage={pkg.agent_profile_image}
                agentRatingPoint={pkg.agent_rating_avg ?? 0}
                agentReviewCount={pkg.agent_rating_total ?? 0}
                priority={i < 2}
              />
            ))}
          </div>
        )}
      </section>

      {/* ============== INTRO / CONTEXT ============== */}
      <section className="bg-neutral-50 dark:bg-neutral-800/40 border-y border-neutral-200 dark:border-neutral-700 py-14 lg:py-20">
        <div className="container grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-16">
          <div>
            <span className="text-[12px] tracking-[0.12em] uppercase font-semibold text-primary-700 dark:text-primary-300">
              {CATEGORY_LABELS[facet.category]} · {facet.h1}
            </span>
            <h2 className="mt-2 text-2xl lg:text-[34px] leading-[1.15] font-thin tracking-tight max-w-[26ch]">
              What pilgrims should know about {facet.h1.toLowerCase()}.
            </h2>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300 max-w-[64ch]">
              {facet.bodyParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          <aside className="rounded-[24px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-7">
            <h3 className="text-lg font-semibold mb-4">Quick facts</h3>
            <dl className="space-y-3.5 text-sm">
              {facet.quickFacts.map((f) => (
                <div key={f.label} className="flex justify-between gap-4">
                  <dt className="text-neutral-500 dark:text-neutral-400">{f.label}</dt>
                  <dd className="font-medium text-right">{f.value}</dd>
                </div>
              ))}
            </dl>
            <Link
              href={viewAllHref}
              className="mt-6 inline-flex items-center justify-center w-full px-4 py-2.5 rounded-full bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800"
            >
              View matching packages
            </Link>
          </aside>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section className="container py-14 lg:py-20">
        <h2 className="text-2xl lg:text-[34px] leading-[1.15] font-thin tracking-tight max-w-[26ch]">
          Frequently asked questions
        </h2>
        <div className="mt-8 grid gap-4 lg:gap-5">
          {facet.faqs.map((f) => (
            <details
              key={f.question}
              className="group rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-5"
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer text-[15px] lg:text-base font-semibold text-neutral-900 dark:text-neutral-100 list-none">
                {f.question}
                <span className="ml-auto flex-shrink-0 text-neutral-400 group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm lg:text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                {f.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ============== RELATED FACETS ============== */}
      <section className="bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-200 dark:border-neutral-700 py-14 lg:py-20">
        <div className="container">
          <h2 className="text-2xl lg:text-[34px] leading-[1.15] font-thin tracking-tight">
            Other ways to browse Umrah packages
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Same category first, then alternatives across budget, duration, season, and hotel distance.
          </p>
          <ul className="mt-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {related.map((r) => (
              <li key={r.urlSlug}>
                <Link
                  href={`/${r.urlSlug}`}
                  className="block rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 hover:border-primary-400 hover:shadow-sm transition"
                >
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    {r.relatedCardTitle}
                  </div>
                  <div className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {CATEGORY_LABELS[r.category]}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
};

export default FacetLandingPage;
