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

const HOST_DATA = {
  name: 'Kevin Francis',
  places: 12,
  description:
    'Providing lake views, The Symphony 9 Tam Coc in Ninh Binh provides accommodation, an outdoor swimming pool, a bar, a shared lounge, a garden and barbecue facilities...',
  joined: 'Joined in March 2016',
  responseRate: '100%',
  responseTime: 'Fast response - within a few hours',
};

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

const PackageDetail = async ({ params, searchParams }: PackageDetailProps) => {
  const { agentName, slug } = params;
  const { data: agentData } = await supabase
    .from('agents')
    .select('profile_image, auth_user_id')
    .eq('slug', agentName)
    .maybeSingle();
  const agentProfileImage = (agentData?.profile_image as string | null | undefined) ?? null;
  const agentAuthUserId = (agentData?.auth_user_id as string | null | undefined) ?? null;

  const { data: packageData, error } = await supabase
    .from('packages')
    .select('*')
    .eq('slug', slug)
    .eq('agent_name', agentName)
    .single();

  if (error || !packageData) {
    notFound();
  }

  let package_details = packageData as PackageDetails;

  if (packageData?.id) {
    const { data: details } = await supabase
      .from('package_details')
      .select('*')
      .eq('package_id', packageData.id)
      .single();

    package_details = {
      ...packageData,
      details: details ?? null,
    } as PackageDetails;
  }

  const sharingRates = parseJson<{
    json?: { rates?: RoomRate[] };
    rates?: RoomRate[];
  }>(package_details?.sharing_rate, {});
  const sharingRateList = sharingRates?.json?.rates ?? sharingRates?.rates ?? [];

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
  };

  const hostData = { ...HOST_DATA, profileUrl: agentName, profileImage: agentProfileImage };

  const iternaryData = parseJson<IternaryItemProps[]>(package_details?.details?.iternary, []);
  const stayInfoData = parseJson(package_details?.details?.stay_information, {
    title: 'Stay information',
    details: [],
  });
  const policiesData = parseJson(package_details?.details?.policies, {
    cancellation: '',
    checkIn: '',
    checkOut: '',
    notes: [],
  });

  const amenitiesData = Amenities_demos.map((item) => ({
    ...item,
    icon: typeof item.icon === 'string' ? item.icon : (item.icon.src ?? ''),
  }));

  const isLoggedIn = Boolean(cookies().get('access_token')?.value);

  const pricePerPerson = Number(selectedRate?.value ?? 0);
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
      <div className="relative z-20 mt-4">
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
