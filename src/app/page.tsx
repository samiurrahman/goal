import React from 'react';
import Link from 'next/link';
import SearchForm from '@/app/(client-components)/(PackageSearchForm)/SearchForm';
import HeroSearchTrigger from '@/components/HeroSearchTrigger';
import FeaturedPackagesSection from '@/app/(home-components)/FeaturedPackagesSection';
import HeroSkyline from '@/app/(home-components)/HeroSkyline';
import { fetchPackages } from '@/lib/queries/packages';
import type { Package } from '@/data/types';
import { SEO_CITIES } from '@/lib/seo/cities';

// ISR — refresh every 60s. Mutation handlers in the agent wizard also call
// /api/revalidate on /packages, so changes show up immediately as well.
export const revalidate = 60;

async function loadFeatured(): Promise<Package[]> {
  try {
    return await fetchPackages({
      payload: { year: new Date().getFullYear() },
      page: 0,
      pageSize: 12,
      sort: 'rating',
    });
  } catch {
    return [];
  }
}

async function PageHome() {
  const featured = await loadFeatured();

  return (
    <main className="nc-PageHome relative">
      {/* ============== HERO ============== */}
      {/*
        NOTE: `overflow-hidden` lives on the decorative wrapper below, NOT on
        the section itself. Otherwise the form's location/month popovers get
        clipped at the hero bottom and disappear behind the trust bar.
      */}
      <section
        className="relative text-white"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 0%, rgb(var(--c-primary-700)) 0%, rgb(var(--c-primary-900)) 70%)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Subtle dotted pattern overlay */}
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

          {/* Architectural skyline silhouette at the bottom */}
          <HeroSkyline />
        </div>

        <div className="container relative z-10 pt-10 pb-6 lg:pt-10 lg:pb-14">
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 pl-1.5 pr-4 py-1.5 text-xs font-medium text-primary-100 mb-5">
              <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-full bg-secondary-500 text-white text-[11px] font-bold">
                ✓
              </span>
              Every agent KYC-verified · zero middlemen
            </span>
          </div>

          <div className="flex justify-center items-center">
            <h1 className="font-light tracking-tight leading-[1.05] text-[22px] sm:text-[36px] lg:text-[48px] max-w-[18ch] text-center">
              Find a verified <em className="not-italic text-primary-200">Umrah</em> package, your
              way.
            </h1>
          </div>
          {/* <p className="mt-4 text-base lg:text-[14px] leading-relaxed text-primary-200 max-w-[56ch]">
            Compare Umrah packages from trusted agents across India. Transparent pricing, real
            reviews, direct agent contact — no resold leads.
          </p> */}

          {/* Desktop search */}
          <div className="hidden lg:block mt-6">
            <SearchForm />
          </div>

          {/* Mobile search trigger */}
          <div className="lg:hidden mt-6">
            <HeroSearchTrigger />
          </div>

          {/* Hero stats */}
          <dl className="mt-10 lg:mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-14 mx-auto justify-center max-w-screen-md text-center">
            {[
              { v: '540+', k: 'Verified agents' },
              { v: '38,400', k: 'Pilgrims served' },
              { v: '4.8 ★', k: 'Avg agent rating' },
              { v: '~ 4 hrs', k: 'Avg reply time' },
            ].map((stat) => (
              <div key={stat.k} className="flex flex-col items-center">
                <dt className="text-2xl lg:text-[30px] font-semibold tracking-tight text-white text-center">
                  {stat.v}
                </dt>
                <dd className="text-xs mt-1 text-primary-200 leading-snug text-center">{stat.k}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ============== TRUST BAR ============== */}
      {/*
        `relative z-0` keeps the trust-bar in its own stacking context at z=0
        so the hero's z-[60] search popovers always paint on top of it.
      */}
      <section className="relative z-0 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 py-6">
        <div className="container">
          <ul className="flex flex-wrap gap-y-4 gap-x-8 justify-between text-[13px] text-neutral-600 dark:text-neutral-300">
            <li className="flex items-center gap-2.5">
              <ShieldCheckIcon />
              <span>
                <b className="text-neutral-900 dark:text-neutral-100 font-semibold">KYC-verified</b>{' '}
                agents only
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <GlobeIcon />
              <span>
                Hajj Committee &amp;{' '}
                <b className="text-neutral-900 dark:text-neutral-100 font-semibold">
                  IATA-approved
                </b>{' '}
                partners
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <CompassIcon />
              <span>
                <b className="text-neutral-900 dark:text-neutral-100 font-semibold">No payment</b>{' '}
                taken on Searchumrah — pay agent directly
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <HomeIcon />
              <span>
                <b className="text-neutral-900 dark:text-neutral-100 font-semibold">Real reviews</b>{' '}
                from past pilgrims
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* ============== POPULAR DEPARTURE CITIES ============== */}
      {/*
        Surfaces the programmatic city landing pages from the homepage so they
        get PageRank flow from the most-linked page on the site. Pill row is
        intentionally compact (one horizontal scroll on mobile, single line on
        desktop) — not a full grid, since that would dilute the hero CTA. Each
        link's anchor text matches the destination page's H1 ("Umrah from {City}").
      */}
      <section className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 py-6 lg:py-8">
        <div className="container">
          <div className="flex items-center justify-between gap-4 mb-3.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400">
              Umrah from your city
            </h2>
            <Link
              href="/packages"
              className="text-[12px] font-medium text-primary-700 dark:text-primary-300 hover:underline"
            >
              All cities →
            </Link>
          </div>
          <ul className="flex flex-wrap gap-2 lg:gap-2.5">
            {SEO_CITIES.slice(0, 14).map((c) => (
              <li key={c.urlSlug}>
                <Link
                  href={`/umrah-packages-from-${c.urlSlug}`}
                  className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-primary-50 dark:hover:bg-primary-900/30 text-neutral-800 dark:text-neutral-200 hover:text-primary-800 dark:hover:text-primary-200 text-[13px] font-medium px-3.5 py-1.5 transition-colors"
                >
                  Umrah from {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============== FEATURED PACKAGES ============== */}
      <FeaturedPackagesSection packages={featured} />

      {/* ============== FOR AGENTS ============== */}
      <section className="relative overflow-hidden bg-primary-900 text-white py-16 lg:py-24">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 90% 10%, rgba(255,255,255,0.06) 0px, transparent 40%), radial-gradient(circle at 8% 90%, rgba(20,184,166,0.10) 0px, transparent 45%)',
          }}
        />
        <div className="container relative">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 lg:gap-20 items-center">
            <div>
              <span className="text-[12px] tracking-[0.12em] uppercase font-semibold text-secondary-400">
                For travel agents
              </span>
              <h2 className="mt-2 text-3xl lg:text-[44px] leading-[1.1] font-thin tracking-tight max-w-[16ch]">
                Reach pilgrims who already trust the platform.
              </h2>
              <p className="mt-4 text-base lg:text-[18px] leading-relaxed text-primary-200 max-w-[56ch]">
                List your Umrah packages on Searchumrah. We send you qualified inquiries — never
                resold, never shared. You stay in full control of pricing, communication, and
                bookings.
              </p>

              <ul className="mt-7 grid gap-3.5">
                {[
                  {
                    title: 'Free to list.',
                    body: 'No commision, no per-listing fee. We charge a flat Annual fee subscription.',
                  },
                  {
                    title: 'Direct inquiries.',
                    body: 'Pilgrim contact info comes straight to you — no middlemen, no shared leads.',
                  },
                  {
                    title: 'Verification badge.',
                    body: 'Once KYC is complete, your packages get the verified-agent label that pilgrims look for.',
                  },
                  {
                    title: 'Dashboard & reviews.',
                    body: 'Track inquiries, reply from one place, and build a public reputation backed by real pilgrims.',
                  },
                ].map((item) => (
                  <li
                    key={item.title}
                    className="flex gap-3 text-[15px] text-primary-100 leading-relaxed"
                  >
                    <CheckIcon />
                    <span>
                      <b className="text-white font-semibold">{item.title}</b> {item.body}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="rounded-[28px] bg-white/5 border border-white/10 p-8 backdrop-blur-sm">
              <h3 className="text-lg font-thin">What other agents are seeing</h3>
              <p className="text-[13px] text-primary-300 mt-1">
                Aggregated, last 12 months on Searchumrah
              </p>
              <div className="grid grid-cols-2 gap-1 py-5 border-b border-white/10 mb-5 mt-4">
                {[
                  { v: '+38%', k: 'Inquiry-to-booking rate vs WhatsApp' },
                  { v: '~ 4 hrs', k: 'Avg agent reply time' },
                  { v: '540+', k: 'Active verified agents' },
                  { v: '38,400', k: 'Pilgrims served' },
                ].map((stat) => (
                  <div key={stat.k}>
                    <div className="text-2xl font-semibold tracking-tight">{stat.v}</div>
                    <div className="text-[12px] text-primary-300 mt-0.5 leading-snug">{stat.k}</div>
                  </div>
                ))}
              </div>
              <p className="text-[15px] leading-relaxed text-primary-100 italic">
                &ldquo;In our first six months on Searchumrah we doubled our Umrah bookings, and
                every inquiry came with the pilgrim&apos;s full context — passport, dates, travelers
                — already filled in.&rdquo;
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary-500 flex items-center justify-center text-white font-semibold text-sm">
                  AN
                </div>
                <div>
                  <div className="text-sm font-light">Happy Agent</div>
                  <div className="text-[12px] text-primary-300 mt-0.5">Founder · Bangalore</div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}

const iconBase = 'w-5 h-5 text-secondary-6000 dark:text-secondary-400 flex-shrink-0';
const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ShieldCheckIcon = () => (
  <svg viewBox="0 0 24 24" className={iconBase} {...stroke}>
    <path d="M12 2 4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" className={iconBase} {...stroke}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);
const CompassIcon = () => (
  <svg viewBox="0 0 24 24" className={iconBase} {...stroke}>
    <path d="M12 1v6M12 17v6M4.2 4.2l4.3 4.3M15.5 15.5l4.3 4.3M1 12h6M17 12h6M4.2 19.8l4.3-4.3M15.5 8.5l4.3-4.3" />
  </svg>
);
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" className={iconBase} {...stroke}>
    <path d="M3 21V8l9-5 9 5v13" />
    <path d="M9 21V13h6v8" />
  </svg>
);
const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="flex-shrink-0 w-[22px] h-[22px] text-secondary-400 mt-0.5"
  >
    <path d="m5 12 5 5L20 7" />
  </svg>
);

export default PageHome;
