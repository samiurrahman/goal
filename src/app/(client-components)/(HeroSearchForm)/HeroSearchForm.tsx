import React, { FC } from 'react';
import StaySearchForm from './(stay-search-form)/StaySearchForm';

const HeroSearchForm: FC<any> = ({ className = '' }) => {
  return (
    <div
      className={`nc-HeroSearchForm w-full px-4 sm:px-6 lg:px-0 max-w-6xl py-3 lg:py-0 mx-auto ${className}`}
    >
      <StaySearchForm />
    </div>
  );
};

export default HeroSearchForm;
