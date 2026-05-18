import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { safeJsonLd } from '@/lib/safeJsonLd';
import { Amenities_demos } from '../(components)/constant';
import Breadcrumb from '@/components/Breadcrumb';
import Iternary from '../(components)/Iternary';
import type { IternaryItemProps, IternaryIconId } from '../(components)/IternaryItem';
import PackageMeta from '../(components)/PackageMeta';
import Policies from '../(components)/Policies';
import HostInformation from '../(components)/HostInformation';
import AmenitiesSection from '../(components)/AmenitiesSection';
import PackageInfo from '../(components)/PackageInfo';
import MobileFooterSticky from '../(components)/MobileFooterSticky';
import PurchaseSummaryInteractive from '../(components)/PurchaseSummaryInteractive';
import Packages from '@/app/packages/components/packages';
import type { Package, PackageDetails } from '@/data/types';
import { supabase } from '@/utils/supabaseClient';
import { notFound } from 'next/navigation';
import {
  sanitizeHotelAmenities,
  sanitizeHotelStars,
  type HotelAmenityKey,
} from '@/constants/hotelAmenities';
import { SEO_CITIES } from '@/lib/seo/cities';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.searchumrah.com';

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const clampText = (text: string, max = 160) => {
  const clean = stripHtml(text);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
};

// ISR — re-render at most once per minute. Edits from the agent's wizard
// trigger an immediate revalidatePath via /api/revalidate so changes show up
// without waiting the full 60s window.
export const revalidate = 60;

type RoomRate = { value: string; people: number; default: boolean };

export interface PackageDetailProps {
  params: { agentName: string; slug: string };
  searchParams?: {
    guests?: string;
    sharing?: string;
  };
}

