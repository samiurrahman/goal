import BgGlassmorphism from '@/components/BgGlassmorphism';
import React, { ReactNode } from 'react';

const DetailtLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="ListingDetailPage relative">
      <div className="fixed inset-x-0 top-0 z-0 pointer-events-none">
        <BgGlassmorphism />
      </div>
      <div className="container relative z-10 ListingDetailPage__content">{children}</div>
    </div>
  );
};

export default DetailtLayout;
