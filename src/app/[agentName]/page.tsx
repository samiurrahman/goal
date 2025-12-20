'use client';

import { Tab } from '@headlessui/react';
import CarCard from '@/components/CarCard';
import CommentListing from '@/components/CommentListing';
import ExperiencesCard from '@/components/ExperiencesCard';
import StartRating from '@/components/StartRating';
import StayCard from '@/components/StayCard2';
import { DEMO_CAR_LISTINGS, DEMO_EXPERIENCES_LISTINGS, DEMO_STAY_LISTINGS } from '@/data/listings';
import React, { FC, Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Avatar from '@/shared/Avatar';
import ButtonSecondary from '@/shared/ButtonSecondary';
import SocialsList from '@/shared/SocialsList';
import Breadcrumb from '@/components/Breadcrumb';
import rightImg from '@/images/about-hero-right.png';
import SectionFounder from './(components)/SectionFounder';
import SectionStatistic from './(components)/SectionStatistic';
import SectionHero from './(components)/SectionHero';
import BgGlassmorphism from '@/components/BgGlassmorphism';
import { supabase } from '@/utils/supabaseClient';
import type { Agent, Package } from '@/data/types';
import ButtonPrimary from '@/shared/ButtonPrimary';
import PackageCard from '@/components/package';

export interface AgentDetailsProps {
  params: { agentName: string };
}
const AgentDetails: FC<AgentDetailsProps> = ({ params }) => {
  const { agentName } = params;
  let [categories] = useState(['Umrah', 'Hajj']);

  const {
    data: agentDetails,
    error,
    isLoading,
  } = useQuery<Agent | null>({
    queryKey: ['agentDetails', agentName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('slug', agentName)
        .single();
      if (error) throw error;
      return data as Agent;
    },
  });

  // Fetch all packages for this agent
  const {
    data: agentPackages,
    error: packagesError,
    isLoading: packagesLoading,
  } = useQuery<Package[]>({
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

  const renderSection1 = () => {
    return (
      <div className="listingSection__wrap">
        <div>
      <h2 className="text-2xl font-semibold">{`${agentDetails?.known_as} listings`}</h2>
          <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
            {`Iqra Group's listings is very rich, 5 star reviews help them to be
            more branded.`}
          </span>
        </div>
        <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

        <div>
          <Tab.Group>
            <Tab.List className="flex space-x-1 overflow-x-auto">
              {categories.map((item) => (
                <Tab key={item} as={Fragment}>
                  {({ selected }) => (
                    <button
                      className={`flex-shrink-0 block !leading-none font-medium px-5 py-2.5 text-sm sm:text-base sm:px-6 sm:py-3 capitalize rounded-full focus:outline-none ${
                        selected
                          ? 'bg-secondary-900 text-secondary-50 '
                          : 'text-neutral-500 dark:text-neutral-400 dark:hover:text-neutral-100 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      } `}
                    >
                      {item}
                    </button>
                  )}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels>
              <Tab.Panel className="">
                <div className="mt-8 grid grid-cols-1 gap-6 md:gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {packagesError && (
                    <div className="flex justify-center items-center py-12 text-red-500">
                      Error: {packagesError.message}
                    </div>
                  )}
                  {packagesLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <ButtonPrimary loading>Loading Packages</ButtonPrimary>
                    </div>
                  ) : (
                    <>
                      {agentPackages?.map((item, index) => (
                        <PackageCard key={item.id || index} data={item} />
                      ))}
                    </>
                  )}
                </div>
                <div className="flex mt-11 justify-center items-center">
                  <ButtonSecondary>Show me more</ButtonSecondary>
                </div>
              </Tab.Panel>
              <Tab.Panel className="">
                <div className="mt-8 grid grid-cols-1 gap-6 md:gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {DEMO_STAY_LISTINGS.filter((_, i) => i < 4).map((stay) => (
                    <StayCard key={stay.id} data={stay} />
                  ))}
                </div>
                <div className="flex mt-11 justify-center items-center">
                  <ButtonSecondary>Show me more</ButtonSecondary>
                </div>
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    );
  };

  const renderSection2 = () => {
    return (
      <div className="listingSection__wrap">
        {/* HEADING */}
        <h2 className="text-2xl font-semibold">Reviews (23 reviews)</h2>
        <div className="w-14 border-b border-neutral-200 dark:border-neutral-700"></div>

        {/* comment */}
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          <CommentListing hasListingTitle className="pb-8" />
          <CommentListing hasListingTitle className="py-8" />
          <CommentListing hasListingTitle className="py-8" />
          <CommentListing hasListingTitle className="py-8" />
          <div className="pt-8">
            <ButtonSecondary>View more 20 reviews</ButtonSecondary>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`nc-AgentDetails overflow-hidden relative`}>
      {/* ======== BG GLASS ======== */}
      <BgGlassmorphism />
      {/* BREADCRUMB */}
      <div className="relative z-20 mt-6">
        <Breadcrumb
          items={[{ label: 'Home', href: '/' }, { label: agentDetails?.known_as ?? '' }]}
        />
      </div>
      <div className="py-6 lg:py-10 space-y-16 lg:space-y-28">
        <SectionHero
          rightImg={rightImg}
          heading={` 👋 ${agentDetails?.known_as}`}
          btnText=""
          subHeading={agentDetails?.about_us || ''}
        />

        <SectionFounder />

        <SectionStatistic />

        {renderSection1()}
        {/* {renderSection2()} */}
      </div>
    </div>
  );
};

export default AgentDetails;
