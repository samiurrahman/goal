import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { supabase } from '@/utils/supabaseClient';
import { getOptimizedImageUrl } from '@/lib/imageUrl';
import { SEO_CITIES } from '@/lib/seo/cities';

// Agencies directory — single landing page that lists every KYC-verified
// agent on Searchumrah. Built primarily as an SEO surface (hub page that
// links to all 257 agent profiles in one place, distributing PageRank from
// the high-authority root) and secondarily as a discovery surface for
// pilgrims who want to browse instead of search.
//
// Single page rather than paginated because:
//   1. The full list is small (sub-1MB even with 500+ agents)
//   2. A single page gives ALL agents a strong inbound link from the same
//      hub — paginated pages dilute the link equity across multiple URLs
//   3. Client-side city filter is faster than a server round-trip
//
// ISR — re-render hourly. New agents register infrequently; rating/review
// totals update via cache invalidation in the existing trigger.
export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.searchumrah.com';

type AgencyRow = {
  slug: string;
  name: string | null;
  known_as: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  profile_image: string | null;
  rating_avg: number | null;
  rating_total: number | null;
  is_gov_authorised: string | null;
};

export const metadata: Metadata = {
  title: 'All Verified Umrah Travel Agents in India',
  description:
    'Browse all KYC-verified Umrah travel agents on Searchumrah. Compare ratings, locations, and packages from trusted Indian agencies. No payment, direct contact.',
  keywords: [
    'Umrah travel agents',
    'verified Umrah agencies',
    'Umrah travel agencies India',
    'best Umrah agents',
    'KYC verified Hajj Umrah agents',
    'list of Umrah travel agencies',
  ],
  alternates: { canonical: '/agencies' },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/agencies`,
    title: 'All Verified Umrah Travel Agents in India',
    description:
      'Browse all KYC-verified Umrah travel agents on Searchumrah. Compare ratings and contact agencies directly.',
    siteName: 'Searchumrah',
    locale: 'en_IN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All Verified Umrah Travel Agents in India',
    description: 'Browse 500+ KYC-verified Umrah travel agencies.',
  },
};

async function loadAgencies(): Promise<AgencyRow[]> {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select(
        'slug, name, known_as, city, state, country, profile_image, rating_avg, rating_total, is_gov_authorised'
      )
      .not('slug', 'is', null);
    if (error) {
      console.warn('[agencies] fetch failed:', error.message);
      return [];
    }
    // Sort A-Z by display name. Use known_as if present, fall back to name.
    return ((data ?? []) as AgencyRow[]).sort((a, b) => {
      const an = (a.known_as || a.name || '').toLowerCase();
      const bn = (b.known_as || b.name || '').toLowerCase();
      return an.localeCompare(bn);
    });
  } catch (e) {
    console.warn('[agencies] fetch threw:', e instanceof Error ? e.message : String(e));
    return [];
  }
}

// Group agencies by first letter for A-Z navigation. Anything not starting
// with A-Z (numbers, non-Latin) gets bucketed under '#'.
function groupByLetter(agencies: AgencyRow[]): { letter: string; rows: AgencyRow[] }[] {
  const buckets = new Map<string, AgencyRow[]>();
  for (const a of agencies) {
    const name = a.known_as || a.name || '';
    const first = name.charAt(0).toUpperCase();
    const letter = /^[A-Z]$/.test(first) ? first : '#';
    if (!buckets.has(letter)) buckets.set(letter, []);
    buckets.get(letter)!.push(a);
  }
  // Stable order: # first, then A-Z alphabetical.
  const letters = Array.from(buckets.keys()).sort((a, b) => {
    if (a === '#') return -1;
    if (b === '#') return 1;
    return a.localeCompare(b);
  });
  return letters.map((letter) => ({ letter, rows: buckets.get(letter) || [] }));
}

const AgenciesPage = async () => {
  const agencies = await loadAgencies();
  const groups = groupByLetter(agencies);
  const lettersUsed = groups.map((g) => g.letter);

  // Build city list for the secondary nav. Restricts to cities that have a
  // curated SEO landing page in src/lib/seo/cities.ts — otherwise the
  // links 404. Match the agent's free-form `city` against each curated
  // entry by case-insensitive substring (covers "New Delhi" ↔ "Delhi",
  // "Bengaluru" ↔ "Bangalore" via the SEO entry's name/urlSlug variants).
  const cityFrequency = new Map<string, { name: string; urlSlug: string; count: number }>();
  for (const a of agencies) {
    const c = (a.city || '').trim();
    if (!c) continue;
    const lower = c.toLowerCase();
    const matched = SEO_CITIES.find(
      (sc) =>
        lower === sc.name.toLowerCase() ||
        lower === sc.urlSlug ||
        lower.includes(sc.urlSlug) ||
        sc.name.toLowerCase().includes(lower)
    );
    if (!matched) continue;
    const existing = cityFrequency.get(matched.urlSlug);
    if (existing) {
      existing.count += 1;
    } else {
      cityFrequency.set(matched.urlSlug, {
        name: matched.name,
        urlSlug: matched.urlSlug,
        count: 1,
      });
    }
  }
  const topCities = Array.from(cityFrequency.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  // CollectionPage + ItemList JSON-LD. ItemList itemListElement is capped
  // at 100 to stay under Google's documented ItemList size limit and keep
  // the JSON-LD blob reasonable in size; the full list is still on the
  // page itself, just not all repeated in the schema.
  const collectionLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'All Verified Umrah Travel Agents in India',
    url: `${SITE_URL}/agencies`,
    description:
      'Directory of all KYC-verified Umrah travel agents and agencies on Searchumrah.',
    isPartOf: { '@type': 'WebSite', name: 'Searchumrah', url: SITE_URL },
  };
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: agencies.length,
    itemListElement: agencies.slice(0, 100).map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE_URL}/${a.slug}`,
      name: a.known_as || a.name || a.slug,
    })),
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Agencies', item: `${SITE_URL}/agencies` },
    ],
  };

  return (
    <main className="nc-AgenciesPage relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(collectionLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbLd) }}
      />

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

        <div className="container relative z-10 pt-10 pb-10 lg:pt-12 lg:pb-14">
          <nav className="mb-5 text-xs text-primary-200" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden>›</li>
              <li className="text-white">Agencies</li>
            </ol>
          </nav>

          <h1 className="font-light tracking-tight leading-[1.05] text-[28px] sm:text-[40px] lg:text-[52px] max-w-[24ch]">
            All verified Umrah <em className="not-italic text-primary-200">travel agencies</em>
          </h1>
          <p className="mt-4 text-base lg:text-[17px] leading-relaxed text-primary-100 max-w-[62ch]">
            {agencies.length > 0
              ? `Browse all ${agencies.length} KYC-verified Umrah travel agents on Searchumrah. Compare ratings, locations, and packages. Contact agents directly — no middlemen.`
              : 'KYC-verified Umrah travel agents from across India. Compare ratings and contact agencies directly.'}
          </p>
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
              <b className="text-neutral-900 dark:text-neutral-100">No payment</b> taken on Searchumrah
            </li>
            <li>
              <b className="text-neutral-900 dark:text-neutral-100">Real reviews</b> from past
              pilgrims
            </li>
            <li>
              <b className="text-neutral-900 dark:text-neutral-100">Direct contact</b> with the
              agency
            </li>
          </ul>
        </div>
      </section>

      {/* ============== A-Z NAV ============== */}
      {lettersUsed.length > 1 ? (
        <section className="container pt-8 lg:pt-10">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 lg:p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400 mb-2.5">
              Jump to letter
            </h2>
            <ul className="flex flex-wrap gap-1.5 lg:gap-2">
              {lettersUsed.map((l) => (
                <li key={l}>
                  <a
                    href={`#letter-${l}`}
                    className="inline-flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-primary-100 dark:hover:bg-primary-900/40 text-neutral-800 dark:text-neutral-200 hover:text-primary-800 dark:hover:text-primary-200 text-sm font-semibold transition-colors"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* ============== AGENCIES LIST ============== */}
      <section className="container py-8 lg:py-10">
        {agencies.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-10 text-center text-neutral-600 dark:text-neutral-400">
            <p className="text-sm">
              Agencies directory is loading. Browse{' '}
              <Link href="/packages" className="text-primary-700 hover:underline">
                Umrah packages
              </Link>{' '}
              meanwhile.
            </p>
          </div>
        ) : (
          <div className="space-y-10 lg:space-y-12">
            {groups.map((group) => (
              <div key={group.letter} id={`letter-${group.letter}`}>
                <h2 className="text-2xl lg:text-3xl font-thin tracking-tight text-neutral-900 dark:text-neutral-100 mb-4 lg:mb-5">
                  {group.letter}
                  <span className="ml-3 text-sm font-normal text-neutral-500 dark:text-neutral-400">
                    {group.rows.length} {group.rows.length === 1 ? 'agency' : 'agencies'}
                  </span>
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 lg:gap-4">
                  {group.rows.map((a) => {
                    const displayName = a.known_as || a.name || a.slug;
                    const location = [a.city, a.state].filter(Boolean).join(', ');
                    const rating = Number(a.rating_avg ?? 0);
                    const total = Number(a.rating_total ?? 0);
                    const isGovVerified = ['true', '1', 'yes', 'y'].includes(
                      String(a.is_gov_authorised ?? '').toLowerCase().trim()
                    );
                    return (
                      <li key={a.slug}>
                        <Link
                          href={`/${a.slug}`}
                          className="group flex items-start gap-3.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:border-primary-400 hover:shadow-md transition p-3.5"
                        >
                          {a.profile_image ? (
                            <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                              <Image
                                src={
                                  getOptimizedImageUrl(a.profile_image, {
                                    width: 112,
                                    height: 112,
                                    resize: 'cover',
                                    quality: 70,
                                  }) || a.profile_image
                                }
                                alt={displayName}
                                fill
                                className="object-cover"
                                sizes="56px"
                                quality={70}
                              />
                            </div>
                          ) : (
                            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-700 to-primary-900 text-white text-base font-semibold">
                              {displayName
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((w) => w[0]?.toUpperCase() || '')
                                .join('') || '?'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-semibold leading-snug text-neutral-900 dark:text-neutral-100 group-hover:text-primary-800 dark:group-hover:text-primary-300 line-clamp-2">
                                {displayName}
                              </h3>
                              {isGovVerified ? (
                                <span
                                  className="flex-shrink-0 text-[10px] font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1.5 py-0.5"
                                  title="Government authorised"
                                >
                                  GOV
                                </span>
                              ) : null}
                            </div>
                            {location ? (
                              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                {location}
                              </p>
                            ) : null}
                            <p className="mt-1.5 text-[12px] text-neutral-600 dark:text-neutral-300">
                              {total > 0 ? (
                                <>
                                  <span className="text-amber-500">★</span>{' '}
                                  <span className="font-medium">{rating.toFixed(1)}</span>{' '}
                                  <span className="text-neutral-500">
                                    · {total} review{total === 1 ? '' : 's'}
                                  </span>
                                </>
                              ) : (
                                <span className="text-neutral-500">New on Searchumrah</span>
                              )}
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============== BROWSE BY CITY ============== */}
      {topCities.length > 0 ? (
        <section className="bg-neutral-50 dark:bg-neutral-800/40 border-t border-neutral-200 dark:border-neutral-700 py-12 lg:py-16">
          <div className="container">
            <h2 className="text-xl lg:text-2xl font-thin tracking-tight text-neutral-900 dark:text-neutral-100">
              Browse Umrah agencies by city
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              The top cities our verified agents are based in, ranked by number of agencies.
            </p>
            <ul className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {topCities.map((c) => (
                <li key={c.urlSlug}>
                  <Link
                    href={`/umrah-packages-from-${c.urlSlug}`}
                    className="block rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 hover:border-primary-400 hover:shadow-sm transition"
                  >
                    <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      Umrah from {c.name}
                    </div>
                    <div className="text-[12px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {c.count} {c.count === 1 ? 'agency' : 'agencies'}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </main>
  );
};

export default AgenciesPage;
