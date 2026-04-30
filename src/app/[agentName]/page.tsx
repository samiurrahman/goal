'use client';

import CommentListing from '@/components/CommentListing';
import React, { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import Breadcrumb from '@/components/Breadcrumb';
import SectionStatistic from './(components)/SectionStatistic';
import { supabase } from '@/utils/supabaseClient';
import type { Agent, Package } from '@/data/types';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import bannerImage from '@/images/banner_01.jpg';
import Badge from '@/shared/Badge';
import SocialsList from '@/shared/SocialsList';
import SectionOurFeatures from './(components)/SectionOurFeatures';
import SectionSubscribe2 from './(components)/SectionSubscribe2';
import SectionGridFeaturePlaces from './(components)/SectionGridFeaturePlaces';

export interface AgentDetailsProps {
  params: { agentName: string };
}

const AgentDetails: FC<AgentDetailsProps> = ({ params }) => {
  const { agentName } = params;

  const { data: agentDetails } = useQuery<Agent | null>({
    queryKey: ['agentDetails', agentName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('slug', agentName)
        .single(); // console.log(data.founders);

      if (error) throw error;
      if (typeof data?.founders === 'string') {
        try {
          data.founders = JSON.parse(data.founders);
        } catch (e) {
          data.founders = [];
        }
      }
      return data as Agent;
    },
  });
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
  const { data: agentPackages } = useQuery<Package[]>({
    queryKey: ['agentPackages', agentDetails?.id],
    enabled: !!agentDetails?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('agent_id', agentDetails?.id);
      if (error) throw error;
      return data as Package[];
    },
  });

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

  return (
    <>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(agentSchema) }}
        />
      </Head>
      <div className="relative z-20 mt-4">
        <Breadcrumb
          items={[{ label: 'Home', href: '/' }, { label: agentDetails?.known_as ?? '' }]}
        />
      </div>
      <div className="nc-ListingStayDetailPage w-full min-h-screen">
        <main className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-6 w-full mt-4 mb-24 lg:mb-32 lg:items-stretch">
          <div className="lg:col-span-5 mt-6">
            <section className="relative overflow-hidden rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-xl">
              <div className="relative h-44 md:h-56 lg:h-64 w-full">
                <Image
                  src={bannerImage}
                  alt={agentDetails?.known_as || 'Agent banner'}
                  fill
                  className="object-cover"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
                <Link
                  href="/account"
                  className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/90 text-neutral-700 shadow-md hover:bg-white flex items-center justify-center"
                >
                  <i className="las la-pen text-xl"></i>
                </Link>
              </div>

              <div className="relative px-5 pb-6 md:px-8 md:pb-8">
                <div className="absolute -top-14 left-1/2 -translate-x-1/2">
                  {agentDetails?.profile_image ? (
                    <div className="relative h-28 w-28 md:h-32 md:w-32 overflow-hidden rounded-full ring-4 ring-white dark:ring-neutral-900 shadow-lg">
                      <Image
                        src={agentDetails.profile_image}
                        alt={agentDetails.known_as || 'Agent'}
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    </div>
                  ) : (
                    <div className="h-28 w-28 md:h-32 md:w-32 rounded-full ring-4 ring-white dark:ring-neutral-900 shadow-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 flex items-center justify-center text-3xl font-semibold">
                      {agentDetails?.known_as?.[0] || '?'}
                    </div>
                  )}
                </div>

                <div className="pt-16 md:pt-20 text-center">
                  <h1 className="text-2xl md:text-3xl font-semibold text-neutral-900 dark:text-white">
                    {agentDetails?.known_as}
                  </h1>
                  <div className="mt-3 inline-flex flex-wrap justify-center gap-3">
                    <Badge
                      name={
                        <div className="flex items-center">
                          <i className="text-sm las la-map-marker"></i>
                          <span className="ml-1">{agentLocation || 'Location pending'}</span>
                        </div>
                      }
                    />
                    <Badge
                      name={
                        <div className="flex items-center">
                          <i className="text-sm las la-briefcase"></i>
                          <span className="ml-1">{listingCount} Listings</span>
                        </div>
                      }
                    />
                    {agentDetails?.is_gov_authorised === 'true' && (
                      <Badge
                        name={
                          <div className="flex items-center">
                            <i className="text-sm las la-certificate"></i>
                            <span className="ml-1">Government Verified</span>
                          </div>
                        }
                        color="green"
                      />
                    )}
                  </div>
                </div>

                {socialLinks.length > 0 && (
                  <div className="absolute right-5 md:right-8 top-3 md:top-4 z-20">
                    <SocialsList
                      socials={socialLinks}
                      className="gap-3"
                      itemClass="h-10 w-10 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm flex items-center justify-center hover:scale-105 transition-transform text-lg"
                    />
                  </div>
                )}

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 bg-white/80 dark:bg-neutral-900/70 backdrop-blur">
                    <p className="text-xs text-gray-600">Agent Name</p>
                    <p className="text-sm text-gray-900 dark:text-neutral-100 font-medium mt-1">
                      {agentDetails?.known_as || 'Not available'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 bg-white/80 dark:bg-neutral-900/70 backdrop-blur">
                    <p className="text-xs text-gray-600">Business Location</p>
                    <p className="text-sm text-gray-900 dark:text-neutral-100 font-medium mt-1">
                      {agentLocation || 'Location pending'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 bg-white/80 dark:bg-neutral-900/70 backdrop-blur">
                    <p className="text-xs text-gray-600">Listings Published</p>
                    <p className="text-sm text-gray-900 dark:text-neutral-100 font-medium mt-1">
                      {listingCount} Packages
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 bg-white/80 dark:bg-neutral-900/70 backdrop-blur">
                    <p className="text-xs text-gray-600">Primary Contact</p>
                    <p className="text-sm text-gray-900 dark:text-neutral-100 font-medium mt-1">
                      {agentDetails?.contact_number || 'Not available'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 bg-white/80 dark:bg-neutral-900/70 backdrop-blur">
                    <p className="text-xs text-gray-600">Email Address</p>
                    <p className="text-sm text-gray-900 dark:text-neutral-100 font-medium mt-1 break-all">
                      {agentDetails?.email_id || 'Not available'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 bg-white/80 dark:bg-neutral-900/70 backdrop-blur">
                    <p className="text-xs text-gray-600">Agency Overview</p>
                    <p className="text-sm text-gray-900 dark:text-neutral-100 font-medium mt-1 line-clamp-2">
                      {agentDetails?.about_us || 'Profile details pending.'}
                    </p>
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
