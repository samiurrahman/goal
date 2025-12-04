"use client";
import React, { FC } from "react";
import imagePng from "@/images/banner_01.jpg";
import HeroSearchForm from "../(client-components)/(HeroSearchForm)/HeroSearchForm";
import Image from "next/image";
import ButtonPrimary from "@/shared/ButtonPrimary";
import SectionHowItWork from "@/components/SectionHowItWork";
// import TypingAnimation from "@/components/TypingAnimation";

export interface SectionHeroProps {
  className?: string;
}

const SectionHero: FC<SectionHeroProps> = ({ className = "" }) => {
  return (
    <div
      className={`nc-SectionHero flex flex-col-reverse lg:flex-col relative ${className}`}
    >
      <div className="hidden lg:block z-10 mb-12 lg:mb-0 w-full">
        <HeroSearchForm />
      </div>
      <div className="flex flex-col lg:flex-row lg:items-center">
        <div className="flex-shrink-0 lg:w-1/2 flex flex-col items-start space-y-8 sm:space-y-10 pb-14 lg:pb-64 xl:pr-14 lg:mr-10 xl:mr-0">
          <h2 className="font-medium text-4xl md:text-4xl xl:text-6xl !leading-[114%] ">
            Better{" "}
            <span className="inline-block">
              {/* <TypingAnimation
                words={["Search.", "Compare.", "Perform."]}
                speed={100}
                pause={1200}
              /> */}
            </span>
          </h2>
        </div>
        <div className="flex-grow">
          <Image className="w-full" src={imagePng} alt="hero" priority />
        </div>
      </div>
    </div>
  );
};

export default SectionHero;
