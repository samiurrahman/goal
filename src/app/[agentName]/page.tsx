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
import ContactSidebar from './(components)/ContactSidebar';
import Badge from '@/shared/Badge';
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
          {/* TOP ROW: SIDEBAR (LEFT) + ABOUT BLOCK (RIGHT) WITH EQUAL HEIGHTS */}
          {/* LEFT: Sidebar */}
          <div className="lg:col-span-2 mt-8 lg:mt-0 flex flex-col z-20 lg:self-stretch">
            <ContactSidebar agent={agentDetails} listingCount={listingCount} />
          </div>

          {/* RIGHT: ABOUT BLOCK */}
          <div className="bg-white lg:col-span-3 dark:bg-neutral-900 z-10 relative flex flex-col lg:self-stretch rounded-lg shadow-md overflow-hidden p-6">
            {/* <div className="listingSection__wrap !space-y-4 h-full flex flex-col"> */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-normal text-gray-900">{agentDetails?.known_as}</h1>
                <div className="mt-3 inline-flex flex-wrap gap-3">
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
              <Link
                href="/account"
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                <i className="las la-pen text-2xl"></i>
              </Link>
            </div>

            {/* <div className="w-full border-b border-neutral-100 dark:border-neutral-700" /> */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="flex items-start gap-4">
                <i className="text-3xl las la-address-card flex-shrink-0 mt-0.5"></i>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Agent Name</p>
                  <span className="text-sm text-gray-900 font-medium">
                    {agentDetails?.known_as}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <i className="text-3xl las la-map-marker-alt flex-shrink-0 mt-0.5"></i>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Business Location</p>
                  <span className="text-sm text-gray-900 font-medium">
                    {agentLocation || 'Location pending'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <i className="text-3xl las la-file-invoice flex-shrink-0 mt-0.5"></i>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Listings Published</p>
                  <span className="text-sm text-gray-900 font-medium">{listingCount} Packages</span>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <i className="text-3xl las la-phone-volume flex-shrink-0 mt-0.5"></i>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Primary Contact</p>
                  <span className="text-sm text-gray-900 font-medium">
                    {agentDetails?.contact_number || 'Not available'}
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <i className="las la-envelope text-2xl flex-shrink-0 mt-0.5"></i>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Email Address</p>
                  <p className="text-sm text-gray-900 font-medium break-all">
                    {agentDetails?.email_id || 'Not available'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <i className="las la-bell text-2xl flex-shrink-0 mt-0.5"></i>
                <div className="flex-1">
                  <p className="text-xs text-gray-600">Agency Overview</p>
                  <p className="text-sm text-gray-900 font-medium line-clamp-2">
                    {agentDetails?.about_us || 'Profile details pending.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* </div> */}

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
