import React, { FC } from 'react';
import { Nav } from './(components)/Nav';

export interface CommonLayoutProps {
  children?: React.ReactNode;
}

const CommonLayout: FC<CommonLayoutProps> = ({ children }) => {
  return (
    <div className="nc-CommonLayoutAccount min-h-screen bg-[#f8fafc] dark:bg-[#111827]">
      <div className="sticky z-30 border-b border-neutral-200/70 dark:border-neutral-700/70 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md">
        <Nav />
      </div>
      <div className="container pt-6 sm:pt-6 pb-28 lg:pb-8">{children}</div>
    </div>
  );
};

export default CommonLayout;
