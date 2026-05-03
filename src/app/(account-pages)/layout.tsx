import React, { FC } from 'react';
import { Nav } from './(components)/Nav';

export interface CommonLayoutProps {
  children?: React.ReactNode;
}

const CommonLayout: FC<CommonLayoutProps> = ({ children }) => {
  return (
    <div className="nc-CommonLayoutAccount bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_38%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_35%),linear-gradient(to_bottom,#ffffff,#f8fafc_38%,#ffffff)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_35%),linear-gradient(to_bottom,#0f172a,#111827_45%,#0f172a)]">
      <div className="sticky top-20 z-30 border-b border-neutral-200/70 dark:border-neutral-700/70 bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md">
        <Nav />
      </div>
      <div className="container pt-6 sm:pt-6 pb-26 lg:pb-6">{children}</div>
    </div>
  );
};

export default CommonLayout;
