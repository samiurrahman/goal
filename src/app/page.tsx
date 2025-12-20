import React from 'react';
import SectionHero from '@/app/(server-components)/SectionHero';
import BgGlassmorphism from '@/components/BgGlassmorphism';
function PageHome() {
  return (
    <main className="nc-PageHome relative overflow-hidden">
      <BgGlassmorphism />
      <div className="container relative">
        <SectionHero className="lg:pb-16" />
      </div>
    </main>
  );
}

export default PageHome;
