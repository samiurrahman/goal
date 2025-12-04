import React, { FC } from "react";
import SectionGridFilterCard from "../SectionGridFilterCard";
import SectionGridHasMap from "../SectionGridHasMap";

export interface ListingCarPageProps {}

const ListingCarPage: FC<ListingCarPageProps> = () => {
  return (
    <div className="container ">
      <SectionGridHasMap />
    </div>
  );
};

export default ListingCarPage;
