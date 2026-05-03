import React from 'react';
import { Amenities_demos } from '../(components)/constant';
import Breadcrumb from '@/components/Breadcrumb';
import Iternary from '../(components)/Iternary';
import type { IternaryItemProps } from '../(components)/IternaryItem';
import PackageMeta from '../(components)/PackageMeta';
import Policies from '../(components)/Policies';
import HostInformation from '../(components)/HostInformation';
import AmenitiesSection from '../(components)/AmenitiesSection';
import PackageInfo from '../(components)/PackageInfo';
import MobileFooterSticky from '../(components)/MobileFooterSticky';
import PurchaseSummary from '../(components)/PurchaseSummary';
import type { PackageDetails } from '@/data/types';
import { supabase } from '@/utils/supabaseClient';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

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

const formatDateRangePart = (dateInput?: string) => {
  if (!dateInput) return 'TBD';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

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

  const { data: baseAgentRows, error: agentError } = await supabase
    .from('agents')
    .select(
      'profile_image, auth_user_id, rating_avg, rating_total, known_as, about_us, created_at, city, state, country'
    )
    .ilike('slug', agentName)
    .limit(1);

  const baseAgentData = Array.isArray(baseAgentRows) ? baseAgentRows[0] : null;

  let agentData: AgentMetaRow | null = baseAgentData
    ? {
        profile_image: (baseAgentData as AgentMetaRow).profile_image ?? null,
        auth_user_id: (baseAgentData as AgentMetaRow).auth_user_id ?? null,
        rating_avg: (baseAgentData as AgentMetaRow).rating_avg ?? null,
        rating_total: (baseAgentData as AgentMetaRow).rating_total ?? null,
        known_as: (baseAgentData as AgentMetaRow).known_as ?? null,
        about_us: (baseAgentData as AgentMetaRow).about_us ?? null,
        created_at: (baseAgentData as AgentMetaRow).created_at ?? null,
        city: (baseAgentData as AgentMetaRow).city ?? null,
        state: (baseAgentData as AgentMetaRow).state ?? null,
        country: (baseAgentData as AgentMetaRow).country ?? null,
      }
    : null;

  // Backward compatibility for environments where rating columns are not migrated yet.
  if (
    agentError &&
    String(agentError.message || '')
      .toLowerCase()
      .includes('rating_')
  ) {
    const fallback = await supabase
      .from('agents')
      .select('profile_image, auth_user_id')
      .ilike('slug', agentName)
      .limit(1);
    const fallbackRow = Array.isArray(fallback.data) ? fallback.data[0] : null;
    agentData = fallbackRow
      ? {
          profile_image: (fallbackRow as AgentMetaRow)?.profile_image ?? null,
          auth_user_id: (fallbackRow as AgentMetaRow)?.auth_user_id ?? null,
          rating_avg: null,
          rating_total: null,
          known_as: null,
          about_us: null,
          created_at: null,
          city: null,
          state: null,
          country: null,
        }
      : null;
  }
  const agentProfileImage = (agentData?.profile_image as string | null | undefined) ?? null;
  const agentAuthUserId = (agentData?.auth_user_id as string | null | undefined) ?? null;
  const agentRatingPoint = Number(agentData?.rating_avg ?? 0);
  const agentReviewCount = Number(agentData?.rating_total ?? 0);

  const { data: packageByNameRows } = await supabase
    .from('packages')
    .select('*')
    .ilike('slug', slug)
    .ilike('agent_name', agentName)
    .limit(1);

  const packageByName = Array.isArray(packageByNameRows) ? packageByNameRows[0] : null;

  let packageData = packageByName;

  // Backward compatibility: older rows may not have agent_name aligned with URL slug.
  if (!packageData && isUuid(agentAuthUserId)) {
    const { data: packageByAgentIdRows } = await supabase
      .from('packages')
      .select('*')
      .ilike('slug', slug)
      .eq('agent_id', String(agentAuthUserId))
      .limit(1);
    const packageByAgentId = Array.isArray(packageByAgentIdRows) ? packageByAgentIdRows[0] : null;
    packageData = packageByAgentId;
  }

  // Last fallback for legacy data where only slug was reliable.
  if (!packageData) {
    const { data: packageBySlugOnlyRows } = await supabase
      .from('packages')
      .select('*')
      .ilike('slug', slug)
      .limit(1);
    const packageBySlugOnly = Array.isArray(packageBySlugOnlyRows)
      ? packageBySlugOnlyRows[0]
      : null;
    packageData = packageBySlugOnly;
  }

  if (!packageData) {
    notFound();
  }

  let package_details = packageData as PackageDetails;

  if (packageData?.id) {
    const { data: detailsArray } = await supabase
      .from('package_details')
      .select('*')
      .eq('package_id', packageData.id)
      .limit(1);

    const details = Array.isArray(detailsArray) ? detailsArray[0] : null;

    package_details = {
      ...packageData,
      details: details ?? null,
    } as PackageDetails;
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

  const departureDateText = formatDateRangePart(package_details?.departure_date);
  const arrivalDateText = formatDateRangePart(package_details?.arrival_date);

  const packageMetaData = {
    title: package_details?.title ?? 'Untitled Package',
    duration: '5 Days, 4 Nights',
    makkahHotel: 'Makkah Hotel (~500m)',
    madinaHotel: 'Madina Hotel (~300m)',
    route: `${package_details?.departure_city?.toUpperCase() ?? ''} - ${package_details?.arrival_city?.toUpperCase() ?? ''}`,
    dates: `${departureDateText} - ${arrivalDateText}`,
    provider: package_details?.agent_name ?? 'Unknown Provider',
    providerProfileImage: agentProfileImage,
    url: agentName,
    providerVerified: true,
    providerLocation: package_details?.package_location ?? 'Unknown Location',
    ratingPoint: agentRatingPoint,
    reviewCount: agentReviewCount,
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

  const iternaryData: IternaryItemProps[] = Array.isArray(normalizedIternarySource)
    ? normalizedIternarySource.map((item) => {
        const row = (item || {}) as Record<string, unknown>;
        return {
          fromDate: String(row.fromDate || row.from_date || ''),
          fromLocation: String(row.fromLocation || row.from_location || ''),
          toDate: String(row.toDate || row.to_date || ''),
          toLocation: String(row.toLocation || row.to_location || ''),
          tripTime: String(row.tripTime || row.trip_time || ''),
          flightInfo: String(row.flightInfo || row.flight_info || ''),
          nextLegLabel: String(
            row.nextLegLabel ||
              row.next_leg_label ||
              row.separatorLabel ||
              row.separator_label ||
              ''
          ).trim(),
        };
      })
    : [];
  const rawStayInfoData = parseJson<{
    title?: string;
    details?: string[];
    content_html?: string;
    contentHtml?: string;
    content?: string;
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
            return { name: item, icon: '' };
          }

          const row = (item || {}) as Record<string, unknown>;
          const name = String(row.name || row.title || row.label || '').trim();
          if (!name) return null;
          return { name, icon: '' };
        })
        .filter((item): item is { name: string; icon: string } => Boolean(item))
    : [];

  const amenitiesData =
    amenitiesFromDb.length > 0
      ? amenitiesFromDb
      : Amenities_demos.map((item) => ({
          ...item,
          icon: typeof item.icon === 'string' ? item.icon : (item.icon.src ?? ''),
        }));

  const isLoggedIn = Boolean(cookies().get('access_token')?.value);

  const parsedDefaultPricing = parseJson<{ people?: number; value?: number; currency?: string }>(
    package_details?.default_pricing,
    {}
  );
  const pricePerPerson = Number(
    selectedRate?.value ?? parsedDefaultPricing?.value ?? package_details?.price_per_person ?? 0
  );
  const formattedPrice = `INR ${pricePerPerson.toLocaleString('en-IN')}`;

  const checkoutParams = new URLSearchParams();
  if (package_details?.id) checkoutParams.set('package_id', String(package_details.id));
  checkoutParams.set('sharing', String(sharingCount));
  checkoutParams.set('guests', String(numberOfGuests));
  checkoutParams.set('slug', slug);
  checkoutParams.set('agent_name', agentName);
  if (isUuid(agentAuthUserId)) {
    checkoutParams.set('agent_id', String(agentAuthUserId));
  } else if (isUuid(String(package_details?.agent_id || ''))) {
    checkoutParams.set('agent_id', String(package_details.agent_id));
  }
  const checkoutUrl = `/checkout?${checkoutParams.toString()}`;

  const redirectQuery = new URLSearchParams();
  redirectQuery.set('guests', String(numberOfGuests));
  redirectQuery.set('sharing', String(sharingCount));
  const redirectPath = `/${agentName}/${slug}?${redirectQuery.toString()}`;

  const reserveHref = isLoggedIn
    ? checkoutUrl
    : `/login?redirect=${encodeURIComponent(redirectPath)}`;

  const purchaseSummaryProps = {
    sharingRates: sharingRateList,
    initialGuests: numberOfGuests,
    initialSharing: sharingCount,
    reserveHref,
  };

  return (
    <div className="nc-ListingStayDetailPage w-full min-h-screen">
      <div className="container relative z-20 mt-4">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Packages', href: '/packages' },
            { label: slug },
          ]}
        />
      </div>

      {/* MAIN */}
      <main className="container relative z-10 flex flex-col lg:flex-row gap-8 lg:gap-0 w-full">
        {/* CONTENT */}
        <div className="w-full lg:w-3/5 xl:w-2/3 space-y-6 sm:space-y-8 lg:space-y-10 lg:pr-10 mb-6">
          <PackageMeta {...packageMetaData} />
          <Iternary data={iternaryData} />
          <AmenitiesSection amenities={amenitiesData} />
          <PackageInfo data={stayInfoData} />
          <Policies data={policiesData} />
          <HostInformation {...hostData} />
        </div>

        {/* SIDEBAR: Purchase summary, visible on all devices, sticky on lg+ */}
        <div className="w-full lg:w-2/5 xl:w-1/3 mt-8 lg:mt-0 flex-shrink-0 flex flex-col items-stretch">
          <div className="sticky top-28 hidden lg:block max-w-md mx-auto w-full">
            <PurchaseSummary {...purchaseSummaryProps} />
          </div>
          {/* Mobile/Tablet: show purchase summary below content */}
          <div className="block lg:hidden mb-8 w-full max-w-lg mx-auto">
            <PurchaseSummary {...purchaseSummaryProps} />
          </div>
        </div>
      </main>
      <div className="block lg:hidden h-8" />
      <MobileFooterSticky reserveHref={reserveHref} priceLabel={formattedPrice} />
    </div>
  );
};

export default PackageDetail;
