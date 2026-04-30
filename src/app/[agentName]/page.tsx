import CommentListing from '@/components/CommentListing';
import React from 'react';
import Breadcrumb from '@/components/Breadcrumb';
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
import SectionGridFeaturePlaces from './(components)/SectionGridFeaturePlaces';
import AgentProfileEditModal from './(components)/AgentProfileEditModal';

export interface AgentDetailsProps {
  params: { agentName: string };
}

export const dynamic = 'force-dynamic';

const sanitizeProfileMarkup = (markup: string) => {
  if (!markup) return '';

  return markup
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+=("[^"]*"|'[^']*')/gi, '')
    .replace(/javascript:/gi, '');
};

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
  const agentRecord = (agentDetails || {}) as Record<string, unknown>;
  const experienceFieldCandidates = ['experience_years', 'years_of_experience', 'experience'];
  const experienceField =
    experienceFieldCandidates.find((field) => field in agentRecord) || undefined;
  const experienceValue = experienceField ? agentRecord[experienceField] : undefined;
  const experienceLabel =
    experienceValue === null ||
    experienceValue === undefined ||
    String(experienceValue).trim() === ''
      ? 'Not available'
      : `${String(experienceValue).trim()} years`;
  const isGovVerified = ['true', '1', 'yes', 'y'].includes(
    String(agentDetails?.is_gov_authorised ?? '')
      .toLowerCase()
      .trim()
  );
  const sanitizedAboutMarkup = sanitizeProfileMarkup(agentDetails?.about_us || '');
  const bannerSrc = agentDetails?.banner_image || bannerImage;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agentSchema) }}
      />
      <div className="relative z-20 my-4">
        <Breadcrumb
          items={[{ label: 'Home', href: '/' }, { label: agentDetails?.known_as ?? '' }]}
        />
      </div>
      <div className="nc-ListingStayDetailPage w-full min-h-screen">
        <main className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-6 w-full mb-24 lg:mb-32 lg:items-stretch">
          <div className="lg:col-span-5">
            <section className="overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg">
              <div className="relative h-60 md:h-60 w-full">
                <Image
                  src={bannerSrc}
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
                  <AgentProfileEditModal
                    agentId={agentDetails?.id}
                    initialData={{
                      name: agentDetails?.name,
                      known_as: agentDetails?.known_as,
                      contact_number: agentDetails?.contact_number,
                      alternate_number: agentDetails?.alternate_number,
                      email_id: agentDetails?.email_id,
                      address: agentDetails?.address,
                      city: agentDetails?.city,
                      state: agentDetails?.state,
                      country: agentDetails?.country,
                      profile_image: agentDetails?.profile_image,
                      banner_image: agentDetails?.banner_image,
                      experience: experienceValue == null ? '' : String(experienceValue),
                      experienceField,
                      about_us: agentDetails?.about_us,
                    }}
                  />
                </div>
                <div className="hidden lg:block absolute right-3 lg:right-4 bottom-0 translate-y-1/2 z-20 max-w-[62vw]">
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
                <div className="absolute left-4 right-4 md:right-auto md:left-8 bottom-0 translate-y-1/2 z-20 flex items-center gap-3 md:gap-5 rounded-2xl bg-white/95 dark:bg-neutral-900/95 px-3 py-2 shadow-md border border-neutral-200 dark:border-neutral-700 backdrop-blur-sm lg:max-w-[58vw]">
                  {agentDetails?.profile_image ? (
                    <div className="relative h-20 w-20 md:h-24 md:w-24 overflow-hidden rounded-full border-[4px] border-white dark:border-neutral-900 shadow-lg shrink-0">
                      <Image
                        src={agentDetails.profile_image}
                        alt={agentDetails.known_as || 'Agent'}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-full border-[4px] border-white dark:border-neutral-900 shadow-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center justify-center text-2xl font-semibold shrink-0">
                      {agentDetails?.known_as?.[0] || '?'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h1 className="text-xl md:text-3xl font-semibold text-neutral-900 dark:text-white leading-tight truncate">
                      {agentDetails?.known_as}
                    </h1>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 truncate">
                      <span className="inline-flex items-center gap-1.5 max-w-full">
                        <i className="las la-map-marker-alt text-base" />
                        <span className="truncate">{agentLocation || 'Location pending'}</span>
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300 truncate">
                      <span className="inline-flex items-center gap-1.5 max-w-full">
                        <i className="las la-phone text-base" />
                        <span className="truncate">
                          {agentDetails?.contact_number || 'Not available'}
                        </span>
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-5 md:px-8 pb-7">
                <div className="pt-16 lg:pt-20" />

                <div className="lg:hidden mt-3">
                  <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white dark:bg-neutral-900 px-2.5 py-2 shadow-sm border border-neutral-200 dark:border-neutral-700">
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

                <div className="mt-8 grid grid-cols-1 md:grid-cols-[0.6fr_0.95fr_1.55fr] gap-4 md:gap-5">
                  <div className="flex items-start gap-3 p-1">
                    <i className="las la-user-clock text-[26px] flex-shrink-0 mt-0.5"></i>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600">Experience</p>
                      <p className="text-sm text-gray-900 font-medium">{experienceLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-1">
                    <i className="las la-envelope text-[30px] flex-shrink-0 mt-0.5"></i>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600">Email</p>
                      <p className="text-sm text-gray-900 font-medium truncate">
                        {agentDetails?.email_id || 'Not available'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-1">
                    <i className="las la-map-marker-alt text-[30px] flex-shrink-0 mt-0.5"></i>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-600">Address</p>
                      <p className="text-sm text-gray-900 font-medium line-clamp-1">
                        {agentDetails?.address || 'Not available'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-5">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      About
                    </h3>
                    {sanitizedAboutMarkup ? (
                      <div
                        className="prose prose-sm max-w-none mt-2 text-neutral-700 dark:prose-invert dark:text-neutral-300 prose-headings:mb-2 prose-headings:mt-3 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1"
                        dangerouslySetInnerHTML={{ __html: sanitizedAboutMarkup }}
                      />
                    ) : (
                      <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300 leading-6">
                        Profile details pending.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* BOTTOM SECTION: LISTINGS FULL-WIDTH */}
          <div className="lg:col-span-5 gap-12 flex flex-col">
            <SectionOurFeatures agentName={agentDetails?.known_as} />
            <SectionGridFeaturePlaces
              packages={agentPackages ?? []}
              heading="Our Packages"
              tabs={['Umrah', 'Hajj']}
            />
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
