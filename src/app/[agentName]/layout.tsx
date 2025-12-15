import React, { ReactNode } from "react";

const DetailtLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="ListingDetailPage">
      <div className="container ListingDetailPage__content">{children}</div>
      <p>sami</p>
    </div>
  );
};

export default DetailtLayout;