export const generateMetadata = async ({ params }: PackageDetailProps): Promise<Metadata> => {
  const { agentName, slug } = params;

  const { data: packageData } = await supabase
    .from('packages')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  const pkg = packageData as Package | null;
  const packageUrl = `${SITE_URL}/${agentName}/${slug}`;

  if (!pkg) {
    return {
      title: 'Package Not Found',
      description: 'The requested Umrah package could not be found.',
      alternates: { canonical: packageUrl },
    };
  }

  // Don't append "| Searchumrah" here — the root layout's title.template
  // appends it automatically. Including it inline produced a double-brand
  // title (e.g. "X — 14 Days | Searchumrah | Searchumrah") in SERPs.
  //
  // Front-load the package name (matches branded/exact-title queries), then
  // duration + departure city — the two strongest non-branded buying-intent
  // qualifiers Google has shown for the long-tail "{N}-day Umrah from {city}"
  // search pattern.
  const titleParts = [
    pkg.title,
    pkg.total_duration_days ? `${pkg.total_duration_days}-Day Umrah Package` : '',
    pkg.departure_city ? `from ${pkg.departure_city}` : '',
  ].filter(Boolean);
  const title = titleParts.length > 1 ? `${titleParts[0]} — ${titleParts.slice(1).join(' ')}` : titleParts[0];

  // Two-sentence narrative: short_description (or a synthesized lede) sets the
  // hook; a second sentence lists the concrete facts a buyer cares about
  // (Makkah/Madinah split, departure city, price). Modeled on GetYourGuide's
  // OG style — reads like prose rather than dot-separated tags.
  const lede = stripHtml(pkg.short_description || '').replace(/[.\s]+$/, '');
  const synthesizedLede = `${pkg.total_duration_days || ''}-day Umrah package${
    pkg.agent_name ? ` by ${pkg.agent_name}` : ''
  }`.trim();

  const factParts: string[] = [];
  if (pkg.makkah_days && pkg.madinah_days) {
    factParts.push(`${pkg.makkah_days} days in Makkah and ${pkg.madinah_days} in Madinah`);
  }
  if (pkg.departure_city) {
    factParts.push(`departing from ${pkg.departure_city}`);
  }
  let factsSentence = factParts.length > 0 ? `Includes ${factParts.join(', ')}.` : '';
  if (pkg.price_per_person) {
    factsSentence += `${factsSentence ? ' ' : ''}From ${
      pkg.currency || 'INR'
    } ${Number(pkg.price_per_person).toLocaleString('en-IN')} per person.`;
  }

  const description = clampText(
    [`${lede || synthesizedLede}.`, factsSentence].filter(Boolean).join(' '),
    220
  );

  // Keyword set blends package-specific facts with the high-volume
  // long-tail queries pilgrims actually search. Deduped + lowercased so we
  // don't bloat the meta tag with duplicate variants.
  const keywordSet = new Set<string>();
  const pushKw = (k: string | null | undefined) => {
    const v = (k || '').trim();
    if (v) keywordSet.add(v);
  };
  pushKw(pkg.title);
  pushKw(`${pkg.total_duration_days} day Umrah package`);
  pushKw(`${pkg.total_duration_days} days Umrah`);
  pushKw(pkg.agent_name);
  pushKw('Umrah package');
  pushKw('Umrah package India');
  if (pkg.departure_city) {
    pushKw(`Umrah from ${pkg.departure_city}`);
    pushKw(`Umrah packages from ${pkg.departure_city}`);
    pushKw(`Umrah price ${pkg.departure_city}`);
  }
  pushKw(pkg.makkah_hotel_name);
  pushKw(pkg.madinah_hotel_name);

  return {
    title,
    description,
    keywords: Array.from(keywordSet),
    alternates: { canonical: packageUrl },
    openGraph: {
      title,
      description,
      type: 'website',
      url: packageUrl,
      siteName: 'Searchumrah',
      locale: 'en_IN',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    other: {
      // Domain-specific signals for crawlers that key off them. Harmless to
      // legitimate users; ignored by browsers.
      'article:section': 'Umrah Packages',
      ...(pkg.departure_city ? { 'geo.region': 'IN' } : {}),
    },
  };
};

const parseJson = <T,>(raw: unknown, fallback: T): T => {
  try {
    if (!raw) return fallback;
    return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T);
  } catch {
    return fallback;
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const isUuid = (value?: string | null) =>
  !!value &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const formatJoinedText = (createdAt?: string | null) => {
  if (!createdAt) return 'Joined recently';
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return 'Joined recently';
  return `Joined in ${parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
};

const PackageDetail = async ({ params, searchParams }: PackageDetailProps) => {
  const { agentName, slug } = params;
  type AgentMetaRow = {
    profile_image?: string | null;
    auth_user_id?: string | null;
    rating_avg?: number | null;
    rating_total?: number | null;
    known_as?: string | null;
    about_us?: string | null;
    created_at?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  };

  // Fetch agent + candidate packages in parallel (no dependency between them)
  const [agentResult, packagesResult] = await Promise.all([
    supabase
      .from('agents')
      .select(
        'profile_image, auth_user_id, rating_avg, rating_total, known_as, about_us, created_at, city, state, country'
      )
      .ilike('slug', agentName)
      .limit(1),
    // packages_with_agent exposes agent fields + package_location sourced
    // from agents.city, so renames/city-changes are reflected immediately.
    supabase.from('packages_with_agent').select('*').ilike('slug', slug).limit(5),
  ]);

  const agentRow = Array.isArray(agentResult.data) ? agentResult.data[0] : null;
  const agentData: AgentMetaRow | null = agentRow
    ? {
        profile_image: (agentRow as AgentMetaRow).profile_image ?? null,
        auth_user_id: (agentRow as AgentMetaRow).auth_user_id ?? null,
        rating_avg: (agentRow as AgentMetaRow).rating_avg ?? null,
        rating_total: (agentRow as AgentMetaRow).rating_total ?? null,
        known_as: (agentRow as AgentMetaRow).known_as ?? null,
        about_us: (agentRow as AgentMetaRow).about_us ?? null,
        created_at: (agentRow as AgentMetaRow).created_at ?? null,
        city: (agentRow as AgentMetaRow).city ?? null,
        state: (agentRow as AgentMetaRow).state ?? null,
        country: (agentRow as AgentMetaRow).country ?? null,
      }
    : null;

  const agentProfileImage = (agentData?.profile_image as string | null | undefined) ?? null;
  const agentAuthUserId = (agentData?.auth_user_id as string | null | undefined) ?? null;
  const agentRatingPoint = Number(agentData?.rating_avg ?? 0);
  const agentReviewCount = Number(agentData?.rating_total ?? 0);

  // Pick the best matching package: prefer agent_name match, then agent_id match, then any
  const candidatePackages = (packagesResult.data ?? []) as Array<{
    agent_name?: string | null;
    agent_id?: string | null;
  }>;
  const lowerAgentName = agentName.toLowerCase();
  const packageData =
    candidatePackages.find(
      (p) => (p.agent_name || '').toLowerCase() === lowerAgentName
    ) ??
    (isUuid(agentAuthUserId)
      ? candidatePackages.find((p) => String(p.agent_id || '') === String(agentAuthUserId))
      : undefined) ??
    candidatePackages[0] ??
    null;

  if (!packageData) {
    notFound();
  }

  // Now fetch package_details, top reviews, and two "related packages" lists
  // in parallel. The related lists give the package page somewhere to send
  // both users and crawlers — without them the page is a dead-end for the
  // internal link graph. Reviews feed the Review JSON-LD block; details
  // feed the main content; related lists feed the bottom-of-page rails.
  // Any of the four can fail without blocking render (they degrade to empty).
  const currentPkgId = (packageData as { id: number | string }).id;
  const currentDepartureCity =
    (packageData as { departure_city?: string | null }).departure_city || null;
  const currentDuration = Number(
    (packageData as { total_duration_days?: number | null }).total_duration_days ?? 0
  );

  const RELATED_FIELDS =
    'id, slug, title, agent_name, agent_known_as, agent_profile_image, agent_rating_avg, agent_rating_total, thumbnail_url, thumbnail_blur, price_per_person, currency, default_pricing, sharing_rate, total_duration_days, departure_city, arrival_city, departure_date, arrival_date, package_location, makkah_hotel_name, makkah_hotel_distance_m, madinah_hotel_name, madinah_hotel_distance_m';

  const [detailsResult, reviewsResult, relatedByCityResult, relatedByDurationResult] =
    await Promise.all([
      supabase
        .from('package_details')
        .select('*')
        .eq('package_id', currentPkgId)
        .limit(1),
      agentAuthUserId
        ? supabase
            .from('agent_reviews')
            .select('id, rating, review_text, user_name, is_anonymous, created_at')
            .eq('agent_id', agentAuthUserId)
            .gt('rating', 0)
            .order('created_at', { ascending: false })
            .limit(5)
        : Promise.resolve({ data: [] as Array<{
            id: number;
            rating: number;
            review_text: string | null;
            user_name: string | null;
            is_anonymous: boolean | null;
            created_at: string | null;
          }>, error: null }),
      // Related by departure city — same city, different package. Mixed
      // agents on purpose so the user gets genuine alternatives, not just
      // the current agent's catalog (which is already linked via HostInfo).
      currentDepartureCity
        ? supabase
            .from('packages_with_agent')
            .select(RELATED_FIELDS)
            .eq('published', true)
            .eq('departure_city', currentDepartureCity)
            .neq('id', currentPkgId)
            .order('agent_rating_avg', { ascending: false, nullsFirst: false })
            .limit(4)
        : Promise.resolve({ data: [] as Package[], error: null }),
      // Related by duration ±2 days. A pilgrim eyeing a 10-day trip is the
      // same buyer evaluating 8- and 12-day options; this is the most
      // commonly relevant alternative axis after departure city.
      currentDuration > 0
        ? supabase
            .from('packages_with_agent')
            .select(RELATED_FIELDS)
            .eq('published', true)
            .gte('total_duration_days', currentDuration - 2)
            .lte('total_duration_days', currentDuration + 2)
            .neq('id', currentPkgId)
            .order('agent_rating_avg', { ascending: false, nullsFirst: false })
            .limit(4)
        : Promise.resolve({ data: [] as Package[], error: null }),
    ]);

  const details = Array.isArray(detailsResult.data) ? detailsResult.data[0] : null;
  const topReviews = (Array.isArray(reviewsResult.data) ? reviewsResult.data : []) as Array<{
    id: number;
    rating: number;
    review_text: string | null;
    user_name: string | null;
    is_anonymous: boolean | null;
    created_at: string | null;
  }>;

  const package_details = {
    ...(packageData as object),
    details: details ?? null,
  } as PackageDetails;

  // Normalize related-packages results. Both queries may fail gracefully —
  // an empty array is the right fallback (the rails just don't render).
  // Deduplicate by id so a package matching BOTH rails only appears once,
  // and ensure the current package never sneaks in.
  const relatedByCity = (Array.isArray(relatedByCityResult.data)
    ? relatedByCityResult.data
    : []) as Package[];
  const relatedByDuration = (Array.isArray(relatedByDurationResult.data)
    ? relatedByDurationResult.data
    : []) as Package[];
  const cityRailIds = new Set(relatedByCity.map((p) => p.id));
  const durationRail = relatedByDuration.filter(
    (p) => !cityRailIds.has(p.id) && p.id !== currentPkgId
  );

  // Contextual landing-page links — these match the current package against
  // the SEO landing pages we've built (city + duration + season facets) and
  // surface the relevant ones. A 10-day Ramadan package from Mumbai gets
  // three links: city, duration, season. Each link reinforces the cluster
  // by giving Google a clear path from the long-tail detail page back up
  // to the broader topic hubs.
  const exploreLinks: { href: string; label: string }[] = [];

  // City match — only when the departure city has a curated SEO landing page.
  // Match by lowercase contains so "New Delhi" matches "delhi", etc. Cheap
  // O(N) scan over the 25-entry city registry; not worth indexing.
  if (currentDepartureCity) {
    const cityKey = currentDepartureCity.toLowerCase();
    const matchedCity = SEO_CITIES.find(
      (c) =>
        cityKey === c.name.toLowerCase() ||
        cityKey === c.urlSlug ||
        cityKey.includes(c.urlSlug) ||
        c.name.toLowerCase().includes(cityKey)
    );
    if (matchedCity) {
      exploreLinks.push({
        href: `/umrah-packages-from-${matchedCity.urlSlug}`,
        label: `Umrah packages from ${matchedCity.name}`,
      });
    }
  }

  // Duration match — round to the nearest 7/10/14/21 day landing page.
  if (currentDuration > 0) {
    const durationBuckets = [
      { days: 7, slug: '7-day-umrah-package', label: '7-day Umrah packages' },
      { days: 10, slug: '10-day-umrah-package', label: '10-day Umrah packages' },
      { days: 14, slug: '14-day-umrah-package', label: '14-day Umrah packages' },
      { days: 21, slug: '21-day-umrah-package', label: '21-day Umrah packages' },
    ];
    // Match within ±1 day of an exact bucket — anything further is a
    // misleading link (a 16-day package shouldn't suggest "14-day packages").
    const matched = durationBuckets.find((b) => Math.abs(b.days - currentDuration) <= 1);
    if (matched) {
      exploreLinks.push({ href: `/${matched.slug}`, label: matched.label });
    }
  }

  // Season match — based on the package's departure date, link to the
  // relevant season facet. Ramadan windows take priority since they're the
  // highest-intent search; December and winter as fallbacks.
  const departureDateRaw = (packageData as { departure_date?: string | null }).departure_date;
  if (departureDateRaw) {
    const dep = new Date(departureDateRaw);
    if (!Number.isNaN(dep.getTime())) {
      const month = dep.getMonth() + 1; // 1-12
      const year = dep.getFullYear();
      if ((month === 2 || month === 3) && year === 2026) {
        exploreLinks.push({
          href: '/ramadan-umrah-2026',
          label: 'Ramadan Umrah packages 2026',
        });
      } else if ((month === 2 || month === 3) && year === 2027) {
        exploreLinks.push({
          href: '/ramadan-umrah-2027',
          label: 'Ramadan Umrah packages 2027',
        });
      } else if (month === 12) {
        exploreLinks.push({
          href: '/december-umrah-packages',
          label: 'December Umrah packages',
        });
      } else if ([11, 1, 2].includes(month)) {
        exploreLinks.push({
          href: '/winter-umrah-packages',
          label: 'Winter Umrah packages',
        });
      }
    }
  }

  // Hotel-distance match — close-to-Haram packages get the distance landing
  // page. 500m is the threshold we use on /umrah-packages-near-haram itself.
  const makkahDist = Number(
    (packageData as { makkah_hotel_distance_m?: number | null }).makkah_hotel_distance_m ?? NaN
  );
  if (Number.isFinite(makkahDist) && makkahDist > 0 && makkahDist <= 500) {
    exploreLinks.push({
      href: '/umrah-packages-near-haram',
      label: 'Umrah packages with hotels near the Haram',
    });
  }

  const sharingRateList = (() => {
    const purchaseSummaryRates = parseJson<{ rates?: RoomRate[] }>(
      package_details?.details?.purchase_summary,
      {}
    )?.rates;
    if (Array.isArray(purchaseSummaryRates) && purchaseSummaryRates.length > 0) {
      return purchaseSummaryRates;
    }

    const legacySharingRates = parseJson<{
      json?: { rates?: RoomRate[] };
      rates?: RoomRate[];
    }>(package_details?.sharing_rate, {});
    return legacySharingRates?.json?.rates ?? legacySharingRates?.rates ?? [];
  })();

  const defaultRate = sharingRateList.find((rate) => rate.default) ?? sharingRateList[0];
  const sharingFromQuery = Number(searchParams?.sharing ?? defaultRate?.people ?? 5);
  const sharingCount = clamp(Number.isFinite(sharingFromQuery) ? sharingFromQuery : 5, 2, 5);
  const selectedRate = sharingRateList.find((rate) => rate.people === sharingCount) ?? defaultRate;

  const guestsFromQuery = Number(searchParams?.guests ?? 1);
  const numberOfGuests = clamp(Number.isFinite(guestsFromQuery) ? guestsFromQuery : 1, 1, 20);

  const parsedSharing = parseJson<{ people?: number }>(package_details?.default_pricing, {});
  const sharingPeopleForMeta = Number(
    parsedSharing?.people ?? defaultRate?.people ?? sharingCount ?? 5
  );

  const packageMetaData = {
    packageId: package_details?.id ? String(package_details.id) : null,
    title: package_details?.title ?? 'Untitled Package',
    thumbnailUrl: (package_details as { thumbnail_url?: string | null })?.thumbnail_url ?? null,
    thumbnailBlur:
      (package_details as { thumbnail_blur?: string | null })?.thumbnail_blur ?? null,
    totalDurationDays: package_details?.total_duration_days ?? null,
    sharingPeople: sharingPeopleForMeta,
    packageLocation: package_details?.package_location ?? 'Unknown Location',
    packageAdmin1Name:
      (package_details as { package_admin1_name?: string | null })?.package_admin1_name ?? null,
    agentState:
      (package_details as { agent_state?: string | null })?.agent_state ?? agentData?.state ?? null,
    agentCountry:
      (package_details as { agent_country?: string | null })?.agent_country ??
      agentData?.country ??
      null,
    makkahHotelName: package_details?.makkah_hotel_name ?? '',
    makkahHotelDistanceM: package_details?.makkah_hotel_distance_m ?? null,
    madinahHotelName: package_details?.madinah_hotel_name ?? '',
    madinahHotelDistanceM: package_details?.madinah_hotel_distance_m ?? null,
    departureCity: package_details?.departure_city ?? '',
    arrivalCity: package_details?.arrival_city ?? '',
    departureDate: package_details?.departure_date ?? '',
    arrivalDate: package_details?.arrival_date ?? '',
    agentSlug: agentName,
    agentDisplayName:
      String(agentData?.known_as || '').trim() ||
      String(package_details?.agent_name || '').trim() ||
      'Agent',
    agentProfileImage: agentProfileImage,
    agentRatingPoint,
    agentReviewCount,
    shareUrl: `/${agentName}/${slug}`,
    tags: (package_details as { tags?: string[] | null })?.tags ?? null,
  };

  const hostLocationText = [agentData?.city, agentData?.state, agentData?.country]
    .filter((value) => String(value || '').trim().length > 0)
    .join(', ');

  const hostData = {
    name:
      String(agentData?.known_as || '').trim() ||
      String(package_details?.agent_name || '').trim() ||
      'Host',
    places: 0,
    description:
      String(agentData?.about_us || '').trim() ||
      'Trusted travel partner for your pilgrimage journey.',
    descriptionHtml: String(agentData?.about_us || '').trim() || undefined,
    joined: formatJoinedText(agentData?.created_at),
    location: hostLocationText || undefined,
    responseRate: 'N/A',
    responseTime: 'Contact host for response time',
    profileUrl: agentName,
    profileImage: agentProfileImage,
    ratingPoint: agentRatingPoint,
    reviewCount: agentReviewCount,
  };

  const rawIternaryPayload = parseJson<unknown>(package_details?.details?.iternary, []);
  const payloadObj = (rawIternaryPayload || {}) as Record<string, unknown>;
  const payloadJson = (payloadObj.json || {}) as Record<string, unknown>;
  const normalizedIternarySource = Array.isArray(rawIternaryPayload)
    ? rawIternaryPayload
    : Array.isArray(payloadObj.iternary)
      ? payloadObj.iternary
      : Array.isArray(payloadObj.itinerary)
        ? payloadObj.itinerary
        : Array.isArray(payloadJson.iternary)
          ? payloadJson.iternary
          : Array.isArray(payloadJson.itinerary)
            ? payloadJson.itinerary
            : [];

  // Itinerary is stored as a JSON array. New-format entries carry a `kind`
  // ('flight' | 'day'); legacy entries (saved before the flight-block redesign)
  // have none and are mapped to day rows so live packages keep rendering until
  // the agent re-saves them through the updated wizard.
  const iternaryData: IternaryItemProps[] = Array.isArray(normalizedIternarySource)
    ? normalizedIternarySource
        .map((item): IternaryItemProps | null => {
          const row = (item || {}) as Record<string, unknown>;
          const kind = String(row.kind || '').trim();

          if (kind === 'flight') {
            return {
              kind: 'flight',
              position: String(row.position || '').trim() === 'end' ? 'end' : 'start',
              dayLabel: String(row.dayLabel || ''),
              subtitle: String(row.subtitle || ''),
              departureCity: String(row.departureCity || ''),
              stops: String(row.stops || ''),
              arrivalCity: String(row.arrivalCity || ''),
              departureTime: String(row.departureTime || ''),
              arrivalTime: String(row.arrivalTime || ''),
              flightInfo: String(row.flightInfo || row.flight_info || ''),
            };
          }

          if (kind === 'day') {
            return {
              kind: 'day',
              dayLabel: String(row.dayLabel || ''),
              subtitle: String(row.subtitle || ''),
              title: String(row.title || ''),
              description: String(row.description || ''),
              icon: (String(row.icon || '').trim() || '') as IternaryIconId | '',
            };
          }

          // Legacy entry — fold the old flat fields into a day row.
          const fromLocation = String(row.fromLocation || row.from_location || '');
          const toLocation = String(row.toLocation || row.to_location || '');
          const legacyTitle =
            fromLocation && toLocation
              ? `${fromLocation} → ${toLocation}`
              : fromLocation || toLocation;
          const legacyText = [
            String(
              row.nextLegLabel ||
                row.next_leg_label ||
                row.separatorLabel ||
                row.separator_label ||
                ''
            ).trim(),
            [
              String(row.tripTime || row.trip_time || '').trim(),
              String(row.flightInfo || row.flight_info || '').trim(),
            ]
              .filter(Boolean)
              .join(' · '),
          ]
            .filter(Boolean)
            .join(' — ');

          return {
            kind: 'day',
            dayLabel: String(row.fromDate || row.from_date || ''),
            subtitle: '',
            title: legacyTitle,
            description: legacyText ? `<p>${legacyText}</p>` : '',
            icon: (String(row.icon || '').trim() || '') as IternaryIconId | '',
          };
        })
        .filter((entry): entry is IternaryItemProps => entry !== null)
    : [];
  const rawStayInfoData = parseJson<{
    title?: string;
    details?: string[];
    content_html?: string;
    contentHtml?: string;
    content?: string;
    lede?: string;
    subheading?: string;
    hotels?: {
      makkah?: { stars?: unknown; amenities?: unknown };
      madinah?: { stars?: unknown; amenities?: unknown };
    };
  }>(package_details?.details?.stay_information, {
    title: 'Stay information',
    details: [],
    content_html: '',
  });
  const stayInfoData = {
    title: rawStayInfoData.title || 'Stay information',
    details: Array.isArray(rawStayInfoData.details) ? rawStayInfoData.details : [],
    contentHtml:
      rawStayInfoData.contentHtml || rawStayInfoData.content_html || rawStayInfoData.content || '',
    lede: String(rawStayInfoData.lede || rawStayInfoData.subheading || ''),
  };
  const makkahHotelMeta: { stars: number | null; amenities: HotelAmenityKey[] } = {
    stars: sanitizeHotelStars(rawStayInfoData.hotels?.makkah?.stars),
    amenities: sanitizeHotelAmenities(rawStayInfoData.hotels?.makkah?.amenities),
  };
  const madinahHotelMeta: { stars: number | null; amenities: HotelAmenityKey[] } = {
    stars: sanitizeHotelStars(rawStayInfoData.hotels?.madinah?.stars),
    amenities: sanitizeHotelAmenities(rawStayInfoData.hotels?.madinah?.amenities),
  };
  const rawPoliciesData = parseJson<Record<string, unknown>>(
    package_details?.details?.policies,
    {}
  );
  const policiesData = {
    cancellation: String(rawPoliciesData.cancellation || rawPoliciesData.cancellation_policy || ''),
    checkIn: String(
      rawPoliciesData.checkIn || rawPoliciesData.check_in || rawPoliciesData.checkin || ''
    ),
    checkOut: String(
      rawPoliciesData.checkOut || rawPoliciesData.check_out || rawPoliciesData.checkout || ''
    ),
    notes: Array.isArray(rawPoliciesData.notes)
      ? (rawPoliciesData.notes as unknown[]).map((item) => String(item || ''))
      : Array.isArray(rawPoliciesData.special_notes)
        ? (rawPoliciesData.special_notes as unknown[]).map((item) => String(item || ''))
        : [],
  };

  const parsedAmenities = parseJson<unknown[]>(package_details?.details?.amenities, []);
  const amenitiesFromDb = Array.isArray(parsedAmenities)
    ? parsedAmenities
        .map((item) => {
          if (typeof item === 'string') {
            return { name: item, icon: '', description: '' };
          }

          const row = (item || {}) as Record<string, unknown>;
          const name = String(row.name || row.title || row.label || '').trim();
          if (!name) return null;
          const description = String(
            row.description || row.subtitle || row.subheading || ''
          ).trim();
          return { name, icon: String(row.icon || ''), description };
        })
        .filter((item): item is { name: string; icon: string; description: string } => Boolean(item))
    : [];

  const amenitiesData =
    amenitiesFromDb.length > 0
      ? amenitiesFromDb
      : Amenities_demos.map((item) => ({
          ...item,
          icon: item.icon,
        }));

  const parsedDefaultPricing = parseJson<{ people?: number; value?: number; currency?: string }>(
    package_details?.default_pricing,
    {}
  );
  const pricePerPerson = Number(
    selectedRate?.value ?? parsedDefaultPricing?.value ?? package_details?.price_per_person ?? 0
  );
  const formattedPrice = `INR ${pricePerPerson.toLocaleString('en-IN')}`;

  // Slim checkout URL: only what isn't derivable from the package row.
  // package_id identifies the package; everything else (slug, agent_id, agent_name)
  // is read from the DB by the checkout page.
  //
  // The Reserve buttons render via ReserveLink (client component), which
  // decides between /checkout and /login?redirect=<checkout> at click time
  // based on the auth cookie + supabase session. Passing the raw checkout
  // URL here lets that decision happen on the client without forcing this
  // page out of ISR.
  const checkoutParams = new URLSearchParams();
  if (package_details?.id) checkoutParams.set('package_id', String(package_details.id));
  checkoutParams.set('guests', String(numberOfGuests));
  checkoutParams.set('sharing', String(sharingCount));
  const checkoutUrl = `/checkout?${checkoutParams.toString()}`;

  const purchaseSummaryProps = {
    sharingRates: sharingRateList,
    initialGuests: numberOfGuests,
    initialSharing: sharingCount,
    checkoutUrl,
  };

  const packageUrl = `${SITE_URL}/${agentName}/${slug}`;
  const packageImage =
    (package_details as { thumbnail_url?: string | null })?.thumbnail_url || undefined;

  // Price validity window — Google requires `priceValidUntil` for Product
  // offers to render rich snippets. 60 days is a reasonable hold for travel
  // pricing; ISR re-renders the page well before that expires.
  const priceValidUntil = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d.toISOString().slice(0, 10);
  })();

  // Availability — surface sold-out to Google so SERP doesn't promise a
  // bookable package that's gone. `seats_left` is the canonical source;
  // fall back to InStock when unknown rather than misreporting OOS.
  const seatsLeft = Number((package_details as { seats_left?: number | null })?.seats_left ?? NaN);
  const availabilityUrl =
    Number.isFinite(seatsLeft) && seatsLeft <= 0
      ? 'https://schema.org/SoldOut'
      : 'https://schema.org/InStock';

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: package_details?.title,
    description: clampText(
      (package_details as { short_description?: string | null })?.short_description ||
        `${package_details?.total_duration_days || ''} day Umrah package`
    ),
    ...(packageImage ? { image: [packageImage] } : {}),
    // Required by Google for Product rich results even when "condition" is
    // semantically odd for services — NewCondition is the spec's recommended
    // default for non-physical goods.
    itemCondition: 'https://schema.org/NewCondition',
    brand: {
      '@type': 'TravelAgency',
      name: packageMetaData.agentDisplayName,
    },
    offers: {
      '@type': 'Offer',
      url: packageUrl,
      priceCurrency: parsedDefaultPricing?.currency || package_details?.currency || 'INR',
      price: pricePerPerson,
      priceValidUntil,
      availability: availabilityUrl,
      seller: {
        '@type': 'TravelAgency',
        name: packageMetaData.agentDisplayName,
      },
    },
    ...(agentReviewCount > 0 && agentRatingPoint > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: agentRatingPoint,
            reviewCount: agentReviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  // TouristTrip is the spec-correct type for a guided travel package. Google
  // consumes it for the Travel knowledge panel and SERP cards. We keep Product
  // alongside so Merchant/Shopping signals still apply (price, availability,
  // rating) — both schemas referencing the same canonical URL is valid and
  // Google rolls them up.
  const touristTripSchema = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: package_details?.title,
    description: clampText(
      (package_details as { short_description?: string | null })?.short_description ||
        `${package_details?.total_duration_days || ''} day Umrah package`,
      300
    ),
    url: packageUrl,
    ...(packageImage ? { image: packageImage } : {}),
    touristType: ['Religious pilgrims', 'Umrah pilgrims', 'Muslim travelers'],
    provider: {
      '@type': 'TravelAgency',
      name: packageMetaData.agentDisplayName,
      url: `${SITE_URL}/${agentName}`,
    },
    ...(package_details?.departure_city
      ? {
          subjectOf: {
            '@type': 'Place',
            name: package_details.departure_city,
          },
        }
      : {}),
    itinerary: [
      ...(package_details?.departure_city
        ? [
            {
              '@type': 'Place',
              name: package_details.departure_city,
              address: { '@type': 'PostalAddress', addressCountry: 'IN' },
            },
          ]
        : []),
      {
        '@type': 'Place',
        name: 'Makkah',
        address: { '@type': 'PostalAddress', addressCountry: 'SA' },
      },
      {
        '@type': 'Place',
        name: 'Madinah',
        address: { '@type': 'PostalAddress', addressCountry: 'SA' },
      },
    ],
    offers: {
      '@type': 'Offer',
      url: packageUrl,
      priceCurrency: parsedDefaultPricing?.currency || package_details?.currency || 'INR',
      price: pricePerPerson,
      priceValidUntil,
      availability: availabilityUrl,
    },
  };

  // Review JSON-LD — only when we actually have published agent reviews with
  // text. Empty review_text yields a low-quality Review object Google may
  // ignore or penalize, so we filter those out. Reviews live on the AGENT
  // (not per-package), so each Review's `itemReviewed` points at the agent
  // entity to stay truthful.
  const reviewLdItems = topReviews
    .filter((r) => r.rating && Number(r.rating) > 0 && (r.review_text || '').trim().length > 0)
    .slice(0, 3)
    .map((r) => ({
      '@context': 'https://schema.org',
      '@type': 'Review',
      itemReviewed: {
        '@type': 'TravelAgency',
        name: packageMetaData.agentDisplayName,
        url: `${SITE_URL}/${agentName}`,
      },
      author: {
        '@type': 'Person',
        name: r.is_anonymous ? 'Anonymous' : r.user_name || 'Pilgrim',
      },
      datePublished: r.created_at
        ? new Date(r.created_at).toISOString().slice(0, 10)
        : undefined,
      reviewBody: (r.review_text || '').trim(),
      reviewRating: {
        '@type': 'Rating',
        ratingValue: Number(r.rating),
        bestRating: 5,
        worstRating: 1,
      },
    }));

  // FAQPage — package-aware Q&A derived from the package row itself, not a
  // static list. The questions match what pilgrims actually ask before
  // booking (visa, flights, hotel distance) and each answer references
  // concrete values from this package so Google flags it as substantive.
  const includesItems: string[] = [];
  const pkgFlags = package_details as {
    includes_visa?: boolean | null;
    includes_breakfast?: boolean | null;
    includes_airport_transfer?: boolean | null;
    includes_zamzam?: boolean | null;
    zamzam_liters?: number | null;
  };
  if (pkgFlags.includes_visa) includesItems.push('Saudi Umrah visa');
  if (pkgFlags.includes_breakfast) includesItems.push('daily breakfast');
  if (pkgFlags.includes_airport_transfer) includesItems.push('airport transfers');
  if (pkgFlags.includes_zamzam) {
    includesItems.push(
      `${pkgFlags.zamzam_liters ? `${pkgFlags.zamzam_liters}L of ` : ''}Zamzam water`
    );
  }
  const includesAnswer =
    includesItems.length > 0
      ? `This ${package_details?.total_duration_days || ''}-day package includes ${includesItems.join(
          ', '
        )}. Flights and hotel stays in Makkah and Madinah are part of the package; verify any additional inclusions directly with the agent before booking.`
      : `Confirm the exact inclusions (visa, breakfast, transfers, Zamzam) directly with ${packageMetaData.agentDisplayName} — package contents vary between operators and seasons.`;

  const faqEntries: { question: string; answer: string }[] = [
    {
      question: `What's included in this ${package_details?.total_duration_days || ''}-day Umrah package?`,
      answer: includesAnswer,
    },
    ...(package_details?.makkah_hotel_name
      ? [
          {
            question: `Which hotel is used in Makkah for this package?`,
            answer: `Pilgrims stay at ${package_details.makkah_hotel_name}${
              package_details.makkah_hotel_distance_m
                ? `, approximately ${package_details.makkah_hotel_distance_m} m from Masjid al-Haram`
                : ''
            }. Walking distance to the Haram is the single biggest factor in pilgrim comfort, especially for the elderly.`,
          },
        ]
      : []),
    ...(package_details?.madinah_hotel_name
      ? [
          {
            question: `Which hotel is used in Madinah for this package?`,
            answer: `Pilgrims stay at ${package_details.madinah_hotel_name}${
              package_details.madinah_hotel_distance_m
                ? `, approximately ${package_details.madinah_hotel_distance_m} m from Masjid an-Nabawi`
                : ''
            }.`,
          },
        ]
      : []),
    ...(package_details?.departure_city
      ? [
          {
            question: `Does this package include flights from ${package_details.departure_city}?`,
            answer: `Yes — the package departs from ${package_details.departure_city}${
              package_details.arrival_city
                ? ` and arrives at ${package_details.arrival_city}`
                : ''
            }. Confirm the exact airline, layovers and baggage allowance with the agent before booking.`,
          },
        ]
      : []),
    {
      question: `How do I book this package on Searchumrah?`,
      answer: `Searchumrah does not collect payment. Click "Reserve" to go to the booking flow — your details go directly to ${packageMetaData.agentDisplayName}, who will contact you to confirm price, dates, and complete the booking. You pay the agent, not Searchumrah.`,
    },
    {
      question: `Is ${packageMetaData.agentDisplayName} a verified travel agent?`,
      answer: `Yes. Every agent listed on Searchumrah completes a KYC verification before publishing packages. ${
        agentReviewCount > 0
          ? `${packageMetaData.agentDisplayName} has ${agentReviewCount} verified review${
              agentReviewCount === 1 ? '' : 's'
            } from past pilgrims with an average rating of ${agentRatingPoint.toFixed(1)} out of 5.`
          : 'Reviews from past pilgrims appear on the agent profile page as they come in.'
      }`,
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntries.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Packages', item: `${SITE_URL}/packages` },
      {
        '@type': 'ListItem',
        position: 3,
        name: packageMetaData.agentDisplayName,
        item: `${SITE_URL}/${agentName}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: package_details?.title || slug,
        item: packageUrl,
      },
    ],
  };

  return (
    <div className="nc-ListingStayDetailPage w-full min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(touristTripSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqSchema) }}
      />
      {reviewLdItems.map((review) => (
        <script
          key={`review-ld-${(review.author as { name: string }).name}-${review.datePublished ?? ''}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(review) }}
        />
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      <div className="relative z-20">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Packages', href: '/packages' },
            { label: slug },
          ]}
        />
      </div>

      {/* MAIN */}
      <main className="relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-0 w-full">
        {/* CONTENT */}
        <div className="w-full lg:w-3/5 xl:w-2/3 space-y-6 sm:space-y-8 lg:space-y-10 lg:pr-10 mb-6">
          <PackageMeta {...packageMetaData} />
          <Iternary data={iternaryData} />
          <AmenitiesSection amenities={amenitiesData} />
          <PackageInfo
            data={stayInfoData}
            hotels={[
              {
                side: 'makkah',
                name: package_details?.makkah_hotel_name ?? null,
                distanceM: package_details?.makkah_hotel_distance_m ?? null,
                stars: makkahHotelMeta.stars,
                amenities: makkahHotelMeta.amenities,
              },
              {
                side: 'madinah',
                name: package_details?.madinah_hotel_name ?? null,
                distanceM: package_details?.madinah_hotel_distance_m ?? null,
                stars: madinahHotelMeta.stars,
                amenities: madinahHotelMeta.amenities,
              },
            ]}
          />
          <Policies data={policiesData} />
          <HostInformation {...hostData} />
        </div>

        {/* SIDEBAR: Purchase summary, sticky on lg+, hidden on mobile (replaced by MobileFooterSticky) */}
        <aside className="hidden lg:block lg:sticky lg:top-28 lg:self-start w-full lg:w-2/5 xl:w-1/3 mt-8 lg:mt-0 flex-shrink-0">
          <div className="max-w-md mx-auto w-full">
            <PurchaseSummaryInteractive {...purchaseSummaryProps} className="bg-white" />
          </div>
        </aside>
      </main>

      {/* ============== RELATED PACKAGES ============== */}
      {/*
        Full-width sections below the main grid. SEO purpose: distribute
        PageRank from this page to other package detail pages (same city,
        adjacent durations) and to the relevant SEO landing-page hubs.
        Without these blocks the package detail page is a dead-end —
        Google crawls in and finds nowhere else to go except the agent
        profile and breadcrumb. Each card is a clickable link with anchor
        text that's the package title.
      */}
      {relatedByCity.length > 0 ? (
        <section className="mt-10 lg:mt-14">
          <div className="mb-5 lg:mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-xl lg:text-2xl font-thin tracking-tight text-neutral-900 dark:text-neutral-100">
              More Umrah packages from {currentDepartureCity}
            </h2>
            <Link
              href={`/packages?departure_city=${encodeURIComponent(currentDepartureCity || '')}`}
              className="text-sm font-semibold text-primary-700 dark:text-primary-300 hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
            {relatedByCity.map((pkg) => (
              <Packages
                key={`city-${pkg.id}`}
                data={pkg}
                agentSlug={pkg.agent_name || undefined}
                agentDisplayName={pkg.agent_known_as || pkg.agent_name || undefined}
                agentProfileImage={pkg.agent_profile_image}
                agentRatingPoint={pkg.agent_rating_avg ?? 0}
                agentReviewCount={pkg.agent_rating_total ?? 0}
              />
            ))}
          </div>
        </section>
      ) : null}

      {durationRail.length > 0 ? (
        <section className="mt-10 lg:mt-14">
          <div className="mb-5 lg:mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-xl lg:text-2xl font-thin tracking-tight text-neutral-900 dark:text-neutral-100">
              Similar {currentDuration}-day Umrah packages
            </h2>
            <Link
              href="/packages"
              className="text-sm font-semibold text-primary-700 dark:text-primary-300 hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
            {durationRail.map((pkg) => (
              <Packages
                key={`dur-${pkg.id}`}
                data={pkg}
                agentSlug={pkg.agent_name || undefined}
                agentDisplayName={pkg.agent_known_as || pkg.agent_name || undefined}
                agentProfileImage={pkg.agent_profile_image}
                agentRatingPoint={pkg.agent_rating_avg ?? 0}
                agentReviewCount={pkg.agent_rating_total ?? 0}
              />
            ))}
          </div>
        </section>
      ) : null}

      {exploreLinks.length > 0 ? (
        <section className="mt-10 lg:mt-14 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200 dark:border-neutral-700 p-6 lg:p-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-neutral-500 dark:text-neutral-400 mb-3.5">
            Explore similar Umrah packages
          </h2>
          <ul className="flex flex-wrap gap-2 lg:gap-2.5">
            {exploreLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex items-center rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-primary-400 hover:text-primary-800 dark:hover:text-primary-200 text-neutral-800 dark:text-neutral-200 text-[13px] font-medium px-3.5 py-1.5 transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="block lg:hidden h-24" />
      <MobileFooterSticky
        sharingRates={sharingRateList}
        initialGuests={numberOfGuests}
        initialSharing={sharingCount}
        checkoutUrl={checkoutUrl}
        priceLabel={formattedPrice}
      />
    </div>
  );
};

export default PackageDetail;
