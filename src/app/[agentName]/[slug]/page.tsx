import React from 'react';
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
import type { PackageDetails } from '@/data/types';
import { supabase } from '@/utils/supabaseClient';
import { notFound } from 'next/navigation';
import {
  sanitizeHotelAmenities,
  sanitizeHotelStars,
  type HotelAmenityKey,
} from '@/constants/hotelAmenities';

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

  // Now fetch package_details using the resolved package id
  const { data: detailsArray } = await supabase
    .from('package_details')
    .select('*')
    .eq('package_id', (packageData as { id: number | string }).id)
    .limit(1);

  const details = Array.isArray(detailsArray) ? detailsArray[0] : null;

  const package_details = {
    ...(packageData as object),
    details: details ?? null,
  } as PackageDetails;

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
          icon: typeof item.icon === 'string' ? item.icon : (item.icon.src ?? ''),
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

  return (
    <div className="nc-ListingStayDetailPage w-full min-h-screen">
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
