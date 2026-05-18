import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { safeJsonLd } from '@/lib/safeJsonLd';
import Packages from '@/app/packages/components/packages';
import { fetchPackages } from '@/lib/queries/packages';
import type { Package } from '@/data/types';
import {
  SEO_CITIES,
  getSeoCity,
  getRelatedCities,
  type SeoCity,
} from '@/lib/seo/cities';

// ISR — city pages are content pages: cheap to render, change rarely, and
// Google crawls them repeatedly. 1 hour is the sweet spot between agent
// updates becoming visible and Vercel's cache hit ratio. Mutation handlers
// (/api/revalidate) can force-refresh individual paths if needed.
export const revalidate = 3600;

// Pre-render all SEO city pages at build time so the first crawl hits a
// warm cache. The list is small (~25) so it's cheap.
export function generateStaticParams() {
  return SEO_CITIES.map((c) => ({ city: c.urlSlug }));
}

// Reject unknown slugs — without this, /umrah-packages-from-anything renders
// an empty page and dilutes our SEO surface with thin doorway pages.
export const dynamicParams = false;

const PAGE_SIZE = 12;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.searchumrah.com';

type PageParams = { params: { city: string } };

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const city = getSeoCity(params.city);
  if (!city) return {};

  const title = `Umrah Packages from ${city.name} | Compare Verified Agents`;
  const description = `Compare Umrah packages departing from ${city.name}, ${city.state}. Verified travel agents, transparent pricing, hotels near Haram in Makkah & Madinah. Book direct.`;
  const canonical = `/umrah-packages-from-${city.urlSlug}`;

  return {
    title,
    description,
    keywords: [
      `Umrah packages from ${city.name}`,
      `Umrah ${city.name}`,
      `cheap Umrah packages from ${city.name}`,
      `Umrah travel agents in ${city.name}`,
      `${city.name} Umrah package price`,
      `Umrah flights from ${city.name}`,
      `Umrah packages ${city.state}`,
    ],
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: `${BASE_URL}${canonical}`,
      title,
      description,
      siteName: 'Searchumrah',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

async function loadCityPackages(citySlug: string): Promise<{ packages: Package[]; usedFallback: boolean }> {
  try {
    const exact = await fetchPackages({
      payload: { citySlugs: [citySlug] },
      page: 0,
      pageSize: PAGE_SIZE,
      sort: 'rating',
    });
    if (exact.length > 0) return { packages: exact, usedFallback: false };

    // Soft fallback: show nationwide top-rated packages so the page isn't
    // a thin/empty doorway. We label this clearly in the UI ("Popular
    // packages nationwide") so users aren't misled.
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

function cityFaqs(city: SeoCity): { question: string; answer: string }[] {
  return [
    {
      question: `Are there direct Umrah flights from ${city.name}?`,
      answer: `${city.name} (${city.airportCode ?? ''}) has connecting and, on select packages, direct flights to Jeddah (JED) and Madinah (MED). Filter by "departure city" on each package to see flight details before booking.`,
    },
    {
      question: `What is the average cost of an Umrah package from ${city.name}?`,
      answer: `Umrah packages from ${city.name} typically range from ₹75,000 to ₹2,50,000 per person depending on duration, hotel category (distance from Haram), sharing room type and season. Ramadan and school-holiday months are the most expensive; off-peak windows can be 30–40% cheaper.`,
    },
    {
      question: `Which travel agents in ${city.name} offer Umrah packages on Searchumrah?`,
      answer: `Multiple KYC-verified agents serving pilgrims from ${city.name} and ${city.state} list their packages on Searchumrah. Browse the packages above to see each agent's name, rating, and contact details — you book directly with them, with no middlemen.`,
    },
    {
      question: `What documents do I need for Umrah from ${city.name}?`,
      answer: `You'll need a passport valid for at least 6 months from travel, recent passport-size photos, your vaccination certificate (Meningitis ACWY is mandatory), and the Saudi Umrah visa — which the agent typically arranges as part of the package. Female pilgrims under 45 traditionally require a Mahram (close male relative), though Saudi rules have relaxed for group bookings.`,
    },
    {
      question: `When is the best time to perform Umrah from ${city.name}?`,
      answer: `Weather-wise, November–February is the most comfortable. Spiritually, Ramadan carries the highest reward (and the highest price). Many pilgrims from ${city.name} pick the December school-holiday window or the Sept–Oct shoulder season for the best balance of cost, weather and crowd.`,
    },
    {
      question: `Can I book an Umrah package from ${city.name} without paying upfront on Searchumrah?`,
      answer: `Yes. Searchumrah does not collect any payment. You browse packages, contact the agent directly, and finalise pricing & payment with them — exactly the same way you would offline, but with verification, reviews and price comparison built in.`,
    },
  ];
}

const CityLandingPage = async ({ params }: PageParams) => {
  const city = getSeoCity(params.city);
  if (!city) notFound();

  const { packages, usedFallback } = await loadCityPackages(city.dbCitySlug);
  const faqs = cityFaqs(city);
  const related = getRelatedCities(city.urlSlug, 8);
  const canonicalUrl = `${BASE_URL}/umrah-packages-from-${city.urlSlug}`;
  const viewAllHref = `/packages?city=${city.dbCitySlug}`;

  // JSON-LD — three blocks for max SERP surface area:
  //   1. BreadcrumbList    → breadcrumb trail in Google results
  //   2. FAQPage           → rich-result FAQ accordion in SERPs
  //   3. ItemList          → tells Google these are listings, not articles
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Umrah Packages', item: `${BASE_URL}/packages` },
      {
        '@type': 'ListItem',
        position: 3,
        name: `Umrah Packages from ${city.name}`,
        item: canonicalUrl,
      },
    ],
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  const itemListLd = {
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
  };

  return (
    <main className="nc-CityLandingPage relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }}
      />
      {packages.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListLd) }}
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
              <li className="text-white">From {city.name}</li>
            </ol>
          </nav>

          <h1 className="font-light tracking-tight leading-[1.05] text-[28px] sm:text-[40px] lg:text-[52px] max-w-[22ch]">
            Umrah Packages from{' '}
            <em className="not-italic text-primary-200">{city.name}</em>
          </h1>
          <p className="mt-4 text-base lg:text-[17px] leading-relaxed text-primary-100 max-w-[60ch]">
            Compare verified Umrah packages departing from {city.name}, {city.state}. Transparent
            pricing, hotels near Haram in Makkah and Madinah, and direct contact with KYC-verified
            travel agents — no middlemen, no payment taken on Searchumrah.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={viewAllHref}
              className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-white text-primary-900 text-sm font-semibold hover:bg-primary-50"
            >
              View all packages from {city.name}
            </Link>
            <Link
              href="/packages"
              className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/15"
            >
              Compare all cities
            </Link>
          </div>
        </div>
      </section>

      {/* ============== TRUST BAR ============== */}
      <section className="relative z-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 py-5">
        <div className="container">
          <ul className="flex flex-wrap gap-y-3 gap-x-8 justify-between text-[13px] text-neutral-600 dark:text-neutral-300">
            <li>
              <b className="text-neutral-900 dark:text-neutral-100">KYC-verified</b> agents from{' '}
              {city.state}
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
                ? `Popular Umrah packages — also serving ${city.name}`
                : `Top Umrah packages from ${city.name}`}
            </h2>
            <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400">
              {usedFallback
                ? `We don't currently have packages listed with ${city.name} as the departure city. Browse popular packages nationwide — most agents can quote you a fare from ${city.name}.`
                : `Sorted by agent rating. Filter by hotel distance, price, month and more on the full listing page.`}
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
              No packages listed yet for {city.name}. Browse{' '}
              <Link href="/packages" className="text-primary-700 hover:underline">
                all Umrah packages
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

      {/* ============== CITY INTRO / WHAT TO EXPECT ============== */}
      <section className="bg-neutral-50 dark:bg-neutral-800/40 border-y border-neutral-200 dark:border-neutral-700 py-14 lg:py-20">
        <div className="container grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-16">
          <div>
            <span className="text-[12px] tracking-[0.12em] uppercase font-semibold text-primary-700 dark:text-primary-300">
              Umrah from {city.name}
            </span>
            <h2 className="mt-2 text-2xl lg:text-[34px] leading-[1.15] font-thin tracking-tight max-w-[22ch]">
              What pilgrims from {city.name} should know before booking.
            </h2>
            <div className="mt-6 space-y-4 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300 max-w-[62ch]">
              <p>
                {city.name} is one of India&rsquo;s key departure points for Umrah. Most packages
                from {city.airportCode ? `${city.airportCode} airport` : 'the city'} connect via Jeddah
                (JED) or Madinah (MED), with select non-stop options during peak season. Total trip
                length typically runs 7 to 21 days, with the most popular packages being 10–14 days
                covering both Makkah and Madinah.
              </p>
              <p>
                When comparing packages from {city.name}, focus on three things: distance of the
                Makkah hotel from Haram (walking distance under 500m is materially better for the
                elderly), distance of the Madinah hotel from Masjid an-Nabawi, and the sharing room
                configuration that fits your group. Use the filters on the listing page to lock these
                down before comparing prices.
              </p>
              <p>
                All agents on Searchumrah are KYC-verified — we don&rsquo;t take payment ourselves,
                so you contact the {city.state} agent directly, finalise terms, and pay them as you
                would offline. We&rsquo;re here to make discovery, comparison and reputation
                checking easier — not to sit in the middle of your booking.
              </p>
            </div>
          </div>

          <aside className="rounded-[24px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 p-7">
            <h3 className="text-lg font-semibold mb-4">Quick facts</h3>
            <dl className="space-y-3.5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">Departure city</dt>
                <dd className="font-medium">
                  {city.name}
                  {city.airportCode ? ` (${city.airportCode})` : ''}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">State</dt>
                <dd className="font-medium">{city.state}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">Typical duration</dt>
                <dd className="font-medium">10 – 14 days</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">Typical price range</dt>
                <dd className="font-medium">₹75K – ₹2.5L</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">Best season</dt>
                <dd className="font-medium">Nov – Feb</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-neutral-500 dark:text-neutral-400">Peak (most expensive)</dt>
                <dd className="font-medium">Ramadan</dd>
              </div>
            </dl>
            <Link
              href={viewAllHref}
              className="mt-6 inline-flex items-center justify-center w-full px-4 py-2.5 rounded-full bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800"
            >
              Browse packages from {city.name}
            </Link>
          </aside>
        </div>
      </section>

      {/* ============== FAQ ============== */}
      <section className="container py-14 lg:py-20">
        <h2 className="text-2xl lg:text-[34px] leading-[1.15] font-thin tracking-tight max-w-[24ch]">
          Frequently asked questions about Umrah from {city.name}
        </h2>
        <div className="mt-8 grid gap-4 lg:gap-5">
          {faqs.map((f) => (
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

      {/* ============== RELATED CITIES ============== */}
      <section className="bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-200 dark:border-neutral-700 py-14 lg:py-20">
        <div className="container">
          <h2 className="text-2xl lg:text-[34px] leading-[1.15] font-thin tracking-tight">
            Umrah packages from other cities
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Compare {city.state} departures with other major Indian cities.
          </p>
          <ul className="mt-7 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {related.map((c) => (
              <li key={c.urlSlug}>
                <Link
                  href={`/umrah-packages-from-${c.urlSlug}`}
                  className="block rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 hover:border-primary-400 hover:shadow-sm transition"
                >
                  <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Umrah from {c.name}
                  </div>
                  <div className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {c.state}
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

export default CityLandingPage;
