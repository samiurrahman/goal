import BgGlassmorphism from '@/components/BgGlassmorphism';
import React, { ReactNode } from 'react';

const DetailtLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="ListingDetailPage">
      <div className="sticky top-0 z-0">
        <BgGlassmorphism />
      </div>
      <div className="container ListingDetailPage__content">{children}</div>
    </div>
  );
};

export default DetailtLayout;
