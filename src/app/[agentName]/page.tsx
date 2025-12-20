'use client';

import { Tab } from '@headlessui/react';
import CarCard from '@/components/CarCard';
import CommentListing from '@/components/CommentListing';
import ExperiencesCard from '@/components/ExperiencesCard';
import StartRating from '@/components/StartRating';
import StayCard from '@/components/StayCard2';
import { DEMO_CAR_LISTINGS, DEMO_EXPERIENCES_LISTINGS, DEMO_STAY_LISTINGS } from '@/data/listings';
import React, { FC, Fragment, useState } from 'react';
import Avatar from '@/shared/Avatar';
import ButtonSecondary from '@/shared/ButtonSecondary';
import SocialsList from '@/shared/SocialsList';
import Breadcrumb from '@/components/Breadcrumb';
import { PageAboutProps } from '../about/page';
import rightImg from '@/images/about-hero-right.png';
import SectionFounder from './(components)/SectionFounder';
import SectionStatistic from './(components)/SectionStatistic';
import SectionHero from './(components)/SectionHero';
import BgGlassmorphism from '@/components/BgGlassmorphism';

export interface AgentDetailsProps {
  params: { agentName: string };
}
const AgentDetails: FC<AgentDetailsProps> = ({ params }) => {
  const { agentName } = params;
  console.log(agentName);
  let [categories] = useState(['Umrah', 'Hajj']);

   const renderSection1 = () => {
    return (
      <div className="listingSection__wrap">
        <div>
          <h2 className="text-2xl font-semibold">{`Iqra Group's listings`}</h2>
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
                  {DEMO_STAY_LISTINGS.filter((_, i) => i < 4).map((stay) => (
                    <StayCard key={stay.id} data={stay} />
                  ))}
                </div>
                <div className="flex mt-11 justify-center items-center">
                  <ButtonSecondary>Show me more</ButtonSecondary>
                </div>
              </Tab.Panel>
              <Tab.Panel className="">
                <div className="mt-8 grid grid-cols-1 gap-6 md:gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {DEMO_EXPERIENCES_LISTINGS.filter((_, i) => i < 4).map((stay) => (
                    <ExperiencesCard key={stay.id} data={stay} />
                  ))}
                </div>
                <div className="flex mt-11 justify-center items-center">
                  <ButtonSecondary>Show me more</ButtonSecondary>
                </div>
              </Tab.Panel>
              <Tab.Panel className="">
                <div className="mt-8 grid grid-cols-1 gap-6 md:gap-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {DEMO_CAR_LISTINGS.filter((_, i) => i < 4).map((stay) => (
                    <CarCard key={stay.id} data={stay} />
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

      <div className="py-16 lg:py-28 space-y-16 lg:space-y-28">
        <SectionHero
          rightImg={rightImg}
          heading="👋 Iqra Hajj Tours."
          btnText=""
          subHeading="At IQRA HAJJ & UMRAH TOURS. We take massive pride in being recognized as one of the best companies in India for providing reliable professional and high-quality Hajj and Umrah services. Our expertise doesn’t just stop at Hajj and Umrah. We also study offering Iraq Ziarat tour packages Islamic tours international holiday packages and Umrah combined with a holiday experience. Also. we provide visa services to make your journey seamless and stress-free."
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

