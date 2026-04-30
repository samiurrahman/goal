import CommentListing from '@/components/CommentListing';
import React from 'react';
import Breadcrumb from '@/components/Breadcrumb';
import SectionStatistic from './(components)/SectionStatistic';
import { supabase } from '@/utils/supabaseClient';
import type { Agent, Package } from '@/data/types';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import bannerImage from '@/images/hero-right1.png';
import Badge from '@/shared/Badge';
import SocialsList from '@/shared/SocialsList';
import StartRating from '@/components/StartRating';
import SectionOurFeatures from './(components)/SectionOurFeatures';
import SectionSubscribe2 from './(components)/SectionSubscribe2';
import SectionGridFeaturePlaces from './(components)/SectionGridFeaturePlaces';

export interface AgentDetailsProps {
  params: { agentName: string };
}

export const dynamic = 'force-dynamic';

const getAgentBySlug = async (agentName: string): Promise<Agent | null> => {
  const { data: agentData } = await supabase
    .from('agents')
    .select('*')
    .eq('slug', agentName)
    .single();

  const agentDetails = (agentData as Agent | null) ?? null;
  if (!agentDetails) return null;

  if (typeof agentDetails.founders === 'string') {
    try {
      agentDetails.founders = JSON.parse(agentDetails.founders);
    } catch {
      agentDetails.founders = [];
    }
  }

  return agentDetails;
};

export const generateMetadata = async ({ params }: AgentDetailsProps): Promise<Metadata> => {
  const agentDetails = await getAgentBySlug(params.agentName);
  const title = agentDetails?.known_as
    ? `${agentDetails.known_as} | HajjScanner`
    : 'Agent Profile | HajjScanner';
  const description =
    agentDetails?.about_us || 'Explore trusted Hajj and Umrah packages from verified agents.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      url: `https://www.hajjscanner.com/${params.agentName}`,
      images: agentDetails?.profile_image ? [{ url: agentDetails.profile_image }] : undefined,
    },
  };
};

