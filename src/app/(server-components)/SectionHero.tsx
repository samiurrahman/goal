import React, { FC } from 'react';
import imagePng from '@/images/banner_01.jpg';
import heroMobileImg from '@/images/our-features.png';
import HeroSearchForm from '../(client-components)/(HeroSearchForm)/HeroSearchForm';
import ButtonPrimary from '@/shared/ButtonPrimary';
import Image from 'next/image';
import LogoSvg from '@/shared/LogoSvg';
import LogoSvgLight from '@/shared/LogoSvgLight';

export interface SectionHeroProps {
  className?: string;
}

const SectionHero: FC<SectionHeroProps> = ({ className = '' }) => {
  return (
    <div className={`nc-SectionHero flex flex-col-reverse lg:flex-col relative ${className}`}>
      <div className="hidden lg:block z-10 mb-12 lg:mb-0 w-full">
        <HeroSearchForm />
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex flex-col lg:flex-row lg:items-center">
        <div className="flex-shrink-0 lg:w-1/2 flex flex-col items-start space-y-8 sm:space-y-10 pb-14 lg:pb-64 xl:pr-14 lg:mr-10 xl:mr-0">
          <h2 className="font-medium text-4xl md:text-4xl xl:text-6xl !leading-[114%] ">
            Hajj & Umrah, <br />
            made simple
          </h2>
          <span className="text-base md:text-lg text-neutral-500 dark:text-neutral-400">
            Compare packages from verified agents. Find the best deals for your sacred journey with
            transparent pricing and real reviews.
          </span>
          <ButtonPrimary href="/packages" sizeClass="px-6 py-3 lg:px-8 lg:py-4 rounded-xl">
            Compare Packages
          </ButtonPrimary>
        </div>
        <div className="flex-grow">
          <Image className="w-full" src={imagePng} alt="hero" priority />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col min-h-[calc(100vh-9rem)]">
        <div className="space-y-5 pb-4">
          <div className="w-24 text-primary-6000">
            <LogoSvg />
            <LogoSvgLight />
          </div>
          <h2 className="font-light text-3xl sm:text-4xl !leading-[115%]">
            Umrah,
            <br />
            made simple
          </h2>
          <span className="block text-base text-neutral-500 dark:text-neutral-400">
            Compare packages from verified agents. Find the best deals for your sacred journey with
            transparent pricing and real reviews.
          </span>
          <ButtonPrimary href="/packages" sizeClass="px-6 py-3 rounded-xl">
            Compare Packages
          </ButtonPrimary>
        </div>
        <div className="mt-auto rounded-2xl overflow-hidden">
          <Image className="w-full h-auto object-cover" src={heroMobileImg} alt="hero" priority />
        </div>
      </div>
    </div>
  );
};

export default SectionHero;
