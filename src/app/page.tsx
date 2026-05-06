import React from 'react';
import PackageSearchForm from '@/app/(client-components)/(PackageSearchForm)/PackageSearchForm';
import BgGlassmorphism from '@/components/BgGlassmorphism';
function PageHome() {
  return (
    <main className="nc-PageHome relative overflow-hidden">
      <BgGlassmorphism />
      <div className="container relative">
        <PackageSearchForm className="lg:pb-16" />
      </div>
    </main>
  );
}

export default PageHome;