const AgentDetails = async ({ params }: AgentDetailsProps) => {
  const { agentName } = params;
  const agentDetails = await getAgentBySlug(agentName);

  const agentSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person', // or "Organization" if more appropriate
    name: agentDetails?.known_as,
    url: `https://www.hajjscanner.com/${agentDetails?.slug}`,
    description: agentDetails?.about_us,
    image: agentDetails?.profile_image, // URL to agent's image
    // Add more fields as needed
  };

  // Fetch all packages for this agent
  let agentPackages: Package[] = [];
  if (agentDetails?.id) {
    const { data: packagesData } = await supabase
      .from('packages')
      .select('*')
      .eq('agent_id', agentDetails.id);
    agentPackages = (packagesData as Package[] | null) ?? [];
  }

  const agentLocation = [agentDetails?.city, agentDetails?.state, agentDetails?.country]
    .filter(Boolean)
    .join(', ');

  const phoneDigits = (agentDetails?.contact_number || '').replace(/\D/g, '');
  const socialLinks = [
    {
      href: phoneDigits ? `https://wa.me/${phoneDigits}` : '',
      icon: 'lab la-whatsapp',
      name: 'WhatsApp',
    },
    {
      href: agentDetails?.contact_number ? `tel:${agentDetails.contact_number}` : '',
      icon: 'las la-phone',
      name: 'Call',
    },
    {
      href: agentDetails?.email_id ? `mailto:${agentDetails.email_id}` : '',
      icon: 'las la-envelope',
      name: 'Email',
    },
  ].filter((item) => item.href);

  const listingCount = Array.isArray(agentPackages) ? agentPackages.length : 0;
  const agentRatingPoint = 4.5;
  const agentReviewCount = 112;
  const isGovVerified = ['true', '1', 'yes', 'y'].includes(
    String(agentDetails?.is_gov_authorised ?? '')
      .toLowerCase()
      .trim()
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agentSchema) }}
      />
      <div className="relative z-20 mt-4">
        <Breadcrumb
          items={[{ label: 'Home', href: '/' }, { label: agentDetails?.known_as ?? '' }]}
        />
      </div>
      <div className="nc-ListingStayDetailPage w-full min-h-screen">
        <main className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-6 w-full mt-4 mb-24 lg:mb-32 lg:items-stretch">
          <div className="lg:col-span-5 mt-6">
            <section className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
              <div className="relative h-60 md:h-60 w-full">
                <Image
                  src={bannerImage}
                  alt={agentDetails?.known_as || 'Agent cover'}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                {socialLinks.length > 0 && (
                  <div className="absolute top-3 left-3 md:top-4 md:left-4 z-20">
                    <div className="flex items-center rounded-2xl bg-white/95 px-2.5 py-2 shadow-md backdrop-blur-sm">
                      <SocialsList
                        socials={socialLinks}
                        className="gap-2"
                        itemClass="h-8 w-8 rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 shadow-sm flex items-center justify-center text-neutral-700"
                      />
                    </div>
                  </div>
                )}
                <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20">
                  <Link
                    href="/account"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-primary-6000 bg-primary-6000 text-xs font-semibold text-white hover:bg-primary-700 hover:border-primary-700 shadow-sm"
                  >
                    <i className="las la-pen"></i>
                    Edit Profile
                  </Link>
                </div>
                <div className="absolute right-3 md:right-4 bottom-0 translate-y-1/2 z-20 max-w-[78vw] md:max-w-[62vw]">
                  <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-white/95 dark:bg-neutral-900/95 px-2.5 py-2 shadow-md border border-neutral-200 dark:border-neutral-700 backdrop-blur-sm">
                    <Badge
                      name={
                        <StartRating
                          className="text-yellow-900"
                          point={agentRatingPoint}
                          reviewCount={agentReviewCount}
                        />
                      }
                      color="yellow"
                    />
                    <Badge
                      name={
                        <span className="inline-flex items-center gap-1.5">
                          <i className="las la-briefcase text-sm" />
                          {listingCount} Packages
                        </span>
                      }
                      color="blue"
                    />
                    {isGovVerified && (
                      <Badge
                        name={
                          <span className="inline-flex items-center gap-1.5">
                            <i className="las la-check-circle text-sm" />
                            Government Verified
                          </span>
                        }
                        color="green"
                      />
                    )}
                  </div>
                </div>
                <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2 z-20">
                  {agentDetails?.profile_image ? (
                    <div className="relative h-24 w-24 md:h-28 md:w-28 overflow-hidden rounded-full border-[5px] border-white dark:border-neutral-900 shadow-lg">
                      <Image
                        src={agentDetails.profile_image}
                        alt={agentDetails.known_as || 'Agent'}
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    </div>
                  ) : (
                    <div className="h-24 w-24 md:h-28 md:w-28 rounded-full border-[5px] border-white dark:border-neutral-900 shadow-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center justify-center text-2xl font-semibold">
                      {agentDetails?.known_as?.[0] || '?'}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-5 md:px-8 pb-7">
                <div className="pt-16 md:pt-20 flex flex-col items-center text-center gap-4">
                  <div>
                    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <span aria-hidden="true" />
                      <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-white leading-tight">
                        {agentDetails?.known_as}
                      </h1>
                      <span aria-hidden="true" />
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                      <span className="inline-flex items-center gap-1.5">
                        <i className="las la-map-marker-alt text-base" />
                        {agentLocation || 'Location pending'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="flex items-start gap-4 p-1">
                    <i className="las la-phone text-2xl flex-shrink-0 mt-0.5"></i>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600">Phone</p>
                      <p className="text-sm text-gray-900 font-medium">
                        {agentDetails?.contact_number || 'Not available'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-1">
                    <i className="las la-envelope text-2xl flex-shrink-0 mt-0.5"></i>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600">Email</p>
                      <p className="text-sm text-gray-900 font-medium truncate">
                        {agentDetails?.email_id || 'Not available'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-1">
                    <i className="las la-business-time text-2xl flex-shrink-0 mt-0.5"></i>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600">Operating since</p>
                      <p className="text-sm text-gray-900 font-medium">10</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      About
                    </h3>
                    <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300 leading-6">
                      {agentDetails?.about_us || 'Profile details pending.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      Contact & Location
                    </h3>
                    <div className="mt-2 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                      <p>
                        <span className="font-medium">Address:</span>{' '}
                        {agentDetails?.address || 'Not available'}
                      </p>
                      <p>
                        <span className="font-medium">City/State:</span>{' '}
                        {[agentDetails?.city, agentDetails?.state].filter(Boolean).join(', ') ||
                          'Not available'}
                      </p>
                      <p>
                        <span className="font-medium">Country:</span>{' '}
                        {agentDetails?.country || 'Not available'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* BOTTOM SECTION: LISTINGS FULL-WIDTH */}
          <div className="lg:col-span-5 gap-12 flex flex-col">
            <SectionOurFeatures />
            <SectionGridFeaturePlaces
              packages={agentPackages ?? []}
              heading="Our Packages"
              subHeading="enjoy hasseless package on one click"
              tabs={['Umrah', 'Hajj']}
            />
            <SectionSubscribe2 />
          </div>

          {/* REVIEWS FULL-WIDTH */}
          <div className="lg:col-span-5 mt-6">
            <div className="listingSection__wrap !space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-normal text-gray-900">Reviews</h2>
                <Link
                  href="/account"
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <i className="las la-pen text-2xl"></i>
                </Link>
              </div>
              <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                <CommentListing hasListingTitle className="pb-8" />
                <CommentListing hasListingTitle className="py-8" />
                <CommentListing hasListingTitle className="py-8" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default AgentDetails;
