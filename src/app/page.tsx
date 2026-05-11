import React from 'react';
import Image from 'next/image';
import PackageSearchForm from '@/app/(client-components)/(PackageSearchForm)/PackageSearchForm';
import BgGlassmorphism from '@/components/BgGlassmorphism';
import HeroSearchTrigger from '@/components/HeroSearchTrigger';
import LocationDetectBanner from '@/components/LocationDetectBanner';
import SectionTopCitiesMobile from '@/components/SectionTopCitiesMobile';
import Logo from '@/shared/Logo';
import ourFeaturesImg from '@/images/our-features_01.png';

function PageHome() {
  return (
    <main className="nc-PageHome relative overflow-hidden">
      {/* Desktop */}
      <div className="hidden lg:block">
        <BgGlassmorphism />
        <div className="container relative">
          <div className="pt-6">
            <LocationDetectBanner />
          </div>
          <PackageSearchForm className="lg:pb-16" />
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden pb-24">
        <section className="relative px-4">
          <div className="px-4 pb-5">
            <div className="flex justify-center">
              <Logo className="w-14" />
            </div>
            <div className="mt-3">
              <LocationDetectBanner />
            </div>
            <HeroSearchTrigger />
          </div>
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-sky-100 via-sky-50 to-white dark:from-neutral-800 dark:via-neutral-800 dark:to-neutral-900">
            <div className="px-5 pt-6 pb-5">
              <h1 className="text-2xl font-extralight text-neutral-900 dark:text-neutral-100 leading-tight">
                Find your perfect Umrah journey
              </h1>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                Compare packages from verified travel agents
              </p>
            </div>
            <div className="flex justify-center">
              <Image
                src={ourFeaturesImg}
                alt="Umrah journey illustration"
                priority
                className="w-64 h-auto"
              />
            </div>
          </div>
        </section>

        <SectionTopCitiesMobile />
      </div>
    </main>
  );
}

export default PageHome;
