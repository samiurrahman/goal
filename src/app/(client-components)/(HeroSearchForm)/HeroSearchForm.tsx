"use client";

import React, { FC } from "react";
import StaySearchForm from "./(stay-search-form)/StaySearchForm";

const HeroSearchForm: FC<any> = ({
  className = "",
  currentTab = "Umrah",
  currentPage,
}) => {
  return (
    <div
      className={`nc-HeroSearchForm w-full max-w-6xl py-5 lg:py-0 ${className}`}
    >
      <StaySearchForm />
    </div>
  );
};

export default HeroSearchForm;
