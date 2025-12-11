import SectionHeroArchivePage from "@/app/(server-components)/SectionHeroArchivePage";
import BgGlassmorphism from "@/components/BgGlassmorphism";
import SectionSliderNewCategories from "@/components/SectionSliderNewCategories";
import SectionSubscribe2 from "@/components/SectionSubscribe2";
import React, { FC } from "react";
import SectionGridFilterCard from "../SectionGridFilterCard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Hajj & Umrah Packages",
  description:
    "Explore and compare hundreds of Hajj and Umrah packages from verified travel agents. Find the best deals on hotels near Haram in Makkah and Madinah.",
  keywords: [
    "Hajj packages",
    "Umrah packages",
    "Makkah hotels",
    "Madinah hotels",
    "compare packages",
    "best Hajj deals",
  ],
  openGraph: {
    title: "Browse Hajj & Umrah Packages",
    description:
      "Explore and compare hundreds of Hajj and Umrah packages from verified travel agents.",
    type: "website",
  },
  alternates: {
    canonical: "/packages",
  },
};

export interface ListingFlightsPageProps {}

const ListingFlightsPage: FC<ListingFlightsPageProps> = ({}) => {
  return (
    <div className={`nc-ListingFlightsPage relative overflow-hidden `}>
      <BgGlassmorphism />

      <div className="container relative">
        <SectionGridFilterCard className="pb-24 lg:pb-28" />
      </div>
    </div>
  );
};

export default ListingFlightsPage;
