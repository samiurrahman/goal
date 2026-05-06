import React, { FC } from 'react';
import imagePng from '@/images/banner_01.jpg';
import Image from 'next/image';
import SearchForm from './SearchForm';

interface PackageSearchFormProps {
  className?: string;
}

const PackageSearchForm: FC<PackageSearchFormProps> = ({ className = '' }) => {
  return (
    <div className={`nc-PackageSearchForm flex flex-col-reverse lg:flex-col relative ${className}`}>
      {/* Desktop: search form above hero */}
      <div className="hidden lg:block z-10 mb-12 lg:mb-0 w-full">
        <div className="w-full lg:px-0 max-w-6xl mx-auto">
          <SearchForm />
        </div>
      </div>

      {/* Desktop: hero content */}
      <div className="hidden lg:flex flex-col lg:flex-row lg:items-center">
        <div className="flex-shrink-0 lg:w-1/2 flex flex-col items-start space-y-8 sm:space-y-10 pb-14 lg:pb-64 xl:pr-14 lg:mr-10 xl:mr-0">
          <h2 className="font-medium text-4xl md:text-4xl xl:text-6xl !leading-[114%] ">
            Better <span className="inline-block"></span>
          </h2>
        </div>
        <div className="flex-grow">
          <Image className="w-full" src={imagePng} alt="hero" priority />
        </div>
      </div>

    </div>
  );
};

export default PackageSearchForm;
